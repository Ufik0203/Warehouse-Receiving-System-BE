"""Documentation checks only. Run with isolated OpenAPI validator dependencies on PYTHONPATH."""
from pathlib import Path
import hashlib
import re
import yaml
from openapi_spec_validator import validate_spec
from openapi_schema_validator import OAS30Validator

ROOT = Path(__file__).resolve().parents[2]
source = ROOT / 'PROJECT_SPEC.md'
assert hashlib.sha256(source.read_bytes()).hexdigest() == '901d39dc9ed68be7aa86fbcecf177c16fd57d0e767ace0360f2c74f825cfef8b', 'Source changed'
pattern = r'\b(?:FR-[A-Z]+-\d+|NFR-\d+|BR-[A-Z]\d+|US-\d+)\b'
ids = set(re.findall(pattern, source.read_text(encoding='utf-8-sig')))
prd_ids = set(re.findall(pattern, (ROOT/'docs/prd.md').read_text(encoding='utf-8')))
mapping = (ROOT/'docs/requirement-mapping.md').read_text(encoding='utf-8')
mapped = re.findall(r'^\| ('+pattern+r') \|', mapping, re.M)
assert len(ids) == len(mapped) == len(set(mapped)) == 87
assert ids == prd_ids == set(mapped)
assert len(re.findall(r'^\| (?:FR-|BR-|US-|NFR-).*\| NOT_RUN \|$',mapping,re.M)) == 87
print('PASS: source SHA256 unchanged; source/PRD/mapping agree on 87 unique IDs, all implementation checks NOT_RUN')

spec = yaml.safe_load((ROOT/'docs/openapi.yaml').read_text(encoding='utf-8'))
validate_spec(spec)
def resolve(value):
    if '$ref' not in value: return value
    target = spec
    for part in value['$ref'][2:].split('/'): target = target[part]
    return resolve(target)
def deref(value):
    if isinstance(value,dict): return {k:deref(v) for k,v in resolve(value).items()}
    if isinstance(value,list): return [deref(v) for v in value]
    return value
markdown = (ROOT/'docs/api-contract.md').read_text(encoding='utf-8')
expected=set()
for method,path in re.findall(r'\b(GET|POST|PATCH|DELETE) (/(?:auth|users|products|receivings|inventory|health)[A-Za-z0-9_/:{}-]*)',markdown):
    path=path.replace(':id','{id}')
    expected.add((method.lower(),path if path.startswith('/health') else '/api/v1'+path))
actual={(method,path) for path,item in spec['paths'].items() for method in item}
assert actual==expected,(actual-expected,expected-actual)
assert len(actual)==20
assert spec['servers']==[{'url':'/'}]
checks=examples=0
for path,item in spec['paths'].items():
    for method,operation in item.items():
        params=[resolve(p) for p in operation.get('parameters',[])]
        if method in ['post','patch','delete']:
            assert any(p['name']=='X-CSRF-Token' and p['required'] for p in params)
            assert any(p['name']=='Origin' for p in params)
        if path.startswith('/health'):assert operation['security']==[]
        elif path!='/api/v1/auth/csrf-token':assert operation['security']==[{'LocalSession':[]},{'SecureSession':[]}]
        if path.startswith('/api/v1/users') or (path=='/api/v1/products' and method=='post'):
            assert operation['x-roles']==['SUPERVISOR']
        for status,r in operation['responses'].items():
            r=resolve(r)
            if status=='204':assert 'content' not in r
            for media in r.get('content',{}).values():
                OAS30Validator(deref(media['schema'])).validate(media['example']);examples+=1
        for media in operation.get('requestBody',{}).get('content',{}).values():
            schema=deref(media['schema'])
            OAS30Validator(schema).validate(media['example']);examples+=1
            assert schema['additionalProperties'] is False
        checks+=1
schemas=spec['components']['schemas']
# Exact DTO fields, including nullability, inherited fields and nested receipt items.
for name in ['UserDto','ProductDto','ReceivingDto','ReceivingItemDto','InventoryDto','InventoryTransactionDto']:
    body=re.search(r'interface '+name+r' \{(.*?)\n\}',markdown,re.S)[1]
    assert set(re.findall(r'^  (\w+):',body,re.M))==set(schemas[name]['properties'])
assert schemas['UserDto']['properties']['deletedAt']['nullable'] is True
assert set(schemas['ReceivingDetailDto']['properties'])==set(schemas['ReceivingDto']['properties'])|{'items'}
assert set(schemas['ReceiptDto']['properties'])=={'id','receivingId','receivedBy','receivedAt','items'}
assert set(schemas['ReceiptDto']['properties']['items']['items']['properties'])=={'receivingItemId','productId','quantity'}
assert schemas['CreateUserInput']['properties']['password']['minLength']==12
assert schemas['LoginInput']['properties']['password']['minLength']==1
assert schemas['UpdateUserInput']['minProperties']==1
assert schemas['InventoryDto']['properties']['availableQuantity']['type']=='string'
for name in ['CreateReceivingInput','ReceiveItemsInput']:
    items=schemas[name]['properties']['items']
    assert (items['minItems'],items['maxItems'])==(1,50)
    assert items['items']['additionalProperties'] is False
for schema in ['CreateUserInput','UpdateUserInput','CreateProductInput','CreateReceivingInput','ReceiveItemsInput']:
    bad=dict(deref(schemas[schema]).get('example',{}),unexpected=True)
    assert list(OAS30Validator(deref(schemas[schema])).iter_errors(bad))
receipt=spec['paths']['/api/v1/receivings/{id}/receipts']['post']
assert {'200','201','404','409','503'}<=set(receipt['responses'])
assert any(resolve(p)['name']=='Idempotency-Key' and resolve(p)['required'] for p in receipt['parameters'])
for status,value in [('200',True),('201',False)]:assert receipt['responses'][status]['headers']['Idempotency-Replayed']['schema']['enum']==[value]
print(f'PASS: OpenAPI 3.0.3 validator; Markdown parity {checks} operations / 15 paths; DTO fields, roles, CSRF, cookies, limits, replay, 204, strict inputs; {examples} examples validated')
for p in [ROOT/'AGENTS.md',ROOT/'README.md',*(ROOT/'docs').glob('*.md')]:
    assert sum(l.startswith('```') for l in p.read_text(encoding='utf-8').splitlines())%2==0,p
erd=(ROOT/'docs/erd.mmd').read_text(encoding='utf-8')
assert set(re.findall(r'^    (\w+) \{',erd,re.M))=={'User','Product','Receiving','ReceivingItem','Receipt','InventoryTransaction','InventoryBalance'}
assert len(re.findall(r'^    \w+ \|\|--',erd,re.M))==10
flow=(ROOT/'docs/data-flow.mmd').read_text(encoding='utf-8')
assert flow.index('lock receiving')<flow.index('Find receipt')<flow.index('Matching receipt')<flow.index('Reject completed')
assert flow.index('COMMIT')<flow.index('201 created')
assert 'Redis' not in flow[flow.index('BEGIN READ COMMITTED'):flow.index('COMMIT')]
print('PASS: Markdown fences; diagram structure/order cross-check. Mermaid parser/rendering: NOT_RUN; runtime/concurrency/DB/security/frontend/deployment: NOT_RUN')
