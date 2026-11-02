#!/usr/bin/env python3
"""Prepare a disposable bare mirror; never change a remote or a working tree."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

REPOSITORY = 'https://github.com/yossi-dabby/mindful-path.git'
FORM_ROOTS = ('public/forms/', 'public/children_cbt_core_en/',
              'adolescents_cbt_core_he_series_1/', 'cbt-core/')
README = 'public/forms/README.md'
CATALOG = 'src/data/therapeuticForms/catalog-under-revision.json'
METADATA = {'src/generated/therapeutic-forms-index.json',
            'src/utils/workbookContentMetadata.js', 'src/utils/resolveFormIntent.js', README}


def git(repo, *args, data=None):
    return subprocess.run(['git', '-C', str(repo), *args], input=data,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                          check=True).stdout


def refs(repo):
    return dict(line.split(' ', 1)[::-1] for line in
                git(repo, 'for-each-ref', '--format=%(objectname) %(refname)').decode().splitlines())


def tree_blobs(repo, commit):
    return {row.split(b'\t', 1)[1].decode(): row.split(b'\t', 1)[0].split()[2].decode()
            for row in git(repo, 'ls-tree', '-r', '-z', commit).split(b'\0') if row}


def historical_paths(repo):
    result = set()
    for value in git(repo, 'log', '--all', '--format=', '--name-only', '--no-renames', '-z').split(b'\0'):
        path = value.lstrip(b'\n').decode()
        if not path:
            continue
        if any(ord(char) < 32 for char in path):
            raise ValueError('Control character in a historical path; inspect manually')
        result.add(path)
    return result


def old_blobs(repo, paths):
    if not paths:
        return set()
    raw = git(repo, 'log', '--all', '--format=', '--raw', '--no-abbrev', '--no-renames', '--', *sorted(paths))
    result = set()
    for line in raw.splitlines():
        if line.startswith(b':'):
            fields = line.split(b'\t', 1)[0].split()
            result.update(value.decode() for value in fields[2:4] if value != b'0' * 40)
    return result


def blob_sizes(repo, ids):
    if not ids:
        return {}
    lines = git(repo, 'cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)',
                data=('\n'.join(sorted(ids)) + '\n').encode()).decode().splitlines()
    result = {}
    for line in lines:
        oid, kind, size = line.split()
        if kind != 'blob':
            raise ValueError('Expected a blob, found ' + kind)
        result[oid] = int(size)
    return result


def prepare(repo, expected_main, output, filter_repo):
    repo, output = Path(repo).resolve(), Path(output).resolve()
    if git(repo, 'rev-parse', '--is-bare-repository').strip() != b'true':
        raise ValueError('Use a disposable bare mirror, not a working repository')
    if not re.fullmatch(r'[0-9a-f]{40}', expected_main):
        raise ValueError('Expected main must be a full commit SHA')
    before = refs(repo)
    if before.get('refs/heads/main') != expected_main:
        raise ValueError('Main moved or the mirror is stale; no cleanup performed')
    if any(ref.startswith(('refs/replace/', 'refs/original/')) for ref in before):
        raise ValueError('Use a fresh mirror without backup/replace refs')
    source_tree = git(repo, 'rev-parse', expected_main + '^{tree}').decode().strip()
    tip = tree_blobs(repo, expected_main)
    paths = historical_paths(repo)
    unknown_pdfs = sorted(p for p in paths if p.lower().endswith('.pdf') and not p.startswith(FORM_ROOTS))
    if unknown_pdfs:
        raise ValueError('Unattributed PDF paths require review: ' + repr(unknown_pdfs))
    retired = {p for p in paths if (p.startswith(FORM_ROOTS) and p != README) or p == CATALOG}
    if retired.intersection(tip):
        raise ValueError('Retired content is still installed at main; clean active content first')
    index_path = 'src/generated/therapeutic-forms-index.json'
    if json.loads(git(repo, 'show', expected_main + ':' + index_path)) != []:
        raise ValueError('New forms are installed; this retirement plan must be reviewed again')
    metadata = {p for p in paths if p in METADATA or
                re.fullmatch(r'src/data/therapeuticForms/forms\.[^/]+\.js', p)}
    # Preserve every blob at the published tip, including empty compatibility exports.
    purge = old_blobs(repo, retired | metadata) - set(tip.values())
    sizes = blob_sizes(repo, purge)
    pdf_blobs = old_blobs(repo, {p for p in retired if p.lower().endswith('.pdf')})
    if pdf_blobs.intersection(tip.values()):
        raise ValueError('A retired PDF is reused at the published tip')
    pdf_sizes = blob_sizes(repo, pdf_blobs)
    output.mkdir(parents=True, exist_ok=False)
    path_file, blob_file = output / 'retired-paths.txt', output / 'retired-blob-ids.txt'
    path_file.write_text(''.join('literal:' + p + '\n' for p in sorted(retired)))
    blob_file.write_text(''.join(oid + '\n' for oid in sorted(purge)))
    report = {'repository': REPOSITORY, 'status': 'preparing', 'expected_main': expected_main,
              'published_tree': source_tree, 'before_refs': before,
              'retired_path_count': len(retired), 'historical_pdf_path_count': sum(p.lower().endswith('.pdf') for p in retired),
              'retired_blob_count': len(purge), 'unique_retired_blob_bytes': sum(sizes.values()),
              'unique_pdf_blobs': len(pdf_blobs), 'unique_pdf_blob_bytes': sum(pdf_sizes.values()),
              'before_commit_count': int(git(repo, 'rev-list', '--all', '--count')),
              'read_only_pull_refs': sum(r.startswith('refs/pull/') for r in before),
              'remote_modified': False}
    (output / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
    subprocess.run([sys.executable, str(filter_repo), '--force', '--invert-paths',
                    '--paths-from-file', str(path_file), '--strip-blobs-with-ids', str(blob_file),
                    '--replace-refs', 'delete-no-add', '--prune-empty', 'never', '--prune-degenerate', 'never'],
                   cwd=repo, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    after = refs(repo)
    # filter-repo removes origin; never retain a mirror-push configuration.
    if set(after) != set(before):
        raise ValueError('Unexpected ref creation/deletion; do not publish this mirror')
    new_main = after['refs/heads/main']
    if git(repo, 'rev-parse', new_main + '^{tree}').decode().strip() != source_tree:
        raise ValueError('Published source tree changed; do not publish this mirror')
    reachable = {line.split(b' ', 1)[0].decode() for line in git(repo, 'rev-list', '--objects', '--all').splitlines()}
    if reachable.intersection(purge):
        raise ValueError('Retired blob remains reachable; do not publish this mirror')
    if historical_paths(repo).intersection(retired):
        raise ValueError('Retired paths remain in history; do not publish this mirror')
    git(repo, 'fsck', '--full', '--no-dangling')
    report.update(status='verified_local_only', after_refs=after, sanitized_main=new_main,
                  after_commit_count=int(git(repo, 'rev-list', '--all', '--count')),
                  published_tree_unchanged=True, retired_blobs_reachable=0, retired_paths_reachable=0,
                  changed_writable_refs=sum(before[r] != after[r] for r in before if r.startswith(('refs/heads/', 'refs/tags/'))))
    if report['after_commit_count'] != report['before_commit_count']:
        raise ValueError('Commit count changed; do not publish this mirror')
    bundle = output / 'sanitized-history.bundle'
    git(repo, 'bundle', 'create', str(bundle), '--branches', '--tags')
    git(repo, 'bundle', 'verify', str(bundle))
    with bundle.open('rb') as stream:
        bundle_sha256 = hashlib.file_digest(stream, 'sha256').hexdigest()
    report.update(bundle_bytes=bundle.stat().st_size, bundle_sha256=bundle_sha256)
    (output / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mirror', required=True)
    parser.add_argument('--expected-main', required=True)
    parser.add_argument('--output-dir', required=True)
    parser.add_argument('--filter-repo', required=True)
    args = parser.parse_args()
    report = prepare(args.mirror, args.expected_main, args.output_dir, args.filter_repo)
    print(json.dumps({k: v for k, v in report.items() if not k.endswith('_refs')}, indent=2))


if __name__ == '__main__':
    main()
