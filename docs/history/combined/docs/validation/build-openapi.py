"""Regenerate the documentation contract. No application dependencies are used."""
from pathlib import Path
import re
import yaml

ROOT = Path(__file__).resolve().parents[2]
SC = {}
def ref(n): return {'$ref': '#/components/schemas/' + n}
def string(**kw): return dict(type='string', **kw)
def integer(lo=0, hi=None):
    d = dict(type='integer', minimum=lo)
    if hi is not None: d['maximum'] = hi
    return d
def obj(props, required=None):
    return dict(type='object', properties=props, required=list(props) if required is None else required, additionalProperties=False)
def array(item, **kw): return dict(type='array', items=item, **kw)
uuid = string(format='uuid')
date = string(format='date-time', description='ISO-8601 UTC timestamp.')
qty = integer(1, 1000000)
SC['Role'] = string(enum=['OPERATOR', 'SUPERVISOR'])
SC['ReceivingStatus'] = string(enum=['OPEN', 'PARTIAL', 'COMPLETED'])
# Public DTO fields are taken directly from the Markdown TypeScript declarations.
contract = (ROOT / 'docs/api-contract.md').read_text(encoding='utf-8')
for name in ['UserDto','ProductDto','ReceivingDto','ReceivingItemDto','InventoryDto','InventoryTransactionDto']:
    body = re.search(r'interface '+name+r' \{(.*?)\n\}', contract, re.S)[1]
    props = {}
    for field, typ in re.findall(r'^  (\w+): ([^;]+);',body,re.M):
        if typ == 'string | null': schema = dict(date, nullable=True)
        elif typ == 'Role': schema = ref('Role')
        elif typ == 'ReceivingStatus': schema = ref('ReceivingStatus')
        elif typ == 'boolean': schema = {'type':'boolean'}
        elif typ == 'number': schema = qty if field in ['quantity','expectedQuantity'] else integer(0,1000000)
        elif typ == '"pcs"': schema = string(enum=['pcs'])
        elif field == 'id' or field.endswith('Id') or field == 'createdBy': schema = dict(uuid)
        elif field.endswith('At'): schema = dict(date)
        else: schema = string()
        props[field] = schema
    SC[name] = obj(props)
SC['InventoryDto']['properties']['availableQuantity'] = string(pattern=r'^[0-9]+$', description='Nonnegative bigint serialized as decimal string; never JSON number.')
SC['ReceivingDto']['properties']['number'] = string(minLength=40,maxLength=40,pattern=r'^RCV-[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$')
SC['ReceivingDetailDto'] = obj(dict(SC['ReceivingDto']['properties'],items=array(ref('ReceivingItemDto'),minItems=1,maxItems=50)))
SC['ReceiptDto'] = obj(dict(id=uuid,receivingId=uuid,receivedBy=uuid,receivedAt=date,items=array(obj(dict(receivingItemId=uuid,productId=uuid,quantity=qty)),minItems=1,maxItems=50)))
name = string(minLength=1,maxLength=120,description='Trim before validation; length unit for non-password text remains an open question.')
email = string(format='email',maxLength=254,description='Trim and lowercase before storage and comparison. Includes deleted users in uniqueness.')
SC['LoginInput'] = obj(dict(email=email,password=string(minLength=1,maxLength=128,writeOnly=True,description='Unicode code points; do not trim or normalize.')))
SC['CreateUserInput'] = obj(dict(name=name,email=email,password=string(minLength=12,maxLength=128,writeOnly=True,description='Unicode code points; do not trim or normalize.'),role=ref('Role')))
SC['UpdateUserInput'] = dict(obj(dict(name=name,role=ref('Role'),isActive={'type':'boolean'}),[]),minProperties=1)
del SC['UpdateUserInput']['required']
SC['UpdateUserInput']['example'] = {'name': 'Warehouse user'}
SC['CreateProductInput'] = obj(dict(sku=string(minLength=1,maxLength=40,description='Trim and uppercase before matching ^[A-Z0-9_-]+$. Raw lowercase input is normalized, not rejected.', **{'x-normalized-pattern': '^[A-Z0-9_-]+$'}),name=name))
SC['CreateReceivingInput'] = obj(dict(reference=string(maxLength=160,default='',description='Trim before validation.'),items=array(obj(dict(productId=uuid,expectedQuantity=qty)),minItems=1,maxItems=50,description='Unique normalized productId values; backend validates property uniqueness.')),['items'])
SC['ReceiveItemsInput'] = obj(dict(items=array(obj(dict(receivingItemId=uuid,quantity=qty)),minItems=1,maxItems=50,description='Unique normalized receivingItemId values, all in the target document. Quantity is a delta, at most remaining. Backend validates under lock.')))
SC['CsrfDto'] = obj(dict(csrfToken=string(description='Session-bound token generated from at least 32 random bytes; stable for this session.')))
SC['LoginDto'] = obj(dict(user=ref('UserDto'),csrfToken=string()))
SC['ApiErrorResponse'] = obj(dict(error=obj(dict(code=string(),message=string(),requestId=string(),details=array(obj(dict(path=string(),message=string())))),['code','message','requestId'])))
SC['Pagination'] = obj(dict(page=integer(1,1000000),limit=integer(1,100),total=integer()))
SC['LiveDto'] = obj(dict(status=string(enum=['ok'])))
SC['ReadyDto'] = obj(dict(status=string(enum=['ready']),dependencies=obj(dict(postgres=string(enum=['up']),redis=string(enum=['up'])))))

EX_UUID = '11111111-1111-4111-8111-111111111111'
def example(schema, field=''):
    if '$ref' in schema: return example(SC[schema['$ref'].split('/')[-1]],field)
    if 'example' in schema: return schema['example']
    if schema.get('nullable'): return None
    if 'enum' in schema: return schema['enum'][0]
    if schema['type'] == 'object': return {k:example(v,k) for k,v in schema['properties'].items() if k in schema.get('required',[])}
    if schema['type'] == 'array': return [example(schema['items'])]
    if schema['type'] == 'boolean': return True
    if schema['type'] == 'integer': return max(1,schema.get('minimum',0))
    if schema.get('format') == 'uuid': return EX_UUID
    if schema.get('format') == 'date-time': return '2026-10-29T00:00:00Z'
    if schema.get('format') == 'email': return 'supervisor@example.com'
    return {'sku':'WDG-001','name':'Warehouse user','productName':'Widget','actorName':'Warehouse user','number':'RCV-'+EX_UUID.upper(),'receivingNumber':'RCV-'+EX_UUID.upper(),'availableQuantity':'100','password':'example-password-123','csrfToken':'example-session-bound-token'}.get(field,'example')
def content(schema, value=None): return {'application/json': {'schema':schema,'example':example(schema) if value is None else value}}
def response(dto, paginated=False, raw=False):
    schema = ref(dto)
    if not raw: schema = obj(dict(data=array(schema),pagination=ref('Pagination'))) if paginated else obj(dict(data=schema))
    return {'description':'Successful response.','content':content(schema)}
errors = {
 '400':['VALIDATION_ERROR','INVALID_JSON'], '401':['UNAUTHENTICATED','SESSION_EXPIRED','INVALID_CREDENTIALS'],
 '403':['FORBIDDEN','CSRF_INVALID','ORIGIN_NOT_ALLOWED'], '404':['Resource-specific not found; unspecified resource codes remain open.'],
 '409':['EMAIL_ALREADY_EXISTS','SELF_ACCOUNT_RESTRICTION','LAST_ACTIVE_SUPERVISOR','USER_DELETED','SKU_ALREADY_EXISTS','OVER_RECEIPT','RECEIVING_COMPLETED','IDEMPOTENCY_CONFLICT'],
 '413':['PAYLOAD_TOO_LARGE'], '415':['UNSUPPORTED_MEDIA_TYPE'], '429':['RATE_LIMITED'],
 '503':['DEPENDENCY_UNAVAILABLE','TRANSACTION_RETRY_REQUIRED'], '500':['INTERNAL_ERROR']}
ER = {code:{'description':', '.join(codes),'content':content(ref('ApiErrorResponse'),{'error':{'code':codes[0] if code!='404' else 'RECEIVING_NOT_FOUND','message':'Request could not be completed.','requestId':'example-request-id'}})} for code,codes in errors.items()}
ER['429']['headers'] = {'Retry-After':{'description':'Seconds until another request is allowed.','schema':string()}}
ER = {'Error'+code: value for code, value in ER.items()}
PARAM = {'Id':dict(name='id',**{'in':'path'},required=True,schema=uuid),
 'Csrf':dict(name='X-CSRF-Token',**{'in':'header'},required=True,schema=string(),description='Session-bound synchronizer token, including pre-login session for login.'),
 'Idempotency':dict(name='Idempotency-Key',**{'in':'header'},required=True,schema=uuid,description='Scoped to receiving document; normalize UUID to lowercase.'),
 'Page':dict(name='page',**{'in':'query'},schema=dict(integer(1,1000000),default=1)),
 'Limit':dict(name='limit',**{'in':'query'},schema=dict(integer(1,100),default=20))}
def paramref(n): return {'$ref':'#/components/parameters/'+n}
def q(n,schema): return dict(name=n,**{'in':'query'},schema=schema)
paths={}
def op(method,path,oid,dto=None,status='200',body=None,paging=False,filters=None,supervisor=False,public=False,desc=''):
    health=path.startswith('/health')
    full=path if health else '/api/v1'+path
    mutation=method in ['post','patch','delete','put']
    params=[]
    if '{id}' in path: params.append(paramref('Id'))
    if paging: params += [paramref('Page'),paramref('Limit')]
    params += filters or []
    if mutation:
        params.append(paramref('Csrf'))
        desc += ' Content-Type application/json is required, including no-body mutations; no body is required for logout or DELETE.'
    if mutation:
        params += [dict(name='Origin',**{'in':'header'},schema=string(format='uri'),description='Must match APP_ORIGIN. If absent, a trusted Referer origin is required.'),dict(name='Referer',**{'in':'header'},schema=string(format='uri'),description='Used only when Origin is absent. Both absent or untrusted is rejected.')]
    codes=['400','500']
    if not health: codes+=['429','503']
    if not public: codes+=['401','403']
    if mutation: codes+=['403','415']; codes+=['413'] if body else []
    if '{id}' in path: codes+=['404']
    if mutation and not path.startswith('/auth'): codes+=['409']
    if path=='/auth/login': codes+=['401']
    if path=='/health/ready': codes+=['503']
    responses={c:{'$ref':'#/components/responses/Error'+c} for c in dict.fromkeys(codes)}
    responses[status] = {'description':'No response body.'} if status=='204' else response(dto,paging,health)
    d=dict(operationId=oid,tags=[path.strip('/').split('/')[0]],summary=oid,description=(desc+' '+('Supervisor only.' if supervisor else 'OPERATOR and SUPERVISOR.' if not public else 'No authenticated identity required.')+' Unknown query parameters are rejected with 400.').strip(),security=[] if public else [{'LocalSession':[]},{'SecureSession':[]}],responses=responses)
    if params:d['parameters']=params
    if body:d['requestBody']={'required':True,'description':'Strict JSON body; maximum 64 KiB. Normalization and domain validation are enforced by the backend.','content':content(ref(body))}
    if supervisor:d['x-roles']=['SUPERVISOR']
    elif not public:d['x-roles']=['OPERATOR','SUPERVISOR']
    if path.startswith('/auth'):
        for r in responses.values():
            if '$ref' not in r:r.setdefault('headers',{})['Cache-Control']={'schema':string(enum=['no-store']),'description':'All authentication responses, including errors, use no-store.'}
        d['description']+=' All authentication responses, including errors, use Cache-Control: no-store.'
    paths.setdefault(full,{})[method]=d
    return d

op('get','/auth/csrf-token','getCsrfToken','CsrfDto',public=True,desc='Initialize anonymous session if needed; save before returning stable token. Existing authenticated sessions are supported.')
login=op('post','/auth/login','login','LoginDto',body='LoginInput',public=True,desc='Anonymous session cookie and CSRF bootstrap required. Regenerate session after valid credentials, rotate CSRF, save before response. Generic credential failure.')
login['security'] = [{'LocalSession':[]},{'SecureSession':[]}]
login['responses']['200'].setdefault('headers',{})['Set-Cookie']={'schema':string(),'description':'New session cookie: HttpOnly, host-only, SameSite=Lax, Path=/; Secure on HTTPS. Never returns session ID in JSON.'}
op('get','/auth/me','getCurrentUser','UserDto')
logout=op('post','/auth/logout','logout',status='204',desc='No request body. Destroy Redis session and await success, then clear cookie with matching attributes.')
logout['responses']['204'].setdefault('headers',{})['Set-Cookie']={'schema':string(),'description':'Expires the session cookie.'}
boolstr=string(enum=['true','false'])
op('get','/users','listUsers','UserDto',paging=True,supervisor=True,filters=[q('role',ref('Role')),q('isActive',boolstr),q('includeDeleted',dict(boolstr,default='false'))],desc='Default includes active and inactive users, excluding deleted. Order createdAt DESC, id DESC.')
op('get','/users/{id}','getUser','UserDto',supervisor=True,desc='Deleted users remain readable for historical tracing.')
op('post','/users','createUser','UserDto',status='201',body='CreateUserInput',supervisor=True)
op('patch','/users/{id}','updateUser','UserDto',body='UpdateUserInput',supervisor=True,desc='Only name, role, isActive; at least one field. Real role/status change increments authVersion. No self-demotion/deactivation or reactivation of deleted user. Shared advisory lock and actor recheck protect last active supervisor.')
op('delete','/users/{id}','deleteUser',status='204',supervisor=True,desc='Soft delete, deactivate and increment authVersion; preserve history. Repeated deletion returns 204 with no additional change. No self-delete; retain one active supervisor; shared advisory lock and actor recheck.')
search=q('q',string(maxLength=100,description='Trim; case-insensitive substring of SKU or name.'))
op('get','/products','listProducts','ProductDto',paging=True,filters=[search],desc='Order sku ASC, id ASC.')
op('get','/products/{id}','getProduct','ProductDto')
op('post','/products','createProduct','ProductDto',status='201',body='CreateProductInput',supervisor=True,desc='Atomically create product and zero inventory balance. Unit pcs.')
op('get','/receivings','listReceivings','ReceivingDto',paging=True,filters=[q('status',ref('ReceivingStatus'))],desc='Order createdAt DESC, id DESC.')
op('get','/receivings/{id}','getReceiving','ReceivingDetailDto',desc='Header and items from a consistent database snapshot.')
op('post','/receivings','createReceiving','ReceivingDetailDto',status='201',body='CreateReceivingInput',desc='Expected quantities immutable; initial OPEN, received zero; no inventory change.')
receipt=op('post','/receivings/{id}/receipts','receiveItems','ReceiptDto',status='201',body='ReceiveItemsInput',desc='One READ COMMITTED transaction: lock receiving before idempotency lookup, replay before completed check, lock items and validate all remaining quantities. Atomically update receipt, item counters, ledger, balances in product order and status. Same key/document/actor/canonical payload replays immutable original body, including after completion; changed actor/payload is 409. Different item ordering is equivalent. No stock changes on rejection or rollback; retry with original key on uncertain outcome or TRANSACTION_RETRY_REQUIRED.')
receipt['parameters'].append(paramref('Idempotency'))
receipt['responses']['200']=response('ReceiptDto')
for code,replay in [('200',True),('201',False)]:receipt['responses'][code]['headers']={'Idempotency-Replayed':{'description':'Whether this response replays the original receipt.','schema':{'type':'boolean','enum':[replay]}}}
receipt['responses']['404']={'description':'RECEIVING_NOT_FOUND or RECEIVING_ITEM_NOT_FOUND (including cross-document item).','content':content(ref('ApiErrorResponse'),{'error':{'code':'RECEIVING_ITEM_NOT_FOUND','message':'Item not in receiving.','requestId':'example-request-id'}})}
op('get','/inventory','listInventory','InventoryDto',paging=True,filters=[search],desc='Includes zero stock. Order sku ASC, productId ASC. availableQuantity is decimal string.')
op('get','/inventory/transactions','listInventoryTransactions','InventoryTransactionDto',paging=True,filters=[q('productId',uuid),q('receivingId',uuid)],desc='Order createdAt DESC, id DESC. Valid UUID filter without transactions returns empty list. Positive delta; actor remains traceable after soft deletion.')
op('get','/health/live','getLiveness','LiveDto',public=True)
op('get','/health/ready','getReadiness','ReadyDto',public=True,desc='Check PostgreSQL connection and required schema plus Redis PING. No session or business limiter.')
spec=dict(openapi='3.0.3',info=dict(title='Warehouse Receiving System API',version='0.1.0',description='Documentation contract derived from docs/api-contract.md and explicit PRD/technical rules. No implementation exists. Business paths /api/v1; health paths outside it. Request objects reject unknown fields. Non-password text length units remain open; OpenAPI maxLength describes normalized character limits, backend decision pending. Mutations require trusted Origin or Referer, Content-Type application/json even without a body, and session-bound CSRF including login. Dependency failures fail closed with 503. See technical-spec.md for session lifetimes and rate limits.'),servers=[{'url':'/'}],paths=paths,components=dict(schemas=SC,parameters=PARAM,responses=ER,securitySchemes=dict(LocalSession={'type':'apiKey','in':'cookie','name':'wrs.sid','description':'Local HTTP only. Redis-backed server session.'},SecureSession={'type':'apiKey','in':'cookie','name':'__Host-wrs.sid','description':'HTTPS production: Secure, HttpOnly, SameSite=Lax, Path=/, host-only.'})))
(ROOT/'docs/openapi.yaml').write_text(yaml.safe_dump(spec,sort_keys=False,allow_unicode=True,width=110),encoding='utf-8')
print(f'Generated OpenAPI: {len(paths)} paths, {sum(len(v) for v in paths.values())} operations, {len(SC)} schemas')
