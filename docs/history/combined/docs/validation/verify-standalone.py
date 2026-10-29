"""Verify each publishable directory outside the source tree, without Git or databases.

Requires Python 3.12+, Node 24 and network access for pinned npm 11.6.2.
Temporary copies are retained for inspection; no existing directories are deleted.
"""
from pathlib import Path
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

ROOT = Path(__file__).resolve().parents[2]
target = Path(tempfile.mkdtemp(prefix='wrs-standalone-'))
evidence = ROOT / 'docs/evidence/standalone'
evidence.mkdir(parents=True, exist_ok=True)
report = {'directory': str(target), 'repositories': {}}
environment = os.environ.copy()
for key in list(environment):
    if key.startswith(('SEED_', 'SESSION_', 'POSTGRES_', 'REDIS_')) or key in {
        'DATABASE_URL', 'BACKEND_ENV_FILE', 'NODE_PATH', 'RUN_FOUNDATION_INTEGRATION'
    }:
        del environment[key]

def ignore(directory, names):
    ignored = set(names) & {'.git', 'node_modules', 'dist', '.cache', 'coverage', 'playwright-report', 'test-results', '__pycache__'}
    for name in names:
        if name.startswith('.env') and name != '.env.example' and not name.endswith('.example'):
            ignored.add(name)
        if name.endswith(('.log', '.tsbuildinfo')) or name.startswith('.tmp'):
            ignored.add(name)
    if Path(directory).as_posix().endswith('/src/generated'):
        ignored.add('prisma')
    return ignored

def run(name, command, directory):
    print(f'{name}: {command}', flush=True)
    result = subprocess.run(command, cwd=directory, env=environment, shell=True,
                            capture_output=True, text=True, encoding='utf-8', errors='replace')
    (evidence / f'{name}.log').write_text(result.stdout + result.stderr, encoding='utf-8')
    if command.endswith('ls --all --json') and result.returncode == 0:
        tree = json.loads(result.stdout)
        assert not tree.get('problems'), f'{name}: dependency tree problems'
        print('Dependency tree problems: []', flush=True)
    else:
        print(result.stdout[-4500:] + result.stderr[-2500:], flush=True)
    if result.returncode:
        raise RuntimeError(f'{name} exited {result.returncode}; see evidence log')
    return {'command': command, 'exitCode': result.returncode}

prefix = 'npx --yes --offline=false --package=npm@11.6.2 npm '
for name in ['backend', 'frontend']:
    directory = target / name
    shutil.copytree(ROOT / name, directory, ignore=ignore)
    assert not (directory / 'node_modules').exists()
    assert not (directory / '.git').exists()
    assert not (directory / 'env/.env').exists()
    assert not (directory / 'src/generated/prisma').exists()
    assert not (target / 'package.json').exists(), 'No parent workspace manifest is allowed'
    commands = []
    if not (directory / 'package-lock.json').exists():
        commands.append(run(f'{name}-lock', prefix + 'install --package-lock-only --ignore-scripts --offline=false', directory))
        shutil.copy2(directory / 'package-lock.json', ROOT / name / 'package-lock.json')
    for label, command in [
        ('ci', prefix + 'ci --offline=false'),
        ('lint', prefix + 'run lint'),
        ('typecheck', prefix + 'run typecheck'),
        ('build', prefix + 'run build'),
    ]:
        commands.append(run(f'{name}-{label}', command, directory))
    commands.append(run(f'{name}-tree', prefix + 'ls --all --json', directory))
    # Direct dependencies must physically exist inside this repository, not resolve
    # from ancestor node_modules or a sibling checkout.
    package = json.loads((directory / 'package.json').read_text(encoding='utf-8'))
    for group in ['dependencies', 'devDependencies']:
        for dependency, version in package.get(group, {}).items():
            local = directory / 'node_modules' / dependency / 'package.json'
            assert local.is_file(), f'{name}: nonlocal dependency {dependency}'
            assert json.loads(local.read_text(encoding='utf-8'))['version'] == version
    assert not list(directory.rglob('.env.verification'))
    assert (directory / ('env/.env.example' if name == 'backend' else '.env.example')).is_file()
    report['repositories'][name] = {'commands': commands, 'localDependencies': True,
        'lockSha256': hashlib.sha256((directory / 'package-lock.json').read_bytes()).hexdigest()}
    (evidence / 'results.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(f'PASS: {name} independently installed/linted/typechecked/built with no parent workspace, local env, generated client or sibling dependency.', flush=True)
print('PASS: no Git commands, database commands, volume operations or source deletion were performed.', flush=True)
