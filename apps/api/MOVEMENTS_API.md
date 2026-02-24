# Movements API Documentation

## Authentication

Pass the user ID in the `x-user-id` header:

```bash
-H "x-user-id: your-user-id-here"
```

> **TODO**: Will be replaced with JWT authentication.

---

## Endpoints

### 1. Quick Add Movement (Optimized for QuickAdd Component)

**POST** `/api/movements/quick`

Fastest way to log income/expense with minimal fields. Automatically uses the last used account if not specified.

**Request Body:**
```json
{
  "tipo": "GASTO",
  "monto": 1500.50,
  "categoria": "comida",
  "cuenta_id": "uuid",
  "descripcion": "Almuerzo"
}
```

**Field Validations:**
- `tipo`: Required, `INGRESO` or `GASTO`
- `monto`: Required, > 0
- `categoria`: Optional, max 50 chars
- `cuenta_id`: Optional (uses last used active account if not provided)
- `descripcion`: Optional, max 200 chars (defaults to "Gasto" or "Ingreso")

**Example:**
```bash
curl -X POST "http://localhost:3001/api/movements/quick" \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "tipo": "GASTO",
    "monto": 1500.50,
    "categoria": "comida"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Movimiento registrado exitosamente",
  "data": {
    "id": "uuid",
    "tipo": "GASTO",
    "monto": "1500.50",
    "categoria": "comida",
    "cuenta_id": "uuid",
    "moneda": "ARS",
    "descripcion": "Gasto",
    "fecha": "2024-01-15T10:00:00Z",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

**Business Rules:**
- ✅ Auto-selects last used account (or first active account)
- ✅ Validates sufficient balance for expenses
- ✅ Updates account balance atomically
- ✅ Uses account's currency automatically

---

### 2. Create Income

**POST** `/api/movements/income`

Register income to an account.

**Request Body:**
```json
{
  "cuenta_id": "uuid",
  "monto": 50000.00,
  "descripcion": "Salario enero",
  "categoria": "salario",
  "fecha": "2024-01-15T10:00:00Z",
  "moneda": "ARS",
  "tasa_conversion": 1.0
}
```

**Field Validations:**
- `cuenta_id`: Required, valid UUID
- `monto`: Required, > 0
- `descripcion`: Required, 1-200 chars
- `categoria`: Optional, max 50 chars
- `fecha`: Optional (defaults to now)
- `moneda`: Optional (defaults to account currency)
- `tasa_conversion`: Optional (required if moneda ≠ account currency)

**Example:**
```bash
curl -X POST "http://localhost:3001/api/movements/income" \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "cuenta_id": "account-uuid",
    "monto": 50000.00,
    "descripcion": "Salario enero",
    "categoria": "salario"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Ingreso registrado exitosamente",
  "data": {
    "id": "uuid",
    "tipo": "INGRESO",
    "monto": "50000.00",
    "moneda": "ARS",
    "descripcion": "Salario enero",
    "categoria": "salario",
    "fecha": "2024-01-15T10:00:00Z"
  }
}
```

**Currency Conversion Example:**
```bash
# Income in USD to ARS account
curl -X POST "http://localhost:3001/api/movements/income" \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "cuenta_id": "ars-account-uuid",
    "monto": 100.00,
    "moneda": "USD",
    "tasa_conversion": 1000.0,
    "descripcion": "Freelance payment"
  }'
# This will add $100 * 1000 = $100,000 ARS to the account
```

---

### 3. Create Expense

**POST** `/api/movements/expense`

Register an expense from an account.

**Request Body:**
```json
{
  "cuenta_id": "uuid",
  "monto": 2500.00,
  "descripcion": "Supermercado",
  "categoria": "comida",
  "fecha": "2024-01-15T10:00:00Z",
  "moneda": "ARS",
  "tasa_conversion": 1.0
}
```

**Field Validations:**
- Same as income

**Example:**
```bash
curl -X POST "http://localhost:3001/api/movements/expense" \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "cuenta_id": "account-uuid",
    "monto": 2500.00,
    "descripcion": "Supermercado",
    "categoria": "comida"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Gasto registrado exitosamente",
  "data": {
    "id": "uuid",
    "tipo": "GASTO",
    "monto": "2500.00",
    "descripcion": "Supermercado",
    "categoria": "comida"
  }
}
```

**Business Rules:**
- ✅ Validates sufficient balance before creating
- ✅ Validates account is active
- ✅ Handles currency conversion if needed
- ✅ Updates account balance atomically

---

### 4. Create Transfer

**POST** `/api/movements/transfer`

Transfer money between two accounts. Creates two linked movements.

**Request Body:**
```json
{
  "cuenta_origen_id": "uuid",
  "cuenta_destino_id": "uuid",
  "monto": 10000.00,
  "descripcion": "Transferencia entre cuentas",
  "fecha": "2024-01-15T10:00:00Z",
  "tasa_conversion": 1.0
}
```

**Field Validations:**
- `cuenta_origen_id`: Required, valid UUID
- `cuenta_destino_id`: Required, valid UUID (must be different from origin)
- `monto`: Required, > 0
- `descripcion`: Required, 1-200 chars
- `fecha`: Optional (defaults to now)
- `tasa_conversion`: Optional (auto-calculated from ConfiguracionMoneda if not provided)

**Example:**
```bash
curl -X POST "http://localhost:3001/api/movements/transfer" \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "cuenta_origen_id": "account-1-uuid",
    "cuenta_destino_id": "account-2-uuid",
    "monto": 10000.00,
    "descripcion": "Ahorro mensual"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Transferencia registrada exitosamente",
  "data": {
    "movimientoSalida": {
      "id": "uuid-1",
      "tipo": "TRANSFERENCIA",
      "cuenta_id": "account-1-uuid",
      "cuenta_destino_id": "account-2-uuid",
      "monto": "10000.00",
      "movimiento_relacionado_id": "uuid-2"
    },
    "movimientoEntrada": {
      "id": "uuid-2",
      "tipo": "TRANSFERENCIA",
      "cuenta_id": "account-2-uuid",
      "monto": "10000.00",
      "movimiento_relacionado_id": "uuid-1"
    }
  }
}
```

**Business Rules:**
- ✅ Creates two linked movements (bidirectional relation)
- ✅ Validates sufficient balance in origin account
- ✅ Both accounts must be active
- ✅ Handles multi-currency conversion
- ✅ Atomic transaction (all-or-nothing)
- ⚠️ Transfers DON'T affect monthly balance (income - expenses)

---

### 5. Get Movements

**GET** `/api/movements`

Get movements with filters and pagination.

**Query Parameters:**
- `desde`: Optional, date (YYYY-MM-DD or ISO datetime)
- `hasta`: Optional, date (YYYY-MM-DD or ISO datetime)
- `tipo`: Optional, movement type enum
- `cuenta_id`: Optional, filter by account (includes both origin and destination)
- `categoria`: Optional, filter by category
- `limit`: Optional, max results (default: 100, max: 1000)
- `offset`: Optional, pagination offset (default: 0)

**Example:**
```bash
# Get all expenses in January
curl -X GET "http://localhost:3001/api/movements?desde=2024-01-01&hasta=2024-01-31&tipo=GASTO" \
  -H "x-user-id: user-123"

# Get movements for specific account
curl -X GET "http://localhost:3001/api/movements?cuenta_id=account-uuid&limit=50" \
  -H "x-user-id: user-123"

# Pagination
curl -X GET "http://localhost:3001/api/movements?limit=20&offset=40" \
  -H "x-user-id: user-123"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tipo": "GASTO",
      "monto": "1500.50",
      "moneda": "ARS",
      "descripcion": "Supermercado",
      "categoria": "comida",
      "fecha": "2024-01-15T10:00:00Z",
      "balance_despues": 48500.50,
      "cuenta_origen": {
        "id": "uuid",
        "nombre": "Cuenta Corriente",
        "tipo": "BANCO",
        "moneda": "ARS"
      },
      "cuenta_destino": null,
      "tarjeta": null,
      "deuda": null
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 100,
    "offset": 0,
    "hasMore": true
  }
}
```

**Features:**
- ✅ Includes related account/card/debt details
- ✅ Calculates running balance when filtering by single account
- ✅ Sorted by date (newest first)
- ✅ Efficient pagination

---

### 6. Get Movement Statistics

**GET** `/api/movements/stats`

Get aggregated statistics for a date range.

**Query Parameters:**
- `desde`: Optional, date (YYYY-MM-DD)
- `hasta`: Optional, date (YYYY-MM-DD)

**Example:**
```bash
curl -X GET "http://localhost:3001/api/movements/stats?desde=2024-01-01&hasta=2024-01-31" \
  -H "x-user-id: user-123"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ingresos": 50000.00,
    "gastos": 35000.00,
    "balance": 15000.00,
    "por_categoria": [
      {
        "categoria": "comida",
        "_sum": { "monto": "12000.00" },
        "_count": 25
      },
      {
        "categoria": "transporte",
        "_sum": { "monto": "8000.00" },
        "_count": 15
      }
    ],
    "por_tipo": [
      {
        "tipo": "INGRESO",
        "_sum": { "monto": "50000.00" },
        "_count": 2
      },
      {
        "tipo": "GASTO",
        "_sum": { "monto": "30000.00" },
        "_count": 42
      }
    ]
  }
}
```

---

### 7. Get Single Movement

**GET** `/api/movements/:id`

Get details of a specific movement.

**Example:**
```bash
curl -X GET "http://localhost:3001/api/movements/movement-uuid" \
  -H "x-user-id: user-123"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tipo": "GASTO",
    "monto": "1500.50",
    "descripcion": "Supermercado",
    "cuenta_origen": { ... },
    "fecha": "2024-01-15T10:00:00Z"
  }
}
```

---

### 8. Delete Movement

**DELETE** `/api/movements/:id`

Delete a movement and reverse its balance changes.

**Restrictions:**
- ❌ Cannot delete movements part of installment purchases
- ❌ Cannot delete AJUSTE movements
- ✅ Deleting transfers deletes both linked movements
- ✅ Balance changes are reversed atomically

**Example:**
```bash
curl -X DELETE "http://localhost:3001/api/movements/movement-uuid" \
  -H "x-user-id: user-123"
```

**Success Response:**
```json
{
  "success": true,
  "message": "Movimiento eliminado exitosamente"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "No se puede eliminar un movimiento que es parte de una compra en cuotas"
}
```

---

## Business Rules Implemented

### RN-001: Account Balance Updates

All movements update account balances atomically:

**Positive (add to balance):**
- `INGRESO`
- `RETORNO_INVERSION`
- `INGRESO_INICIAL`
- `TRANSFERENCIA` (destination account)
- `AJUSTE` (if positive)

**Negative (subtract from balance):**
- `GASTO`
- `PAGO_TARJETA`
- `PAGO_DEUDA`
- `INVERSION`
- `TRANSFERENCIA` (origin account)
- `AJUSTE` (if negative)

### Currency Conversion

When movement currency ≠ account currency:

1. **Manual rate**: Provide `tasa_conversion` in request
2. **Auto rate**: Looks up `ConfiguracionMoneda` table
3. **Error**: If no rate configured, returns 400 error

```
monto_en_moneda_cuenta = monto * tasa_conversion
```

The conversion rate is stored in the movement for audit trail.

### Validation Rules

**Before expense/transfer:**
- ✅ Account exists and belongs to user
- ✅ Account is active
- ✅ Sufficient balance available
- ✅ Conversion rate available (if multi-currency)

**Before deletion:**
- ✅ Movement exists and belongs to user
- ✅ Not part of installment purchase
- ✅ Not an AJUSTE movement

---

## Movement Types Reference

| Type | Description | Affects Balance | Monthly Balance |
|------|-------------|----------------|-----------------|
| `INGRESO` | Regular income | ✅ Add | ✅ Income |
| `GASTO` | Regular expense | ✅ Subtract | ✅ Expense |
| `TRANSFERENCIA` | Between accounts | ✅ Both | ❌ Neutral |
| `PAGO_TARJETA` | Credit card payment | ✅ Subtract | ✅ Expense |
| `GASTO_TARJETA` | Card purchase | ❌ No (affects card) | ✅ Expense |
| `PAGO_DEUDA` | Debt payment | ✅ Subtract | ✅ Expense |
| `INVERSION` | Investment | ✅ Subtract | ✅ Expense |
| `RETORNO_INVERSION` | Investment return | ✅ Add | ✅ Income |
| `AJUSTE` | Balance adjustment | ✅ Add/Subtract | ❌ Neutral |
| `INGRESO_INICIAL` | Initial balance | ✅ Add | ❌ Neutral |

---

## Error Codes

| Status | Error | Scenario |
|--------|-------|----------|
| 400 | Datos inválidos | Schema validation failed |
| 400 | Saldo insuficiente | Not enough balance for expense/transfer |
| 400 | Cuenta inactiva | Trying to use inactive account |
| 400 | No hay tasa de conversión | Missing exchange rate for multi-currency |
| 400 | Misma cuenta | Transfer origin = destination |
| 400 | No se puede eliminar | Trying to delete protected movement |
| 404 | Movimiento no encontrado | Movement doesn't exist |
| 404 | Cuenta no encontrada | Account doesn't exist |
| 500 | Error interno | Server error |

---

## Integration with QuickAdd Component

The `/api/movements/quick` endpoint is specifically optimized for the QuickAdd component:

1. **Auto account selection**: Uses last used account
2. **Minimal fields**: Only tipo, monto required
3. **Fast validation**: Streamlined error messages
4. **Default descriptions**: Auto-generated if not provided
5. **Target**: < 200ms response time

**Frontend Integration:**
```typescript
const handleQuickAdd = async (data: QuickAddData) => {
  const response = await fetch('/api/movements/quick', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
};
```

---

## Testing Workflow

1. **Create test accounts** with initial balance
2. **Add income** to verify balance increases
3. **Add expense** to verify balance decreases and validation
4. **Try expense** with insufficient balance (should fail)
5. **Create transfer** between accounts
6. **Filter movements** by date range and type
7. **Get statistics** for a month
8. **Delete movement** and verify balance reversal
9. **Test quick add** without cuenta_id (uses last used)

---

## Next Steps

- [ ] Add JWT authentication middleware
- [ ] Implement rate limiting
- [ ] Add movement editing (requires reversal + new creation)
- [ ] Add bulk import from CSV
- [ ] Add recurring movements
- [ ] Optimize query performance with indexes
- [ ] Add caching for frequent queries
- [ ] Create integration tests
