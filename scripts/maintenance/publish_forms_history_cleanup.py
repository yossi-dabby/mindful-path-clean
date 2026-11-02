#!/usr/bin/env python3
"""Publish a verified plan with one atomic leased push; never alter protections."""
import argparse
import base64
import json
import os
from pathlib import Path
import subprocess

from prepare_forms_history_cleanup import REPOSITORY, git, refs


def remote_refs(remote, env):
    result = subprocess.run(['git', 'ls-remote', '--refs', remote], env=env,
                            capture_output=True, check=True, text=True)
    return {ref: sha for sha, ref in (line.split('\t') for line in result.stdout.splitlines())
            if ref.startswith(('refs/heads/', 'refs/tags/'))}


def publish(mirror, report_path, remote=REPOSITORY):
    mirror = Path(mirror).resolve()
    report = json.loads(Path(report_path).read_text())
    if report.get('status') != 'verified_local_only' or report.get('remote_modified') is not False:
        raise ValueError('A verified, unpublished plan is required')
    if remote != REPOSITORY or report.get('repository') != REPOSITORY:
        raise ValueError('Only the reviewed Mindful Path repository is allowed')
    before = {r: sha for r, sha in report['before_refs'].items() if r.startswith(('refs/heads/', 'refs/tags/'))}
    after = {r: sha for r, sha in report['after_refs'].items() if r.startswith(('refs/heads/', 'refs/tags/'))}
    local = {r: sha for r, sha in refs(mirror).items() if r.startswith(('refs/heads/', 'refs/tags/'))}
    if not before or before.keys() != after.keys() or local != after:
        raise ValueError('Local refs differ from the verified plan')
    tree = git(mirror, 'rev-parse', after['refs/heads/main'] + '^{tree}').decode().strip()
    if tree != report['published_tree'] or not report.get('published_tree_unchanged'):
        raise ValueError('Published tree differs from the verified plan')
    git(mirror, 'fsck', '--full', '--no-dangling')
    env = os.environ.copy()
    env['GIT_TERMINAL_PROMPT'] = '0'
    # Optional standard CI credentials stay in the child environment, never in
    # command arguments, report files, git config, exceptions or printed output.
    token = env.get('GH_TOKEN') or env.get('GITHUB_TOKEN')
    if token:
        if env.get('GIT_CONFIG_COUNT'):
            raise ValueError('Unexpected inherited Git config injection')
        env.update(GIT_CONFIG_COUNT='1', GIT_CONFIG_KEY_0='http.https://github.com/.extraheader',
                   GIT_CONFIG_VALUE_0='AUTHORIZATION: basic ' +
                   base64.b64encode(('x-access-token:' + token).encode()).decode())
    if remote_refs(remote, env) != before:
        raise ValueError('Remote branches/tags changed; prepare a new plan instead of overwriting work')
    changed = sorted(r for r in before if before[r] != after[r])
    if not changed:
        raise ValueError('The plan has no changed refs')
    command = ['git', '-C', str(mirror), 'push', '--atomic', '--porcelain']
    command += ['--force-with-lease=' + ref + ':' + before[ref] for ref in changed]
    command += [remote] + [after[ref] + ':' + ref for ref in changed]
    # No mirror push, no deletion, no PR refs, no disabling protection and no
    # partial per-ref fallback if the server rejects the atomic transaction.
    result = subprocess.run(command, env=env, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError('Atomic publication rejected; no per-ref retry was attempted.\n' + result.stderr)
    if remote_refs(remote, env) != after:
        raise RuntimeError('Push returned success but remote verification differed; investigate before further writes')
    return {'status': 'writable_refs_published', 'changed_refs': len(changed),
            'main': after['refs/heads/main'], 'github_pr_refs_and_provider_storage': 'not_purged'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mirror', required=True)
    parser.add_argument('--report', required=True)
    parser.add_argument('--apply', action='store_true', help='Required for the authorized remote history replacement')
    args = parser.parse_args()
    if not args.apply:
        parser.error('--apply is required; preparing a bundle does not publish it')
    print(json.dumps(publish(args.mirror, args.report), indent=2))
