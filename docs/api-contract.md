# API Contract

> Sumber: [PROJECT_SPEC.md](source/PROJECT_SPEC.md). Fondasi Task 2 telah diimplementasikan; autentikasi dan fitur bisnis belum tersedia. Status per pemeriksaan ada di docs/testing.md (relatif terhadap root proyek).

Sumber utama kontrak bersama adalah dokumen ini dalam repository backend. Frontend menyimpan replika byte-identik; prosedur dan pemeriksaan sinkronisasi ada di [api-sync.md](api-sync.md). Perubahan semantik harus ditetapkan di backend terlebih dahulu.

Kontrak Markdown ini diterjemahkan ke [openapi.yaml](openapi.yaml) pada Task 1. Perubahan endpoint harus menyelaraskan kedua dokumen dan menjalankan ulang validasi.

General conventions
Base path: /api/v1
Content-Type: application/json
Authentication: session cookie
CSRF header: X-CSRF-Token
Receiving idempotency header: Idempotency-Key
Property naming: camelCase
Timestamp: ISO-8601 UTC
ID: UUID

Semua object request bersifat strict: field tidak dikenal ditolak.

Format sukses:

```typescript
interface ApiResponse<T> {
  data: T;
}
```

```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
```

Format error:

```typescript
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: Array<{
      path: string;
      message: string;
    }>;
  };
}
```

Pagination:
page: integer 1..1000000, default 1
limit: integer 1..100, default 20

Unknown query parameter ditolak dengan 400.

Response DTO

```typescript
type Role = "OPERATOR" | "SUPERVISOR";
```

```typescript
type ReceivingStatus =
  | "OPEN"
  | "PARTIAL"
  | "COMPLETED";
```

```typescript
interface UserDto {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

```typescript
interface ProductDto {
  id: string;
  sku: string;
  name: string;
  unit: "pcs";
  createdAt: string;
}
```

```typescript
interface ReceivingDto {
  id: string;
  number: string;
  reference: string;
  status: ReceivingStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

```typescript
interface ReceivingItemDto {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  expectedQuantity: number;
  receivedQuantity: number;
  remainingQuantity: number;
}
```

```typescript
interface ReceivingDetailDto extends ReceivingDto {
  items: ReceivingItemDto[];
}
```

```typescript
interface ReceiptDto {
  id: string;
  receivingId: string;
  receivedBy: string;
  receivedAt: string;
  items: Array<{
    receivingItemId: string;
    productId: string;
    quantity: number;
  }>;
}
```

```typescript
interface InventoryDto {
  productId: string;
  sku: string;
  productName: string;
  unit: "pcs";
  availableQuantity: string;
  updatedAt: string;
}
```

```typescript
interface InventoryTransactionDto {
  id: string;
  receiptId: string;
  receivingId: string;
  receivingNumber: string;
  receivingItemId: string;
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  actorId: string;
  actorName: string;
  createdAt: string;
}
```

password, passwordHash, authVersion, session ID, dan payload hash tidak boleh muncul dalam user/business response.

Status implementasi saat dokumentasi mandiri disiapkan: health/liveness dan readiness fondasi sudah tersedia. Endpoint autentikasi dan seluruh endpoint bisnis di bawah tetap merupakan kontrak rencana; Task 3 belum dimulai.

## Authentication endpoints

| Method dan path | Auth | CSRF | Request | Sukses |
| --- | --- | --- | --- | --- |
| GET /auth/csrf-token | Anonymous atau authenticated | Tidak | Tidak ada | 200 ApiResponse<{ csrfToken: string }> |
| POST /auth/login | Anonymous | Ya | { email, password } | 200 ApiResponse<{ user: UserDto, csrfToken: string }> |
| GET /auth/me | Ya | Tidak | Tidak ada | 200 ApiResponse<UserDto> |
| POST /auth/logout | Ya | Ya | Tidak ada | 204, tanpa body |

Login validation:

- Email valid, maksimal 254 karakter, trim dan lowercase.
- Password harus string nonempty dengan batas 128 code point.
- Password tidak di-trim.
- Pesan kegagalan tidak membedakan akun tidak ada, nonaktif, terhapus, atau password salah.
- Login sukses mengirim Set-Cookie untuk session baru.
GET /auth/csrf-token dan seluruh response autentikasi menggunakan Cache-Control: no-store.

## User endpoints

Seluruh endpoint berikut hanya untuk supervisor.

| Method dan path | Request | Sukses |
| --- | --- | --- |
| GET /users | Query pagination, role?, isActive?, includeDeleted? | 200 PaginatedResponse<UserDto> |
| GET /users/:id | UUID | 200 ApiResponse<UserDto> |
| POST /users | Create user body | 201 ApiResponse<UserDto> |
| PATCH /users/:id | Update user body | 200 ApiResponse<UserDto> |
| DELETE /users/:id | UUID | 204 |

Query:

- role: enum role.
- isActive: literal true atau false.
- includeDeleted: literal true atau false, default false.
- Daftar default mencakup user aktif dan nonaktif yang belum terhapus.
- Urutan createdAt DESC, id DESC.
- Detail user terhapus masih dapat dibaca supervisor untuk keperluan penelusuran.
Create:

```typescript
interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}
```

Validation:

- Nama 1–120 karakter setelah trim.
- Email valid, maksimal 254 karakter.
- Password 12–128 Unicode code point.
- Role wajib dikirim.
- isActive, deletedAt, dan authVersion tidak boleh ditentukan client.
Update:

```typescript
interface UpdateUserInput {
  name?: string;
  role?: Role;
  isActive?: boolean;
}
```

Minimal satu field harus dikirim.

Konflik:
EMAIL_ALREADY_EXISTS
SELF_ACCOUNT_RESTRICTION
LAST_ACTIVE_SUPERVISOR
USER_DELETED

Semua mutation user membutuhkan CSRF.

## Product endpoints

| Method dan path | Role | Request | Sukses |
| --- | --- | --- | --- |
| GET /products | Kedua role | Pagination, q? | 200 PaginatedResponse<ProductDto> |
| GET /products/:id | Kedua role | UUID | 200 ApiResponse<ProductDto> |
| POST /products | Supervisor | { sku, name } | 201 ApiResponse<ProductDto> |

q:

- Optional.
- Trim.
- Maksimal 100 karakter.
- Pencarian case-insensitive berdasarkan potongan SKU atau nama.
- Urutan produk sku ASC, id ASC.
Create product dan inventory balance nol harus berada dalam transaksi yang sama.

Conflict SKU menggunakan 409 SKU_ALREADY_EXISTS.

## Receiving endpoints

| Method dan path | Request | Sukses |
| --- | --- | --- |
| GET /receivings | Pagination, status? | 200 PaginatedResponse<ReceivingDto> |
| GET /receivings/:id | UUID | 200 ApiResponse<ReceivingDetailDto> |
| POST /receivings | Create receiving body | 201 ApiResponse<ReceivingDetailDto> |
| POST /receivings/:id/receipts | Receive body dan idempotency header | 201 baru atau 200 replay |

Kedua role boleh mengakses endpoint ini.

List diurutkan createdAt DESC, id DESC.

Detail header dan item harus berasal dari snapshot database yang konsisten.

Create request:

```typescript
interface CreateReceivingInput {
  reference?: string;
  items: Array<{
    productId: string;
    expectedQuantity: number;
  }>;
}
```

Validation:

- Reference maksimal 160 karakter setelah trim; default string kosong.
- Item 1–50.
- Product ID valid dan tersedia.
- Product ID tidak berulang.
- Expected quantity integer 1–1.000.000.
- Client tidak boleh mengirim status atau received quantity.
Receive request:

```typescript
interface ReceiveItemsInput {
  items: Array<{
    receivingItemId: string;
    quantity: number;
  }>;
}
```

Header wajib:
Idempotency-Key: <UUID>
X-CSRF-Token: <session-bound-token>

Validation:

- Item 1–50.
- Receiving item ID berbeda.
- Semua item berasal dari receiving yang diminta.
- Quantity integer 1–1.000.000.
- Quantity tidak melebihi remaining.
- Tidak menerima field total stok atau total received dari client.
Response baru:
201 Created
Idempotency-Replayed: false

Response pengulangan:
200 OK
Idempotency-Replayed: true

Keduanya menggunakan ApiResponse<ReceiptDto>.

Body replay harus identik dengan response receipt pertama, termasuk timestamp dan urutan item yang deterministik.

Error receiving:

| Kondisi | Status | Code |
| --- | --- | --- |
| Receiving tidak ada | 404 | RECEIVING_NOT_FOUND |
| Item bukan bagian dokumen | 404 | RECEIVING_ITEM_NOT_FOUND |
| Melebihi remaining | 409 | OVER_RECEIPT |
| Dokumen completed, operasi baru | 409 | RECEIVING_COMPLETED |
| Key sama, payload/actor berbeda | 409 | IDEMPOTENCY_CONFLICT |

## Inventory endpoints

| Method dan path | Request | Sukses |
| --- | --- | --- |
| GET /inventory | Pagination, q? | 200 PaginatedResponse<InventoryDto> |
| GET /inventory/transactions | Pagination, productId?, receivingId? | 200 PaginatedResponse<InventoryTransactionDto> |

Inventory:

- Memuat produk dengan stok nol.
- q mengikuti aturan pencarian produk.
- Urutan sku ASC, productId ASC.
Transaction history:

- Filter ID harus UUID.
- Bila filter UUID valid tidak memiliki transaksi, kembalikan daftar kosong.
- Urutan createdAt DESC, id DESC.
- Quantity merupakan delta positif.
- Actor tetap memiliki ID yang dapat ditelusuri meskipun akunnya nonaktif atau terhapus.
Health endpoints

Berada di luar base path bisnis:
GET /health/live

```json
{
  "status": "ok"
}
```

## GET /health/ready

```json
{
  "status": "ready",
  "dependencies": {
    "postgres": "up",
    "redis": "up"
  }
}
```

Readiness memeriksa koneksi database, akses schema yang diperlukan, dan Redis PING.

Jika belum siap, gunakan 503 dengan format error standar.

## Shared errors

| Status | Code |
| --- | --- |
| 400 | VALIDATION_ERROR, INVALID_JSON |
| 401 | UNAUTHENTICATED, SESSION_EXPIRED, INVALID_CREDENTIALS |
| 403 | FORBIDDEN, CSRF_INVALID, ORIGIN_NOT_ALLOWED |
| 404 | Resource-specific not found |
| 409 | Business-specific conflict |
| 413 | PAYLOAD_TOO_LARGE |
| 415 | UNSUPPORTED_MEDIA_TYPE |
| 429 | RATE_LIMITED |
| 503 | DEPENDENCY_UNAVAILABLE, TRANSACTION_RETRY_REQUIRED |
| 500 | INTERNAL_ERROR |

JSON body maksimal 64 KiB.

Lock timeout atau deadlock yang sudah rollback boleh dipetakan ke 503 TRANSACTION_RETRY_REQUIRED. Client tetap menggunakan idempotency key semula saat retry.

## Persyaratan OpenAPI hasil konversi

Codex harus menghasilkan OpenAPI yang mencakup:

- Seluruh endpoint di atas.
- Request/response schema.
- Required fields, enum, min/max, format UUID dan timestamp.
- Cookie authentication.
- CSRF header pada seluruh mutation, termasuk login.
- Idempotency header khusus receive.
- Seluruh response status yang relevan.
- Contoh request dan response.
- Error schema bersama.
- Response header Idempotency-Replayed.
- Status 204 tanpa response body.

## Klarifikasi konversi Task 1

- OpenAPI menggunakan server `/` dan path bisnis penuh `/api/v1/...` agar `/health/live` dan `/health/ready` tetap di luar base path bisnis.
- Cookie local `wrs.sid` atau HTTPS `__Host-wrs.sid` merupakan alternatif. Login membutuhkan session cookie anonymous dari bootstrap, bukan identitas yang sudah login.
- Seluruh mutation memerlukan Content-Type application/json dan trusted Origin atau fallback Referer; logout dan DELETE tidak mempunyai request body. Header Content-Type reserved di OpenAPI sehingga ketentuan ini dinyatakan dalam description.
- Normalisasi trim/lowercase email, trim/uppercase SKU dan UUID lowercase dijalankan sebelum validasi domain yang relevan. Batas string nama/reference dinyatakan terhadap hasil trim; unit runtime panjang teks selain password masih pertanyaan terbuka. Password tegas dihitung Unicode code point; min 12 untuk create, min 1 untuk login.
- Property uniqueness pada array item, keberadaan produk, membership item, remaining quantity, role authorization dan transaksi harus ditegakkan backend. Schema OpenAPI saja tidak dapat membuktikannya.
- Detail receiving memakai snapshot konsisten. Replay mengembalikan immutable ReceiptDto, termasuk urutan items deterministik, bukan snapshot current receiving.
- Nama kode 404 user/produk dan pemetaan produk tidak tersedia saat create receiving belum ditetapkan sumber. OpenAPI mempertahankan error schema bersama dan resource-specific description; tidak mengarang kode baru. Lihat R-10 pada spec-review.md sebelum implementasi endpoint terkait.
- Shared responses mencantumkan kategori error umum; tidak menetapkan precedence bila beberapa kondisi gagal bersamaan. Semua response auth, termasuk error, menggunakan Cache-Control: no-store.
