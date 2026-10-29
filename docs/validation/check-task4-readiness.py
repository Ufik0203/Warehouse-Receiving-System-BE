"""Check Task 4 design artifacts only; no application, database or Git operations."""
from pathlib import Path
import hashlib
import json
import yaml
from jsonschema import Draft4Validator

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / 'docs'
class UniqueKeysLoader(yaml.SafeLoader):
    def construct_mapping(self, node, deep=False):
        keys = [self.construct_object(key, deep=deep) for key, _ in node.value]
        assert len(keys) == len(set(keys)), f'Duplicate YAML key near line {node.start_mark.line + 1}'
        return super().construct_mapping(node, deep=deep)


api = yaml.load((DOCS / 'openapi.yaml').read_text(encoding='utf-8'), Loader=UniqueKeysLoader)
markdown = (DOCS / 'api-contract.md').read_text(encoding='utf-8')
cases = [
    ('/api/v1/users/{id}', 'get', 'USER_NOT_FOUND'),
    ('/api/v1/users/{id}', 'patch', 'USER_NOT_FOUND'),
    ('/api/v1/users/{id}', 'delete', 'USER_NOT_FOUND'),
    ('/api/v1/products/{id}', 'get', 'PRODUCT_NOT_FOUND'),
    ('/api/v1/receivings', 'post', 'PRODUCT_NOT_FOUND'),
    ('/api/v1/receivings/{id}', 'get', 'RECEIVING_NOT_FOUND'),
]
for path, method, code in cases:
    operation = api['paths'][path][method]
    assert '404' in operation['responses'], (method, path)
    assert code in operation['description'] and code in markdown, code
schemas = api['components']['schemas']
name = schemas['CreateProductInput']['properties']['name']
assert name['minLength'] == 1 and name['maxLength'] == 120
assert 'Unicode code points' in name['description']
assert schemas['CreateUserInput']['properties']['name'] == name
assert schemas['UpdateUserInput']['properties']['name'] == name
reference = schemas['CreateReceivingInput']['properties']['reference']
assert reference['maxLength'] == 160 and reference['default'] == ''
query = next(p for p in api['paths']['/api/v1/products']['get']['parameters'] if p.get('name') == 'q')
assert query['schema']['maxLength'] == 100
assert 'Unicode code points' in query['schema']['description']
# Validate normalized values against documented schemas, not application validators.
validator = Draft4Validator(schemas['CreateProductInput'])
assert validator.is_valid({'sku': 'A', 'name': '\U0001f600' * 120})
assert not validator.is_valid({'sku': 'A', 'name': '\U0001f600' * 121})
assert 'REPEATABLE READ' in api['paths']['/api/v1/receivings/{id}']['get']['description']
examples = 0
for methods in api['paths'].values():
    for operation in methods.values():
        if not isinstance(operation, dict):
            continue
        for response in operation.get('responses', {}).values():
            value = response.get('content', {}).get('application/json', {}).get('example', {}).get('data')
            if not isinstance(value, dict) or 'status' not in value or 'items' not in value:
                continue
            examples += 1
            for item in value['items']:
                assert item['remainingQuantity'] == item['expectedQuantity'] - item['receivedQuantity']
                if value['status'] == 'OPEN':
                    assert item['receivedQuantity'] == 0
assert examples > 0
manifest = json.loads((DOCS / 'contract-version.json').read_text(encoding='utf-8'))
for filename, digest in manifest['files'].items():
    assert hashlib.sha256((DOCS / filename).read_bytes()).hexdigest() == digest
source_hash = '901d39dc9ed68be7aa86fbcecf177c16fd57d0e767ace0360f2c74f825cfef8b'
assert hashlib.sha256((DOCS / 'source/PROJECT_SPEC.md').read_bytes()).hexdigest() == source_hash
report = {
    'date': '2026-10-29', 'scope': 'Task 4 design documents only', 'status': 'PASS',
    'resource404Mappings': len(cases), 'consistentDetailExamples': examples,
    'normalizedUnicodeSchemaBoundaries': 'PASS', 'contractHashes': manifest['files'],
    'sourceHash': source_hash,
    'task3TestsEvidenceHash': hashlib.sha256((DOCS / 'evidence/task3-tests.json').read_bytes()).hexdigest(),
    'applicationTestsByThisCommand': 'NOT_RUN', 'frontendComparison': 'NOT_RUN',
}
(DOCS / 'evidence/task4-readiness-check.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(f'PASS: {len(cases)} 404 mappings, Unicode schema boundaries, {examples} coherent detail examples, snapshot description, contract/source hashes. Runtime tests NOT_RUN by this static command; see testing.md.')
