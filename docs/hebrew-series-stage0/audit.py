"""Read-only Stage 0 consistency/capacity audit; --write updates only its report.

Run from any directory with Python 3. Last updated: 2026-11-04.
This verifies engineering data, not clinical completeness or permissions.
"""
import argparse
import copy
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def read(path):
    return json.loads(path.read_text())


def encoded(value, canonical=False):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'), sort_keys=canonical).encode()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def audit():
    catalog = read(ROOT / 'server/private/hebrew-pilot-p4-02-catalog.json')
    base = read(ROOT / 'server/private/hebrew-pilot-catalog.json')
    manifest_doc = read(HERE / 'proposed-manifest.json')
    manifest = manifest_doc['forms']
    units = read(HERE / 'unit-matrix.json')['units']
    components = read(HERE / 'component-coverage.json')['components']
    mapping = read(HERE / 'existing-expansion-map.json')['forms']
    source_doc = read(HERE / 'sources-and-models.json')
    decisions = read(HERE / 'decisions.json')['decisions']
    batches = read(HERE / 'batches.json')['batches']
    reuse = read(HERE / 'reuse-map.json')['candidates']
    catalog_by_id = {f['id']: f for f in catalog['forms']}
    manifest_by_id = {f['id']: f for f in manifest}
    unit_by_id = {u['id']: u for u in units}
    source_ids = {s['id'] for s in source_doc['sources']}
    model_ids = {m['id'] for m in source_doc['models']}
    role_ids = {r['id'] for r in source_doc['roles']}
    existing = [f for f in manifest if f['batch'] == 0]
    planned = [f for f in manifest if f['batch'] != 0]
    expansion = [f for f in catalog['forms'] if f['id'] not in {b['id'] for b in base['forms']}]
    require(len(catalog_by_id) == 289 and catalog['version'] == '0.6-p4-02', 'Baseline changed; review Stage 0 rather than overwriting it.')
    digest = hashlib.sha256(encoded(catalog, canonical=True)).hexdigest()
    require(digest == '459f0727b598e2e8a5ef7eb31b9b6d5d636f63d223586e4b9029890e0c7652a6', 'Baseline catalog pin changed')
    require(not manifest_doc['manifestFrozen'] and not manifest_doc['runtimeCatalog'], 'Planning inventory must not masquerade as an approved runtime catalog')
    require(len(manifest_by_id) == len(manifest) == 970, 'Duplicate or missing planned IDs')
    require(len(existing) == 289 and len(planned) == 681, 'Incorrect inventory split')
    require({f['id'] for f in existing} == set(catalog_by_id), 'Existing IDs changed')
    actual_bytes = 0
    for f in existing:
        baseline = catalog_by_id[f['id']]
        require(f['sha256'] == baseline['sha256'] and f['bytes'] == baseline['bytes'], 'Existing manifest metadata changed: ' + f['id'])
        pdf = (ROOT / 'server/private/forms' / (f['id'] + '.pdf')).read_bytes()
        require(pdf.startswith(b'%PDF-') and len(pdf) == f['bytes'] and hashlib.sha256(pdf).hexdigest() == f['sha256'], 'PDF integrity mismatch: ' + f['id'])
        actual_bytes += len(pdf)
    require({p.stem for p in (ROOT / 'server/private/forms').iterdir()} == set(catalog_by_id), 'Orphan or missing baseline assets')
    for f in planned:
        require(f['sha256'] is None and f['bytes'] is None and f['catalogPath'] is None, 'Uncreated asset must not have invented binary metadata')
        require(not (ROOT / 'server/private/forms' / (f['id'] + '.pdf')).exists(), 'Stage 0 unexpectedly produced a new PDF')
    for f in manifest:
        require(re.fullmatch(r'MP-[A-Z0-9-]{1,80}-HE', f['id']) is not None, 'ID incompatible with proxy: ' + f['id'])
    require(len(mapping) == 135 and {f['id'] for f in mapping} == {f['id'] for f in expansion}, 'Incomplete expansion mapping')
    for f in mapping:
        require(hashlib.sha256((ROOT / f['sourceHtml']).read_bytes()).hexdigest() == f['sourceHtmlSha256'], 'Authored HTML changed: ' + f['id'])
        review_path = (ROOT / f['sourceHtml']).parents[1] / 'review.json'
        review = next(x for x in read(review_path)['forms'] if x['id'] == f['id'])
        for key in ['clinicalReviewer', 'clinicalReviewDate', 'rightsReviewer', 'rightsReviewDate', 'ageAdaptationApproved', 'releaseApproved']:
            require(f[key] == review[key], 'Review status was not copied faithfully: ' + f['id'])
        require(not f['ageAdaptationApproved'] and not f['releaseApproved'], 'Baseline approvals differ; revise report')
    require(len(unit_by_id) == len(units) == 96, 'Duplicate or missing units')
    require(sum(len(u['ageVariants']) for u in units) == 360, 'Incorrect age/unit count')
    deliverable_ids = set()
    for u in units:
        ids = {i for v in u['ageVariants'] for i in v['deliverableIds']}
        require(len(ids) == u['deliverableCount'], 'Unit deliverable count mismatch')
        require(u['guideId'] in ids, 'Missing guide')
        require(all(manifest_by_id[i]['unit'] == u['id'] for i in ids), 'Cross-unit deliverable')
        require(all(manifest_by_id[i]['batch'] == u['batch'] for i in ids), 'Batch mismatch')
        deliverable_ids.update(ids)
        for v in u['ageVariants']:
            require(v['modelId'] in model_ids and v['clinicalOwnerRole'] in role_ids, 'Missing model/owner')
            require(set(v['sourceIds']) <= source_ids, 'Unknown source reference')
            require(len(v['deliverableIds']) == 3, 'Guide/W/P not mapped')
    require(deliverable_ids == {f['id'] for f in expansion} | {f['id'] for f in planned}, 'Unit inventory not exhaustive')
    for c in components:
        require(c['modelId'] in model_ids and c['ownerRole'] in role_ids, 'Component model/owner missing')
        require(set(c['sourceIds']) <= source_ids and set(c['unitIds']) <= set(unit_by_id), 'Component references missing')
        require(set(c['deliverableIds']) <= deliverable_ids and c['manualSection'] is None and c['reviewer'] is None, 'Unverified manual mapping')
    for r in reuse:
        require(set(r['existingIds']) <= {b['id'] for b in base['forms']}, 'Reuse references unknown base form')
    cumulative = 289
    for b in batches:
        forms = [f for f in planned if f['batch'] == b['id']]
        require(len(forms) == b['newPdfCount'], 'Batch arithmetic mismatch')
        cumulative += len(forms)
        require(cumulative == b['cumulativePdfCount'], 'Cumulative count mismatch')
    require(cumulative == 970, 'Wrong final inventory')
    require(all(d['status'] == 'open' and d['assignedPerson'] is None for d in decisions), 'Do not fabricate decision closure')

    # Synthetic capacity estimate only. Metadata values below never leave memory
    # as a catalog and cannot be accepted by the pinned runtime validator.
    projected = copy.deepcopy(catalog)
    projected['version'] = 'capacity-estimate-only'
    for f in planned:
        u = unit_by_id[f['unit']]
        kind = f['kind']
        candidates = [e for e in expansion if e['age'] == f['age'] and e['id'].split('-')[-3] == kind]
        if not candidates:  # proposed CH-specific young-child guide
            candidates = [e for e in expansion if e['age'] == 'ALL']
        sample = copy.deepcopy(candidates[-1])
        sample.update(id=f['id'], unit=f['unit'], age=f['age'], track='ocd' if u['domain']=='OCDYC' else u['domain'].lower(),
                      title={'G':'הנחיות למטפל: ', 'W':'דף עבודה: ', 'P':'דף המשך: '}[kind]+u['title'], unitTitle=u['title'],
                      sha256='0'*64, bytes=round(sum(e['bytes'] for e in candidates)/len(candidates)))
        if u['domain'] == 'OCDYC':
            sample.update(ageLabel='ילדים בגילי 6–7', audience='מטפל, ילד בגילי 6–7 ומלווה מתאים')
        projected['forms'].append(sample)
    projected_bytes = len(encoded(projected))
    stressed = copy.deepcopy(projected)
    for f in stressed['forms'][289:]:
        f['title'] += 'א' * 40
        f['unitTitle'] += 'א' * 40
    stressed_bytes = len(encoded(stressed))
    guide_mean = sum(f['bytes'] for f in expansion if '-G-' in f['id']) / 15
    sheet_mean = sum(f['bytes'] for f in expansion if '-G-' not in f['id']) / 120
    expected_new = round(81 * guide_mean + 600 * sheet_mean)
    early_forms = [f for f in planned if f['unit'].startswith('OCDYC-')]
    require(len(early_forms) == 24 and all(f['age'] == 'CH' for f in early_forms), 'Young-child forms must not use ALL')
    require(all('6–7' in u['title'] for u in units if u['domain']=='OCDYC'), 'Young-child unit cards must name the sub-age')
    visibility = {age: sum(f['age'] in [age,'ALL'] for f in early_forms) for age in ['CH','TE','AD','OA']}
    require(visibility == {'CH':24,'TE':0,'AD':0,'OA':0}, 'Young-child cross-age visibility')
    batches_capacity = []
    for b in batches:
        ids = {f['id'] for f in manifest if f['batch'] <= b['id']}
        subset = {**projected, 'forms': [f for f in projected['forms'] if f['id'] in ids]}
        batches_capacity.append({'batch':b['id'],'count':len(subset['forms']),'estimatedCompactUtf8Bytes':len(encoded(subset))})
    return {
        'lastUpdated':'2026-11-04','baselineCommit':manifest_doc['baselineCommit'],
        'method':'Local file integrity audit and static contract analysis; no live requests, load benchmark or clinical validation',
        'baseline':{'version':catalog['version'],'pdfCount':289,'pdfBytes':actual_bytes,'maxPdfBytes':max(f['bytes'] for f in catalog['forms']),
                    'catalogCompactUtf8Bytes':len(encoded(catalog)),'catalogCanonicalSha256':digest,'mappedExpansionPdfCount':135,'allPdfHashesVerified':True,'allMappedHtmlHashesVerified':True},
        'planning':{'unitPackages':96,'ageUnitRows':360,'componentMappingRows':len(components),'newPdfCount':681,'newGuides':81,'newSheets':600,'finalPdfCount':970,'manifestFrozen':False},
        'capacity':{'proxyCatalogLimitBytes':512*1024,'proxyPdfLimitBytes':1024*1024,
                    'projectedCatalogBytes':projected_bytes,'headroomBytes':512*1024-projected_bytes,
                    'projectionMethod':'Existing record schema, proposed unit titles, G/W/P title prefixes and current metadata; synthetic hashes have fixed length. Not actual future content.',
                    'stressCase':'Add 40 Hebrew characters to both title and unitTitle on every new record; +160 bytes per new record',
                    'stressCatalogBytes':stressed_bytes,'stressExceedsCurrentLimit':stressed_bytes>512*1024,
                    'batchEstimates':batches_capacity,
                    'estimatedNewPdfBytes':expected_new,'estimatedTotalPdfBytes':actual_bytes+expected_new,
                    'pdfProjectionMethod':'81 guides and 600 sheets at existing expansion means; excludes extra companion PDFs, source HTML, code and backups',
                    'serverStorageBehavior':'loadPilot reads all PDFs into an in-memory Map at startup; raw byte estimate is not total process RAM',
                    'productionMemoryOrLatencyMeasured':False},
        'youngChildContract':{'candidateUnitPrefix':'OCDYC','candidateGuideId':'MP-OCDYC-01-G-CH-HE','idsMatchCurrentFileRegex':True,
                              'track':'ocd','age':'CH','subAge':'6–7','matchingVisibilityCounts':visibility,
                              'validationType':'static predicate and identifier checks, not browser E2E','existingOcdCH':'Existing 8–11 materials remain distinct; no silent age relabeling'},
        'releaseConstraints':['new version/path/count/SHA must be pinned in shared releases.js','server loader/catalog registration and browser release fallback need a coordinated reviewed release',
                              'retain 512KiB catalog and 1MiB file bounds unless a separately reviewed bounded architecture is required',
                              'no live deployment, publish, auth change or treatment PDFs in Stage 0']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true', help='Write the deterministic technical-audit.json report')
    args = parser.parse_args()
    result = audit()
    report = HERE / 'technical-audit.json'
    if args.write:
        report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    else:
        require(read(report) == result, 'Stored technical audit is stale; investigate before regenerating')
    print(json.dumps(result, ensure_ascii=False, indent=2))
