"""Integration checks run against throwaway repos, never the live remote."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / 'scripts/maintenance'
import sys
sys.path.insert(0, str(SCRIPTS))
import prepare_forms_history_cleanup as prepare_module
import publish_forms_history_cleanup as publish_module


class HistoryCleanupTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.repo = self.root / 'source'
        self.repo.mkdir()
        self.run_git('init', '-b', 'main')
        self.run_git('config', 'user.email', 'qa@example.invalid')
        self.run_git('config', 'user.name', 'Synthetic QA')
        self.write('app.txt', 'unchanged application')
        self.write('src/generated/therapeutic-forms-index.json', '[{"id":"retired-qa"}]')
        self.write('public/forms/en/children/qa/old.pdf', '%PDF-1.4\nsynthetic old bytes\n')
        self.commit('synthetic retired content')
        self.run_git('tag', '-a', 'qa-old', '-m', 'synthetic annotated tag')
        self.run_git('branch', 'qa-old-branch')
        self.run_git('update-ref', 'refs/pull/1/head', self.run_git('rev-parse', 'HEAD').strip())
        self.run_git('rm', 'public/forms/en/children/qa/old.pdf')
        self.write('public/forms/README.md', 'replacement architecture')
        self.write('src/generated/therapeutic-forms-index.json', '[]\n')
        self.commit('empty published architecture')
        self.head = self.run_git('rev-parse', 'HEAD').strip()
        self.mirror = self.root / 'mirror.git'
        subprocess.run(['git', 'clone', '--mirror', str(self.repo), str(self.mirror)], check=True, capture_output=True)

    def tearDown(self):
        self.temp.cleanup()

    def run_git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.repo), *args], stderr=subprocess.DEVNULL, text=True)

    def write(self, name, value):
        target = self.repo / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(value)

    def commit(self, message):
        self.run_git('add', '.')
        self.run_git('commit', '-m', message)

    def prepare(self):
        executable = os.environ['FORMS_FILTER_REPO']
        return prepare_module.prepare(self.mirror, self.head, self.root / 'out', executable)

    def test_all_refs_cleaned_without_changing_published_tree_or_commit_count(self):
        report = self.prepare()
        self.assertTrue(report['published_tree_unchanged'])
        self.assertEqual(report['before_commit_count'], report['after_commit_count'])
        self.assertEqual(report['unique_pdf_blobs'], 1)
        self.assertEqual(report['retired_blobs_reachable'], 0)
        self.assertEqual(report['retired_paths_reachable'], 0)
        self.assertEqual(report['read_only_pull_refs'], 1)
        self.assertEqual(set(report['before_refs']), set(report['after_refs']))
        self.assertNotEqual(report['before_refs']['refs/tags/qa-old'], report['after_refs']['refs/tags/qa-old'])
        self.assertFalse(report['remote_modified'])
        self.assertEqual(self.run_git('rev-parse', 'HEAD').strip(), self.head)

    def test_stale_main_is_rejected_before_rewrite(self):
        with self.assertRaisesRegex(ValueError, 'Main moved'):
            prepare_module.prepare(self.mirror, 'f' * 40, self.root / 'out', os.environ['FORMS_FILTER_REPO'])
        self.assertEqual(prepare_module.refs(self.mirror)['refs/heads/main'], self.head)

    def test_active_replacement_content_is_rejected(self):
        self.write('public/forms/en/children/qa/new.pdf', '%PDF-1.4\nnew approved bytes\n')
        self.commit('new replacement content')
        subprocess.run(['git', '-C', str(self.mirror), 'fetch', str(self.repo), '+refs/heads/main:refs/heads/main'], check=True, capture_output=True)
        head = self.run_git('rev-parse', 'HEAD').strip()
        with self.assertRaisesRegex(ValueError, 'still installed'):
            prepare_module.prepare(self.mirror, head, self.root / 'out', os.environ['FORMS_FILTER_REPO'])

    def test_publication_aborts_if_any_remote_ref_moved(self):
        report = self.prepare()
        with patch.object(publish_module, 'remote_refs', return_value={}), \
                patch.object(publish_module.subprocess, 'run', wraps=subprocess.run) as run:
            with self.assertRaisesRegex(ValueError, 'Remote branches/tags changed'):
                publish_module.publish(self.mirror, self.root / 'out/report.json')
            self.assertFalse(any('push' in call.args[0] for call in run.call_args_list))

    def test_rejected_atomic_push_never_falls_back_to_partial_updates(self):
        report = self.prepare()
        before = {r: s for r, s in report['before_refs'].items() if r.startswith(('refs/heads/', 'refs/tags/'))}
        original_run = subprocess.run
        pushes = []

        def reject_push(command, **kwargs):
            if 'push' in command:
                pushes.append(command)
                return subprocess.CompletedProcess(command, 1, '', 'synthetic protected-branch rejection')
            return original_run(command, **kwargs)

        with patch.object(publish_module, 'remote_refs', return_value=before), \
                patch.object(publish_module.subprocess, 'run', side_effect=reject_push):
            with self.assertRaisesRegex(RuntimeError, 'Atomic publication rejected'):
                publish_module.publish(self.mirror, self.root / 'out/report.json')
        self.assertEqual(len(pushes), 1)
        self.assertIn('--atomic', pushes[0])
        self.assertTrue(any(arg.startswith('--force-with-lease=refs/heads/main:') for arg in pushes[0]))
        self.assertFalse(any(arg.startswith('refs/pull/') or ':refs/pull/' in arg for arg in pushes[0]))
        self.assertNotIn('--mirror', pushes[0])

    def test_real_atomic_publication_changes_only_writable_refs(self):
        report = self.prepare()
        destination = self.root / 'destination.git'
        subprocess.run(['git', 'clone', '--mirror', str(self.repo), str(destination)], check=True, capture_output=True)
        # A local bare destination exercises the actual git push transaction.
        # Patching the repository allowlist is restricted to this isolated test.
        report['repository'] = str(destination)
        (self.root / 'out/report.json').write_text(json.dumps(report))
        with patch.object(publish_module, 'REPOSITORY', str(destination)), \
                patch.dict(os.environ, {'GH_TOKEN': '', 'GITHUB_TOKEN': ''}):
            result = publish_module.publish(self.mirror, self.root / 'out/report.json', str(destination))
        self.assertEqual(result['status'], 'writable_refs_published')
        actual = prepare_module.refs(destination)
        self.assertEqual(actual['refs/heads/main'], report['sanitized_main'])
        self.assertEqual(actual['refs/tags/qa-old'], report['after_refs']['refs/tags/qa-old'])
        self.assertEqual(actual['refs/pull/1/head'], report['before_refs']['refs/pull/1/head'])


if __name__ == '__main__':
    unittest.main()
