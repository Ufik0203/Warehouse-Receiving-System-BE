"""Standalone documentation checks; Python stdlib only, no application/Git/network commands."""
from pathlib import Path
import argparse
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / 'docs'
SOURCE_HASH = '901d39dc9ed68be7aa86fbcecf177c16fd57d0e767ace0360f2c74f825cfef8b'
IDS = r'\b(?:FR-[A-Z]+-\d+|NFR-\d+|BR-[A-Z]\d+|US-\d+)\b'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--contract-source', type=Path, help='Optional explicit backend artifact directory containing api-contract.md and openapi.yaml')
args = parser.parse_args()
report_path = DOCS / 'evidence/documentation-check.json'
report_path.parent.mkdir(parents=True, exist_ok=True)
report = {'date': '2026-10-29', 'scope': 'Static documentation only; application/runtime tests NOT_RUN; Task 3 NOT_STARTED', 'status': 'RUNNING'}
report_path.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

try:
    assert digest(DOCS / 'source/PROJECT_SPEC.md') == SOURCE_HASH
    source_ids = set(re.findall(IDS, (DOCS / 'source/PROJECT_SPEC.md').read_text(encoding='utf-8-sig')))
    assert len(source_ids) == 87
    assert set(re.findall(IDS, (DOCS / 'prd.md').read_text(encoding='utf-8'))) == source_ids
    assert set(re.findall(IDS, (DOCS / 'requirement-mapping.md').read_text(encoding='utf-8'))) == source_ids
    contract = json.loads((DOCS / 'contract-version.json').read_text(encoding='utf-8'))
    assert contract['authority'] == 'backend'
    for name, expected in contract['files'].items():
        assert digest(DOCS / name) == expected, f'Contract manifest mismatch: {name}'
        if args.contract_source:
            assert (DOCS / name).read_bytes() == (args.contract_source / name).read_bytes(), f'Backend artifact differs: {name}'
    manifest = json.loads((DOCS / 'history/manifest.json').read_text(encoding='utf-8'))
    for entry in manifest['files']:
        assert digest(DOCS / 'history/combined' / entry['archive']) == entry['sha256'], entry['source']
    files = [ROOT / 'README.md', ROOT / 'AGENTS.md', *DOCS.glob('*.md')]
    links = 0
    for path in files:
        text = path.read_text(encoding='utf-8')
        assert sum(line.startswith('```') for line in text.splitlines()) % 2 == 0, f'Unbalanced fences: {path.name}'
        # Active commands must not require the old combined repository.
        for block in re.findall(r'```[^\n]*\n(.*?)```', text, flags=re.S):
            assert not re.search(r'--workspaces|\s-w\s+(?:backend|frontend)\b|(?:backend|frontend)/(?:env|src|prisma)', block), path.name
        for raw in re.findall(r'\[[^\]]*\]\(([^)]+)\)', text):
            href = raw.strip('<>').split('#', 1)[0]
            if not href or re.match(r'^[a-zA-Z]+:', href):
                continue
            target = (path.parent / href).resolve()
            assert target.is_relative_to(ROOT), f'Link escapes repository: {path.name}: {href}'
            assert target.exists(), f'Missing local target: {path.name}: {href}'
            links += 1
    markdown = (DOCS / 'api-contract.md').read_text(encoding='utf-8')
    expected = set()
    for method, path in re.findall(r'\b(GET|POST|PATCH|DELETE) (/(?:auth|users|products|receivings|inventory|health)[A-Za-z0-9_/:{}-]*)', markdown):
        path = path.replace(':id', '{id}')
        expected.add((method.lower(), path if path.startswith('/health') else '/api/v1' + path))
    actual = set()
    current = None
    for line in (DOCS / 'openapi.yaml').read_text(encoding='utf-8').splitlines():
        path = re.match(r'^  (/[^ ]+):$', line)
        if path:
            current = path[1]
        method = re.match(r'^    (get|post|patch|delete):$', line)
        if method:
            actual.add((method[1], current))
    assert expected == actual and len(actual) == 20
    report.update(status='PASS', requirementIds=87, activeMarkdownFiles=len(files), localLinks=links,
                  archivedFilesVerified=len(manifest['files']), contractHashes=contract['files'],
                  backendArtifactCompared=bool(args.contract_source), apiOperations=20,
                  remoteFreshness='NOT_RUN', applicationTests='NOT_RUN', openapiSchemaValidatorThisTask='NOT_RUN')
except Exception as error:
    report.update(status='FAIL', error=str(error))
    raise
finally:
    report_path.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(f'PASS: 87 requirements, {len(files)} active Markdown files, {links} repository-local links, {len(manifest["files"])} archive hashes, contract hashes and 20 API operations.')
print('Application/schema-validator/runtime tests: NOT_RUN. No Git/GitHub/network commands; Task 3 NOT_STARTED.')
