# Accounts API Documentation

## Authentication

For now, pass the user ID in the `x-user-id` header:

```bash
-H "x-user-id: your-user-id-here"
```

> **TODO**: This will be replaced with JWT authentication using Supabase Auth.

---

## Endpoints

### 1. Get All Accounts

**GET** `/api/cuentas`

Get all accounts for the authenticated user.

**Query Parameters:**
- `activa` (optional): Filter by active status (`true` or `false`)
- `tipo` (optional): Filter by account type (`BANCO`, `BILLETERA`, `BROKER`, `EFECTIVO`)

**Example:**
```bash
curl -X GET "http://localhost:3001/api/cuentas?activa=true" \
  -H "x-user-id: user-123"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nombre": "Cuenta Corriente",
      "tipo": "BANCO",
      "moneda": "ARS",
      "saldo_actual": "15000.50",
      "activa": true,
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z",
      "_count": {
        "movimientos": 42
      }
    }
  ],
  "count": 1
}
```

---

### 2. Get Account by ID

**GET** `/api/cuentas/:id`

Get details of a specific account.

**Example:**
```bash
curl -X GET "http://localhost:3001/api/cuentas/account-uuid" \
  -H "x-user-id: user-123"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nombre": "Cuenta Corriente",
    "tipo": "BANCO",
    "moneda": "ARS",
    "saldo_actual": "15000.50",
    "activa": true,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z",
    "_count": {
      "movimientos": 42,
      "tarjetas": 2
    }
  }
}
```

---

### 3. Get Account Summary

**GET** `/api/cuentas/:id/resumen`

Get account summary with calculated balance and movement breakdown.

**Example:**
```bash
curl -X GET "http://localhost:3001/api/cuentas/account-uuid/resumen" \
  -H "x-user-id: user-123"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nombre": "Cuenta Corriente",
    "saldo_actual": "15000.50",
    "balance_calculado": 15000.50,
    "movimientos_por_tipo": [
      {
        "tipo": "INGRESO",
        "_sum": { "monto": "25000.00" },
        "_count": 5
      },
      {
        "tipo": "GASTO",
        "_sum": { "monto": "10000.00" },
        "_count": 20
      }
    ]
  }
}
```

---

### 4. Create Account (CU-001)

**POST** `/api/cuentas`

Create a new account with optional initial balance.

**Request Body:**
```json
{
  "nombre": "Cuenta Corriente",
  "tipo": "BANCO",
  "moneda": "ARS",
  "saldo_inicial": 10000.50,
  "activa": true
}
```

**Field Validations:**
- `nombre`: Required, 1-100 characters
- `tipo`: Required, one of: `BANCO`, `BILLETERA`, `BROKER`, `EFECTIVO`
- `moneda`: Required, one of: `ARS`, `USD`, `EUR`, `BRL`, `CLP`, `UYU`
- `saldo_inicial`: Optional, >= 0 (default: 0)
- `activa`: Optional, boolean (default: true)

**Example:**
```bash
curl -X POST "http://localhost:3001/api/cuentas" \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "nombre": "Cuenta Corriente",
    "tipo": "BANCO",
    "moneda": "ARS",
    "saldo_inicial": 10000.50
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Cuenta creada exitosamente",
  "data": {
    "id": "uuid",
    "nombre": "Cuenta Corriente",
    "tipo": "BANCO",
    "moneda": "ARS",
    "saldo_actual": "10000.50",
    "activa": true,
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

> **Note:** If `saldo_inicial > 0`, an `INGRESO_INICIAL` movement is automatically created.

---

### 5. Update Account (CU-002)

**PUT** `/api/cuentas/:id`

Update account details. Currency cannot be changed if the account has movements.

**Request Body:**
```json
{
  "nombre": "Nueva Cuenta Principal",
  "activa": false
}
```

**Field Validations:**
- `nombre`: Optional, 1-100 characters
- `activa`: Optional, boolean

**Example:**
```bash
curl -X PUT "http://localhost:3001/api/cuentas/account-uuid" \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "nombre": "Cuenta Ahorro",
    "activa": true
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Cuenta actualizada exitosamente",
  "data": {
    "id": "uuid",
    "nombre": "Cuenta Ahorro",
    "activa": true,
    "updated_at": "2024-01-15T11:00:00Z"
  }
}
```

---

### 6. Delete Account (CU-003)

**DELETE** `/api/cuentas/:id`

Delete an account. Can only delete if:
- No movements exist
- No destination movements exist
- No associated cards exist

If an account has movements, deactivate it instead using the update endpoint.

**Example:**
```bash
curl -X DELETE "http://localhost:3001/api/cuentas/account-uuid" \
  -H "x-user-id: user-123"
```

**Success Response:**
```json
{
  "success": true,
  "message": "Cuenta eliminada exitosamente"
}
```

**Error Response (has movements):**
```json
{
  "success": false,
  "error": "No se puede eliminar una cuenta con movimientos o tarjetas asociadas. Desactívala en su lugar."
}
```

---

### 7. Adjust Account Balance

**POST** `/api/cuentas/:id/ajustar`

Adjust account balance to match a desired value. Creates an `AJUSTE` movement to reconcile differences.

**Request Body:**
```json
{
  "nuevo_saldo": 15000.00,
  "descripcion": "Ajuste por conciliación bancaria"
}
```

**Field Validations:**
- `nuevo_saldo`: Required, >= 0
- `descripcion`: Required, 1-200 characters

**Example:**
```bash
curl -X POST "http://localhost:3001/api/cuentas/account-uuid/ajustar" \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "nuevo_saldo": 15000.00,
    "descripcion": "Ajuste por conciliación bancaria"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Saldo ajustado exitosamente",
  "data": {
    "id": "uuid",
    "saldo_actual": "15000.00",
    "updated_at": "2024-01-15T12:00:00Z"
  }
}
```

> **Note:** The adjustment amount is automatically calculated as `nuevo_saldo - saldo_actual` and recorded in the movement description.

---

## Business Rules Implemented

### RN-001: Account Balance Calculation

Balance is calculated from all movements:

```
saldo_actual = saldo_inicial
  + SUM(ingresos)
  + SUM(retornos_inversion)
  - SUM(gastos)
  - SUM(pagos_tarjeta)
  - SUM(pagos_deuda)
  - SUM(inversiones)
  - SUM(transferencias_salida)
  + SUM(transferencias_entrada)
  + SUM(ajustes)
```

The balance is verified on each read operation and logged if discrepancies are found.

---

## Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Datos inválidos | Request body failed validation |
| 404 | Cuenta no encontrada | Account doesn't exist or doesn't belong to user |
| 400 | No se puede eliminar | Account has movements/cards (deactivate instead) |
| 400 | cuenta inactiva | Cannot adjust balance of inactive account |
| 500 | Error interno | Server error |

---

## Testing Workflow

1. **Create a user** (manually insert into `usuarios` table for now)
2. **Create an account** with initial balance
3. **Get all accounts** to verify creation
4. **Get account summary** to see balance calculation
5. **Update account** name or status
6. **Adjust balance** to reconcile with bank statement
7. **Try to delete** (will fail if has movements)
8. **Deactivate instead** of deleting

---

## Next Steps

- [ ] Implement JWT authentication middleware
- [ ] Add rate limiting
- [ ] Add request logging
- [ ] Create integration tests
- [ ] Add pagination for accounts list
- [ ] Add account statistics endpoint
