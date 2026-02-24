# Especificación Técnica - Freya Balans

## 1. Visión General

### 1.1 Propósito
**Freya Balans** es una aplicación web de gestión financiera personal que permite trackear de manera completa y coherente todos los movimientos de dinero, incluyendo cuentas bancarias, billeteras virtuales, tarjetas de crédito, deudas, inversiones y pagos recurrentes. A diferencia de soluciones existentes, todos los movimientos de dinero (incluyendo pagos de tarjetas y deudas) se registran como transacciones trazables que impactan en el balance mensual.

**Freya Balans** es parte del ecosistema **Freya**, un sistema personal integral para gestión de vida (tareas, proyectos, finanzas, agenda, objetivos). El nombre "Balans" proviene del nórdico (noruego/sueco) y significa "balance", reflejando la misión central de la app: mantener un balance completo y trazable de tus finanzas.

### 1.2 Principios de Diseño
- **Trazabilidad completa**: Todo movimiento de dinero queda registrado y es auditable
- **Multi-cuenta y multi-moneda**: Soporte para múltiples bancos, billeteras, brokers y monedas
- **Gestión de compromisos futuros**: Visualización clara de cuotas pendientes y pagos recurrentes
- **Presupuestos informativos**: Referencias no limitantes para control de gastos
- **Insights con IA**: Análisis y consejos automatizados sobre finanzas personales
- **🎯 UX Minimalista y Ágil**: Interfaz limpia y rápida, optimizada para carga veloz de movimientos

### 1.3 Alcance Inicial (MVP)
- Gestión manual de cuentas y movimientos
- Tarjetas de crédito con cuotas
- Deudas y pagos
- Inversiones básicas (monto invertido)
- Presupuestos por categoría
- Conversión de monedas configurable
- Insights básicos con IA
- **Interfaz web minimalista y responsive** (desktop + mobile)
- **Quick-add**: Registro ultra-rápido de gastos/ingresos

### 1.4 Fuera de Alcance (Fase 1)
- Sincronización automática con bancos
- Valorización en tiempo real de inversiones
- Gráficos y visualizaciones avanzadas (mantener visualización numérica simple)
- App móvil nativa

---

## 2. Casos de Uso

### 2.1 Gestión de Cuentas

#### CU-001: Crear Cuenta
**Actor**: Usuario  
**Precondición**: Usuario autenticado  
**Flujo Principal**:
1. Usuario selecciona "Nueva Cuenta"
2. Sistema solicita datos:
   - Nombre de la cuenta
   - Tipo (Banco, Billetera Virtual, Broker, Efectivo)
   - Moneda
   - Saldo inicial
   - Fecha de inicio del tracking
3. Usuario ingresa datos y confirma
4. Sistema crea la cuenta y registra el saldo inicial como movimiento de "Ingreso Inicial"

**Postcondición**: Cuenta creada y disponible para operaciones

#### CU-002: Editar Cuenta
**Actor**: Usuario  
**Precondición**: Cuenta existe  
**Flujo Principal**:
1. Usuario selecciona cuenta y "Editar"
2. Sistema permite modificar: nombre, tipo (solo si no tiene movimientos)
3. Usuario modifica y confirma
4. Sistema actualiza datos

**Regla de Negocio**: No se puede cambiar la moneda de una cuenta con movimientos

#### CU-003: Ajustar Saldo de Cuenta
**Actor**: Usuario  
**Precondición**: Cuenta existe  
**Descripción**: Cuando el saldo calculado no coincide con el saldo real (ej: diferencias bancarias)  
**Flujo Principal**:
1. Usuario selecciona "Ajustar Saldo"
2. Sistema muestra saldo actual calculado
3. Usuario ingresa saldo real
4. Sistema calcula diferencia y crea movimiento de "Ajuste" con la diferencia
5. Saldo queda reconciliado

---

### 2.2 Gestión de Tarjetas de Crédito

#### CU-004: Crear Tarjeta
**Actor**: Usuario  
**Precondición**: Al menos una cuenta bancaria/billetera existe  
**Flujo Principal**:
1. Usuario selecciona "Nueva Tarjeta"
2. Sistema solicita datos:
   - Nombre/Alias
   - Tipo (Visa, Mastercard, Otra)
   - Cuenta asociada (para vincular pagos)
   - Límite de crédito
   - Moneda
   - Día de cierre
   - Día de vencimiento
3. Usuario ingresa datos y confirma
4. Sistema crea tarjeta con límite disponible = límite total

**Postcondición**: Tarjeta creada y disponible para registrar compras

#### CU-005: Registrar Compra en Tarjeta
**Actor**: Usuario  
**Precondición**: Tarjeta existe  
**Flujo Principal**:
1. Usuario selecciona "Nueva Compra en Tarjeta"
2. Sistema solicita:
   - Tarjeta
   - Descripción
   - Monto total
   - Cantidad de cuotas (default: 1)
   - Categoría
   - Fecha de compra
3. Usuario ingresa datos y confirma
4. Sistema:
   - Crea movimiento de tipo "Gasto en Tarjeta"
   - Reduce límite disponible por monto total
   - Crea compromisos futuros (cuotas) en el calendario
   - Suma primera cuota al saldo a pagar del período actual

**Postcondición**: 
- Compra registrada
- Límite comprometido
- Cuotas programadas

**Ejemplo**:
- Compra: $3,000 en 3 cuotas
- Límite antes: $10,000 disponible
- Límite después: $7,000 disponible ($3,000 comprometidos)
- Saldo a pagar este mes: +$1,000
- Cuotas pendientes: $1,000 (mes 2) y $1,000 (mes 3)

#### CU-006: Pagar Resumen de Tarjeta
**Actor**: Usuario  
**Precondición**: Tarjeta con saldo a pagar > 0, cuenta con saldo suficiente  
**Flujo Principal**:
1. Usuario selecciona "Pagar Tarjeta"
2. Sistema muestra:
   - Saldo a pagar del período
   - Cuenta asociada y su saldo
3. Usuario ingresa:
   - Monto a pagar (puede ser parcial)
   - Cuenta de origen (si quiere usar otra)
   - Fecha de pago
4. Sistema valida saldo suficiente
5. Usuario confirma
6. Sistema:
   - Crea movimiento "Pago de Tarjeta" (egreso de cuenta)
   - Reduce saldo de la cuenta origen
   - Reduce saldo a pagar de la tarjeta
   - Libera límite de la tarjeta por el monto pagado
   - Marca cuotas como pagadas (de las más antiguas a las más nuevas)

**Postcondición**:
- Cuenta reducida
- Tarjeta con menos deuda
- Límite liberado
- Movimiento registrado

**Ejemplo Continuado**:
- Usuario paga $1,000 (primera cuota)
- Cuenta bancaria: -$1,000
- Saldo a pagar tarjeta: $0
- Límite disponible: $8,000 ($2,000 aún comprometidos por cuotas futuras)

#### CU-007: Modificar Límite de Tarjeta
**Actor**: Usuario  
**Precondición**: Tarjeta existe  
**Flujo Principal**:
1. Usuario selecciona "Editar Límite"
2. Sistema muestra límite actual, comprometido y disponible
3. Usuario ingresa nuevo límite
4. Sistema valida que nuevo límite >= monto comprometido
5. Usuario confirma
6. Sistema actualiza límite y recalcula disponible

---

### 2.3 Gestión de Movimientos

#### CU-008: Registrar Ingreso (Quick Add)
**Actor**: Usuario  
**Precondición**: Al menos una cuenta existe  
**Flujo Principal** (Optimizado para velocidad):
1. Usuario hace click en botón flotante "+"
2. Sistema muestra modal minimalista:
   - Tipo: [Ingreso] [Gasto] (toggle rápido)
   - Monto (enfocado automáticamente)
   - Cuenta (última usada pre-seleccionada)
   - Categoría (últimas usadas como quick-select)
   - Descripción (opcional)
3. Usuario ingresa solo monto y toca Enter/Confirmar
4. Sistema crea movimiento con defaults inteligentes

**Tiempo objetivo**: < 5 segundos

#### CU-009: Registrar Gasto (Quick Add)
**Actor**: Usuario  
**Precondición**: Al menos una cuenta existe  
**Flujo Principal** (Optimizado para velocidad):
1. Usuario hace click en botón flotante "+" o "-"
2. Sistema muestra modal ultra-minimalista:
   - Monto (auto-focus)
   - Categoría (pills de categorías frecuentes + "Otra")
   - Cuenta (default: última usada)
3. Usuario: monto → categoría → Enter
4. Sistema:
   - Crea movimiento tipo "Gasto"
   - Reduce saldo de la cuenta
   - Impacta en presupuesto de la categoría (si existe)
   - Muestra feedback visual inmediato

**Tiempo objetivo**: < 5 segundos  
**Acciones de teclado**: Monto → Tab → Categoría (primera letra) → Enter

#### CU-010: Registrar Transferencia entre Cuentas
**Actor**: Usuario  
**Precondición**: Al menos dos cuentas existen  
**Flujo Principal**:
1. Usuario selecciona "Transferencia"
2. Sistema solicita:
   - Cuenta origen
   - Cuenta destino
   - Monto (en moneda de origen)
   - Fecha
   - Tasa de conversión (si las monedas difieren)
3. Usuario confirma
4. Sistema:
   - Crea movimiento tipo "Transferencia" (vinculado)
   - Reduce saldo cuenta origen
   - Incrementa saldo cuenta destino (convirtiendo si es necesario)

**Regla**: Las transferencias no impactan en balance mensual (son movimientos internos)

#### CU-011: Registrar Inversión
**Actor**: Usuario  
**Precondición**: Cuenta existe (o se marca como externo)  
**Flujo Principal**:
1. Usuario selecciona "Nueva Inversión"
2. Sistema solicita:
   - Tipo (Plazo Fijo, Bonos, Acciones, Crypto, Otro)
   - Monto invertido
   - Cuenta origen (o "Ingreso Externo")
   - Moneda
   - Fecha
   - Descripción/Ticker
3. Usuario confirma
4. Sistema:
   - Si es desde cuenta: reduce saldo y crea movimiento "Inversión"
   - Si es externo: solo registra la inversión sin afectar cuentas
   - Suma al total invertido

#### CU-012: Registrar Retorno de Inversión
**Actor**: Usuario  
**Precondición**: Inversión existe  
**Flujo Principal**:
1. Usuario selecciona inversión y "Registrar Retorno"
2. Sistema solicita:
   - Monto recuperado
   - Cuenta destino
   - Fecha
3. Usuario confirma
4. Sistema:
   - Crea movimiento "Retorno de Inversión" (ingreso)
   - Incrementa saldo cuenta destino
   - Actualiza estado de la inversión (parcial/total)

---

### 2.4 Gestión de Deudas

#### CU-013: Registrar Deuda
**Actor**: Usuario  
**Flujo Principal**:
1. Usuario selecciona "Nueva Deuda"
2. Sistema solicita:
   - Tipo (Personal, Crédito Billetera, Préstamo, Otro)
   - Acreedor/Descripción
   - Monto total
   - Moneda
   - Fecha de inicio
   - Cantidad de cuotas (opcional)
   - Monto por cuota (opcional)
3. Usuario confirma
4. Sistema:
   - Crea registro de deuda
   - Si tiene cuotas: genera compromisos futuros

#### CU-014: Registrar Pago de Deuda
**Actor**: Usuario  
**Precondición**: Deuda existe, cuenta con saldo  
**Flujo Principal**:
1. Usuario selecciona deuda y "Pagar"
2. Sistema muestra saldo pendiente
3. Usuario ingresa:
   - Monto a pagar
   - Cuenta origen
   - Fecha
4. Usuario confirma
5. Sistema:
   - Crea movimiento "Pago de Deuda"
   - Reduce saldo de cuenta
   - Reduce saldo pendiente de deuda
   - Marca cuotas como pagadas (si aplica)

---

### 2.5 Presupuestos

#### CU-015: Crear Presupuesto
**Actor**: Usuario  
**Flujo Principal**:
1. Usuario selecciona "Nuevo Presupuesto"
2. Sistema solicita:
   - Categoría de gasto
   - Monto límite
   - Período (Mensual, Anual)
   - Moneda
3. Usuario confirma
4. Sistema crea presupuesto

#### CU-016: Visualizar Estado de Presupuestos
**Actor**: Usuario  
**Flujo Principal**:
1. Usuario accede a sección "Presupuestos"
2. Sistema muestra por cada presupuesto:
   - Categoría
   - Monto gastado / Monto límite
   - % utilizado
   - Alerta visual si está cerca o excedido (ej: >80% amarillo, >100% rojo)

**Regla**: Los presupuestos son informativos, no bloquean gastos

---

### 2.6 Configuración de Monedas

#### CU-017: Configurar Tipos de Cambio
**Actor**: Usuario  
**Flujo Principal**:
1. Usuario accede a "Configuración de Monedas"
2. Sistema muestra monedas activas (ARS, USD, EUR)
3. Usuario puede:
   - Ver tasas actuales
   - Actualizar manualmente tasa de cambio
   - (Futuro: conectar con API)
4. Sistema guarda configuración

**Regla**: Todas las conversiones usan la tasa configurada al momento de la operación

---

### 2.7 Balance e Insights

#### CU-018: Ver Balance Mensual
**Actor**: Usuario  
**Flujo Principal**:
1. Usuario selecciona período (mes/año)
2. Sistema muestra:
   - Total ingresos
   - Total gastos (incluye pagos de tarjeta y deudas)
   - Diferencia (ahorro/déficit)
   - Desglose por categoría
   - Movimientos del período

**Regla**: Los pagos de tarjeta y deudas SÍ cuentan como gastos del período

#### CU-019: Ver Dashboard General
**Actor**: Usuario  
**Flujo Principal**:
1. Usuario accede al dashboard
2. Sistema muestra:
   - Saldo total en cuentas (convertido a moneda principal)
   - Deudas totales
   - Límites de tarjetas (disponible vs comprometido)
   - Presupuestos del mes actual
   - Próximos compromisos/cuotas
   - Insights de IA (si están disponibles)

#### CU-020: Obtener Insights de IA
**Actor**: Usuario  
**Precondición**: Suficiente historial de movimientos  
**Flujo Principal**:
1. Usuario solicita "Generar Insights"
2. Sistema envía datos agregados a servicio de IA
3. IA analiza y retorna:
   - Patrones de gasto identificados
   - Comparación mes actual vs anteriores
   - Sugerencias de ahorro
   - Alertas sobre gastos inusuales
   - Proyección de saldo futuro
4. Sistema muestra insights en dashboard

---

## 3. Modelo de Datos

### 3.1 Entidades Principales

#### Usuario
```
Usuario {
  id: UUID
  email: String (único)
  nombre: String
  moneda_principal: String (ARS, USD, EUR)
  created_at: DateTime
  updated_at: DateTime
}
```

#### Cuenta
```
Cuenta {
  id: UUID
  usuario_id: UUID (FK)
  nombre: String
  tipo: Enum (BANCO, BILLETERA, BROKER, EFECTIVO)
  moneda: String
  saldo_actual: Decimal (calculado)
  activa: Boolean
  created_at: DateTime
  updated_at: DateTime
}
```

**Reglas de Negocio**:
- `saldo_actual` se calcula en base a movimientos, no se actualiza manualmente (excepto ajustes)
- Una cuenta inactiva no permite nuevos movimientos

#### Tarjeta
```
Tarjeta {
  id: UUID
  usuario_id: UUID (FK)
  cuenta_id: UUID (FK) // cuenta asociada para pagos
  nombre: String
  tipo: Enum (VISA, MASTERCARD, OTRA)
  limite_total: Decimal
  limite_comprometido: Decimal (calculado)
  limite_disponible: Decimal (calculado = total - comprometido)
  moneda: String
  dia_cierre: Integer (1-31)
  dia_vencimiento: Integer (1-31)
  activa: Boolean
  created_at: DateTime
  updated_at: DateTime
}
```

**Reglas de Negocio**:
- `limite_comprometido` = suma de montos totales de compras en cuotas aún no totalmente pagadas
- `limite_disponible` = `limite_total` - `limite_comprometido`
- `saldo_a_pagar_actual` se calcula desde cuotas vencidas en período actual

#### Movimiento
```
Movimiento {
  id: UUID
  usuario_id: UUID (FK)
  tipo: Enum (
    INGRESO, 
    GASTO, 
    TRANSFERENCIA, 
    PAGO_TARJETA, 
    GASTO_TARJETA,
    PAGO_DEUDA, 
    INVERSION, 
    RETORNO_INVERSION,
    AJUSTE,
    INGRESO_INICIAL
  )
  cuenta_id: UUID (FK) // cuenta afectada
  cuenta_destino_id: UUID (FK, nullable) // para transferencias
  tarjeta_id: UUID (FK, nullable) // si es gasto/pago de tarjeta
  deuda_id: UUID (FK, nullable) // si es pago de deuda
  monto: Decimal
  moneda: String
  descripcion: String
  categoria: String (nullable)
  fecha: Date
  tasa_conversion: Decimal (nullable) // si hubo conversión
  movimiento_relacionado_id: UUID (FK, nullable) // para vincular transferencias
  created_at: DateTime
}
```

**Reglas de Negocio**:
- Cada movimiento afecta el saldo de exactamente una cuenta (excepto transferencias que crean dos movimientos vinculados)
- Los movimientos de tipo TRANSFERENCIA no afectan el balance mensual
- Los movimientos de tipo PAGO_TARJETA y PAGO_DEUDA SÍ cuentan como gastos en el balance mensual

#### CompraEnCuotas
```
CompraEnCuotas {
  id: UUID
  usuario_id: UUID (FK)
  tarjeta_id: UUID (FK)
  movimiento_id: UUID (FK) // movimiento de GASTO_TARJETA
  descripcion: String
  monto_total: Decimal
  cantidad_cuotas: Integer
  monto_por_cuota: Decimal
  cuotas_pagadas: Integer
  fecha_compra: Date
  categoria: String
  created_at: DateTime
}
```

#### Cuota
```
Cuota {
  id: UUID
  compra_id: UUID (FK)
  numero_cuota: Integer
  monto: Decimal
  fecha_vencimiento: Date
  pagada: Boolean
  fecha_pago: Date (nullable)
  created_at: DateTime
}
```

**Reglas de Negocio**:
- Las cuotas se crean automáticamente al registrar una CompraEnCuotas
- Al pagar el resumen de una tarjeta, se marcan cuotas como pagadas en orden cronológico

#### Deuda
```
Deuda {
  id: UUID
  usuario_id: UUID (FK)
  tipo: Enum (PERSONAL, CREDITO_BILLETERA, PRESTAMO, OTRO)
  acreedor: String
  monto_total: Decimal
  monto_pendiente: Decimal
  moneda: String
  fecha_inicio: Date
  cantidad_cuotas: Integer (nullable)
  monto_cuota: Decimal (nullable)
  saldada: Boolean
  created_at: DateTime
  updated_at: DateTime
}
```

#### PagoDeuda
```
PagoDeuda {
  id: UUID
  deuda_id: UUID (FK)
  movimiento_id: UUID (FK)
  monto: Decimal
  fecha: Date
  created_at: DateTime
}
```

#### Inversion
```
Inversion {
  id: UUID
  usuario_id: UUID (FK)
  tipo: Enum (PLAZO_FIJO, BONOS, ACCIONES, CRYPTO, OTRO)
  descripcion: String // ticker o descripción
  monto_invertido: Decimal
  monto_recuperado: Decimal (default 0)
  moneda: String
  fecha_inicio: Date
  cuenta_origen_id: UUID (FK, nullable) // null si es ingreso externo
  estado: Enum (ACTIVA, PARCIALMENTE_RECUPERADA, FINALIZADA)
  created_at: DateTime
  updated_at: DateTime
}
```

#### Presupuesto
```
Presupuesto {
  id: UUID
  usuario_id: UUID (FK)
  categoria: String
  monto_limite: Decimal
  periodo: Enum (MENSUAL, ANUAL)
  moneda: String
  activo: Boolean
  created_at: DateTime
  updated_at: DateTime
}
```

#### ConfiguracionMoneda
```
ConfiguracionMoneda {
  id: UUID
  usuario_id: UUID (FK)
  moneda: String (ARS, USD, EUR)
  tasa_a_principal: Decimal // tasa de conversión a la moneda principal del usuario
  fecha_actualizacion: DateTime
  created_at: DateTime
  updated_at: DateTime
}
```

---

### 3.2 Relaciones

```
Usuario 1 ---> N Cuenta
Usuario 1 ---> N Tarjeta
Usuario 1 ---> N Movimiento
Usuario 1 ---> N Deuda
Usuario 1 ---> N Inversion
Usuario 1 ---> N Presupuesto
Usuario 1 ---> N ConfiguracionMoneda

Tarjeta N ---> 1 Cuenta (asociada)
Tarjeta 1 ---> N CompraEnCuotas
CompraEnCuotas 1 ---> N Cuota
CompraEnCuotas 1 ---> 1 Movimiento

Deuda 1 ---> N PagoDeuda
PagoDeuda 1 ---> 1 Movimiento

Movimiento N ---> 1 Cuenta (origen)
Movimiento N ---> 1 Cuenta (destino, opcional)
Movimiento N ---> 1 Tarjeta (opcional)
Movimiento N ---> 1 Deuda (opcional)
```

---

## 4. Reglas de Negocio Críticas

### 4.1 Integridad de Saldos

**RN-001: Cálculo de Saldo de Cuenta**
```
saldo_actual(cuenta) = 
  saldo_inicial +
  SUM(ingresos) +
  SUM(retornos_inversion) -
  SUM(gastos) -
  SUM(pagos_tarjeta) -
  SUM(pagos_deuda) -
  SUM(inversiones) -
  SUM(transferencias_salida) +
  SUM(transferencias_entrada) +
  SUM(ajustes)
```

**RN-002: Límite de Tarjeta**
```
limite_comprometido(tarjeta) = 
  SUM(compras_en_cuotas.monto_total WHERE cuotas_pagadas < cantidad_cuotas)

limite_disponible(tarjeta) = 
  limite_total - limite_comprometido
```

**RN-003: Saldo a Pagar de Tarjeta (Período Actual)**
```
saldo_a_pagar(tarjeta, periodo) = 
  SUM(cuotas.monto WHERE 
    cuota.fecha_vencimiento <= fin_periodo AND
    cuota.pagada = false
  )
```

### 4.2 Flujo de Compra en Cuotas

**RN-004: Registro de Compra en Cuotas**
Cuando se registra una compra:
1. Se crea un Movimiento de tipo GASTO_TARJETA con el monto total
2. Se crea una CompraEnCuotas
3. Se crean N Cuotas con fechas de vencimiento mensuales
4. Se incrementa `limite_comprometido` de la tarjeta por `monto_total`
5. La primera cuota se suma al saldo a pagar del período actual

**RN-005: Pago de Tarjeta**
Cuando se paga una tarjeta:
1. Se crea un Movimiento de tipo PAGO_TARJETA
2. Se reduce el saldo de la cuenta origen
3. Se marcan cuotas como pagadas (de más antigua a más nueva) hasta agotar el monto
4. Se reduce `limite_comprometido` por el monto de cuotas completamente pagadas
5. Si una compra se pagó completamente, `limite_comprometido -= monto_total_compra`

**Ejemplo**:
- Compra: $3,000 en 3 cuotas de $1,000
- Límite comprometido: +$3,000
- Pago 1 ($1,000): marca cuota 1 como pagada, libera $1,000 del límite
- Pago 2 ($1,000): marca cuota 2 como pagada, libera $1,000 del límite
- Pago 3 ($1,000): marca cuota 3 como pagada, libera $1,000 del límite

### 4.3 Balance Mensual

**RN-006: Cálculo de Balance Mensual**
```
ingresos_mes = SUM(movimientos WHERE 
  tipo IN (INGRESO, RETORNO_INVERSION) AND
  fecha IN periodo
)

gastos_mes = SUM(movimientos WHERE 
  tipo IN (GASTO, GASTO_TARJETA, PAGO_TARJETA, PAGO_DEUDA, INVERSION) AND
  fecha IN periodo
)

balance_mes = ingresos_mes - gastos_mes
```

**Regla**: Las transferencias entre cuentas NO cuentan en el balance mensual

### 4.4 Conversión de Monedas

**RN-007: Conversión en Operaciones**
Cuando se realiza una operación entre cuentas de diferentes monedas:
1. Se usa la tasa de conversión configurada al momento de la operación
2. La tasa se guarda en el movimiento para auditoría
3. Para reportes consolidados, se usa la tasa más reciente configurada

---

## 5. Arquitectura Técnica

### 5.1 Stack Tecnológico

**Frontend**:
- Framework: **React + TypeScript**
- Build Tool: **Vite** (rápido, moderno)
- Styling: **Tailwind CSS** (para UI minimalista y consistente)
- State Management: **Zustand** (ligero, simple)
- Forms: **React Hook Form + Zod** (validación robusta)
- Responsive: **Mobile-first design**

**Backend**:
- Runtime: **Node.js**
- Framework: **Express** o **Fastify**
- ORM: **Prisma** (con Supabase PostgreSQL)
- Validación: **Zod**
- Auth: **Supabase Auth** (integrado)

**Base de Datos**:
- **Supabase (PostgreSQL)**
- ✅ Ya existe una instancia de Supabase con tabla de productos (lista de compras)
- La app extenderá esta BD agregando las tablas de Freya Balans
- Row Level Security (RLS) para seguridad por usuario
- Supabase Client para operaciones en tiempo real (opcional)

**IA/Insights**:
- **Anthropic Claude API** (para generar insights)

**Hosting**:
- Frontend: **Vercel** (deployment automático, edge functions)
- Backend: **Vercel Serverless Functions** o **Railway**
- DB: **Supabase** (existente)

### 5.2 Integración con Supabase

**Configuración**:
```typescript
// .env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ... // solo backend

// Prisma Schema
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL") // Supabase connection string
}
```

**Migración de Esquema**:
1. Prisma genera migraciones basadas en el schema
2. Las migraciones se aplican a la BD de Supabase
3. La tabla de `productos` existente permanece intacta
4. Nuevas tablas: `Usuario`, `Cuenta`, `Tarjeta`, `Movimiento`, etc.

**Autenticación**:
- Usar **Supabase Auth** (ya viene integrado)
- JWT tokens manejados por Supabase
- Row Level Security (RLS) en PostgreSQL para aislar datos por usuario

**Ventajas de Supabase**:
- PostgreSQL robusto y escalable
- Auth integrado (sign up, login, OAuth)
- Real-time subscriptions (para features futuras)
- Dashboard para gestión de BD
- Backups automáticos

### 5.3 Arquitectura de Capas

```
┌─────────────────────────────────────┐
│         Frontend (React)            │
│  - Components (minimalistas)        │
│  - Pages                            │
│  - Hooks (custom + React Query)     │
│  - Supabase Client                  │
└─────────────────────────────────────┘
              ↓ HTTP/REST + Supabase SDK
┌─────────────────────────────────────┐
│      API Layer (Express)            │
│  - Routes                           │
│  - Middlewares (auth via Supabase)  │
│  - Controllers                      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      Business Logic Layer           │
│  - Services                         │
│  - Domain Logic                     │
│  - Calculations                     │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      Data Access Layer (Prisma)     │
│  - Repositories                     │
│  - Database Queries                 │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│    Supabase PostgreSQL Database     │
│  - Tablas de Freya Balans           │
│  - Tabla de productos (existente)   │
│  - Row Level Security (RLS)         │
└─────────────────────────────────────┘
```

### 5.4 Endpoints Principales (REST API)

#### Autenticación (Supabase)
```
POST   /auth/signup    // via Supabase Auth
POST   /auth/login     // via Supabase Auth
POST   /auth/logout    // via Supabase Auth
GET    /auth/me        // obtener usuario actual
```

#### Cuentas
```
GET    /api/cuentas
POST   /api/cuentas
GET    /api/cuentas/:id
PUT    /api/cuentas/:id
DELETE /api/cuentas/:id
POST   /api/cuentas/:id/ajustar
```

#### Tarjetas
```
GET    /api/tarjetas
POST   /api/tarjetas
GET    /api/tarjetas/:id
PUT    /api/tarjetas/:id
DELETE /api/tarjetas/:id
GET    /api/tarjetas/:id/cuotas-pendientes
GET    /api/tarjetas/:id/saldo-a-pagar
```

#### Movimientos (Quick Add optimizado)
```
GET    /api/movimientos?desde=2024-01-01&hasta=2024-01-31&tipo=GASTO
POST   /api/movimientos/quick     // endpoint optimizado para quick-add
POST   /api/movimientos/ingreso
POST   /api/movimientos/gasto
POST   /api/movimientos/transferencia
POST   /api/movimientos/compra-tarjeta
POST   /api/movimientos/pago-tarjeta
POST   /api/movimientos/inversion
POST   /api/movimientos/retorno-inversion
DELETE /api/movimientos/:id
```

#### Deudas
```
GET    /api/deudas
POST   /api/deudas
GET    /api/deudas/:id
PUT    /api/deudas/:id
DELETE /api/deudas/:id
POST   /api/deudas/:id/pagar
```

#### Presupuestos
```
GET    /api/presupuestos
POST   /api/presupuestos
PUT    /api/presupuestos/:id
DELETE /api/presupuestos/:id
GET    /api/presupuestos/estado?periodo=2024-01
```

#### Balance & Reportes
```
GET    /api/balance/mensual?periodo=2024-01
GET    /api/balance/anual?year=2024
GET    /api/dashboard
```

#### Configuración
```
GET    /api/config/monedas
PUT    /api/config/monedas/:moneda
GET    /api/config/categorias     // categorías frecuentes del usuario
```

#### IA Insights
```
POST   /api/insights/generar
GET    /api/insights/ultimos
```

### 5.5 Validaciones Críticas

**Validación de Negocio en Backend**:
- Antes de crear un gasto/pago: validar saldo suficiente
- Antes de compra en tarjeta: validar límite disponible
- Antes de cambiar moneda de cuenta: validar que no tenga movimientos
- Al pagar tarjeta/deuda: validar que el monto no exceda la deuda
- Al crear movimiento: validar que la cuenta/tarjeta exista y esté activa

**Transacciones Atómicas**:
- Transferencias: ambos movimientos deben crearse o ninguno
- Pago de tarjeta: movimiento + actualización de cuotas + liberación de límite
- Ajuste de saldo: cálculo + creación de movimiento de ajuste

### 5.6 Seguridad

**Autenticación**: Supabase Auth (JWT tokens)
**Autorización**: Row Level Security (RLS) en Supabase - cada usuario solo ve sus datos
**Validación**: Zod schemas en backend y frontend
**SQL Injection**: Prevenido por Prisma ORM
**XSS**: Sanitización en frontend
**CORS**: Configurado solo para dominio de frontend
**API Keys**: Variables de entorno (`.env`, nunca en código)

---

## 6. Interfaz de Usuario (UX/UI)

### 6.1 Principios de Diseño Minimalista

**Filosofía**: Menos es más. La interfaz debe desaparecer para que el usuario se enfoque en sus finanzas.

**Reglas de Diseño**:
1. **Jerarquía Visual Clara**: Los números (saldos, montos) deben ser lo más prominente
2. **Espacios en Blanco**: Generoso uso de whitespace para respirar
3. **Tipografía Limpia**: Fuente sans-serif moderna (Inter, SF Pro, o similar)
4. **Colores Mínimos**: 
   - Primario: Un solo color de acento (ej: azul nórdico)
   - Semánticos: Verde (positivo), Rojo (negativo), Amarillo (advertencia)
   - Neutrales: Grises para texto y bordes
5. **Sin Decoraciones Innecesarias**: No gradientes, sombras mínimas, bordes sutiles
6. **Iconografía Simple**: Íconos outline, no filled

**Paleta de Colores Sugerida** (inspirada en diseño nórdico):
```
Primario:    #3B82F6 (azul)
Positivo:    #10B981 (verde)
Negativo:    #EF4444 (rojo)
Advertencia: #F59E0B (amarillo)
Fondo:       #FFFFFF (blanco)
Superficie:  #F9FAFB (gris muy claro)
Texto:       #111827 (casi negro)
Texto Sec:   #6B7280 (gris medio)
Borde:       #E5E7EB (gris claro)
```

### 6.2 Quick Add - Registro Ultra-Rápido

**Objetivo**: Registrar un gasto/ingreso en < 5 segundos

**Componente: Botón de Acción Flotante (FAB)**
```
┌────────────────────┐
│                    │
│                    │
│     Dashboard      │
│                    │
│              [+]   │ ← FAB siempre visible
└────────────────────┘
```

**Modal Quick Add** (aparece al click en FAB):
```
┌─────────────────────────────┐
│  Nuevo Movimiento      [x]  │
├─────────────────────────────┤
│                             │
│  [Ingreso] [Gasto] ← toggle │
│                             │
│  $ ___________              │ ← Auto-focus, numpad en mobile
│    Monto                    │
│                             │
│  🍔 Comida  🚗 Transporte   │ ← Pills de categorías frecuentes
│  🏠 Hogar   ➕ Otra         │
│                             │
│  [Cuenta BBVA ▼]            │ ← Default: última usada
│                             │
│  ___________________        │
│  Descripción (opcional)     │
│                             │
│         [Guardar]           │
└─────────────────────────────┘
```

**Flujo Optimizado**:
1. Click FAB → modal abre con monto enfocado
2. Tipear monto en numpad
3. Tap en categoría frecuente (1 click)
4. Enter o tap "Guardar"
5. Toast: "Gasto registrado ✓"

**Shortcuts de Teclado** (desktop):
- `+` : Nuevo ingreso
- `-` : Nuevo gasto
- `Enter` : Guardar
- `Esc` : Cancelar

**Inteligencia**:
- Recuerda última cuenta usada
- Sugiere categorías basadas en historial
- Autocompletar descripciones frecuentes

### 6.3 Estructura de Navegación

**Navegación Principal** (desktop):
```
┌─────────────────────────────────────────────┐
│ [Freya Balans]  Dashboard  Movimientos      │
│                 Cuentas    Tarjetas          │
│                                    [Usuario]│
└─────────────────────────────────────────────┘
```

**Navegación Mobile**:
- Bottom navigation bar con 4 íconos principales
- Hamburger menu para opciones secundarias

**Páginas Principales**:

1. **Dashboard** (/)
   - Saldo total (grande y prominente)
   - Tarjetas resumen (minimalistas)
   - Insights de IA (si disponibles)
   - FAB para quick-add

2. **Movimientos** (/movimientos)
   - Lista cronológica simple
   - Filtros mínimos en top (mes, categoría)
   - Balance del período arriba
   - FAB para quick-add

3. **Cuentas** (/cuentas)
   - Grid de cards de cuentas
   - Saldo grande en cada card
   - Click → detalle + movimientos de esa cuenta

4. **Tarjetas** (/tarjetas)
   - Grid de cards de tarjetas
   - Límite disponible prominente
   - Saldo a pagar del mes
   - Click → detalle + cuotas

5. **Presupuestos** (/presupuestos)
   - Lista simple con barras de progreso
   - Alertas visuales (colores)

6. **Configuración** (/config)
   - Lista simple de opciones
   - Monedas, categorías, preferencias

### 6.4 Componentes UI Minimalistas

**Card de Cuenta**:
```
┌───────────────────────┐
│ BBVA                  │
│                       │
│ $ 150,000            │ ← Grande, bold
│ ARS                  │ ← Pequeño, gris
└───────────────────────┘
```

**Card de Tarjeta**:
```
┌───────────────────────┐
│ Visa BBVA             │
│                       │
│ Disponible            │
│ $ 50,000 / 100,000   │
│                       │
│ A pagar: $ 10,000    │
└───────────────────────┘
```

**Item de Movimiento** (lista):
```
┌────────────────────────────────────┐
│ 15 Ene  Supermercado      -$5,000 │ ← Negativo en rojo
│         Comida · BBVA              │ ← Metadata en gris
├────────────────────────────────────┤
│ 14 Ene  Salario         +$100,000 │ ← Positivo en verde
│         Ingreso · BBVA             │
└────────────────────────────────────┘
```

**Balance Mensual**:
```
┌────────────────────────────────────┐
│          Enero 2025                │
│                                    │
│  Ingresos    +$ 200,000           │ ← Verde
│  Gastos      -$ 180,000           │ ← Rojo
│  ───────────────────────            │
│  Balance     +$ 20,000  ✓         │ ← Verde si positivo
└────────────────────────────────────┘
```

**Presupuesto**:
```
┌────────────────────────────────────┐
│ Comida                             │
│ ████████░░ 80%                     │ ← Amarillo si >80%
│ $ 40,000 / $ 50,000                │
└────────────────────────────────────┘
```

### 6.5 Responsive Design

**Mobile** (< 768px):
- Stack vertical de todo
- FAB en esquina inferior derecha
- Bottom navigation (4 íconos principales)
- Cards a full-width
- Swipe gestures:
  - Swipe left en movimiento → eliminar
  - Swipe right en movimiento → editar
- Numpad optimizado para ingreso de montos

**Tablet** (768px - 1024px):
- Grid de 2 columnas para cards
- Sidebar colapsable
- FAB visible

**Desktop** (> 1024px):
- Sidebar fijo
- Grid de 3 columnas para cards
- FAB en esquina
- Atajos de teclado activos

### 6.6 Feedback y Estados

**Loading**:
- Skeleton loaders minimalistas (no spinners)
- Shimmer effect sutil

**Success**:
- Toast notification en top-right
- Desaparece en 2 segundos
- Verde con checkmark

**Error**:
- Toast notification en top-right
- Rojo con ícono de alerta
- Botón para retry si aplica

**Empty States**:
- Ícono simple + texto
- CTA claro ("Crear primera cuenta")

### 6.7 Animaciones

**Principio**: Movimientos sutiles y rápidos (< 200ms)

**Dónde usar**:
- Transición de modals (fade + slide up)
- Apertura de cards (subtle scale)
- Toast notifications (slide in)
- Loading states (shimmer)

**Dónde NO usar**:
- Cambios de página (instantáneo)
- Updates de números (instantáneo, o contador rápido)

### 6.8 Accesibilidad

- Contraste WCAG AA mínimo
- Tamaños de tap >= 44px (mobile)
- Focus states claros
- Labels semánticos
- Keyboard navigation completa

---

## 7. Integración con IA (Insights)

### 7.1 Datos Enviados a Claude API

**Agregación de Datos** (para privacidad):
```json
{
  "periodo": "2024-01",
  "balance": {
    "ingresos": 200000,
    "gastos": 180000,
    "balance": 20000
  },
  "gastos_por_categoria": {
    "Comida": 50000,
    "Transporte": 20000,
    "Servicios": 30000,
    "Entretenimiento": 15000,
    "Otros": 65000
  },
  "comparacion_mes_anterior": {
    "ingresos": 180000,
    "gastos": 170000
  },
  "presupuestos": [
    {
      "categoria": "Comida",
      "limite": 50000,
      "gastado": 50000,
      "porcentaje": 100
    }
  ],
  "deudas_totales": 50000,
  "tarjetas": {
    "limite_total": 100000,
    "comprometido": 50000
  }
}
```

### 7.2 Prompt para Claude

```
Eres un asistente financiero personal. Analiza los siguientes datos financieros del usuario y proporciona insights accionables.

Datos del período: {datos_json}

Proporciona:
1. Observaciones principales sobre el balance y gastos
2. Comparación con períodos anteriores
3. Alertas sobre presupuestos excedidos o próximos a exceder
4. Sugerencias concretas de ahorro
5. Proyección simple del saldo para el próximo mes

Formato de respuesta: JSON con estructura:
{
  "observaciones": ["...", "..."],
  "alertas": ["...", "..."],
  "sugerencias": ["...", "..."],
  "proyeccion": "..."
}
```

### 7.3 Visualización de Insights (Minimalista)

**Card de Insights**:
```
┌────────────────────────────────────┐
│ 💡 Insights                         │
│                                    │
│ • Gastaste 20% más en Comida este │
│   mes vs el anterior               │
│                                    │
│ • Sugerencia: Podrías ahorrar      │
│   $10k/mes reduciendo delivery     │
│                                    │
│ • Proyección: Si continuas así,   │
│   ahorrarás $25k este mes          │
└────────────────────────────────────┘
```

- Los insights se muestran en el dashboard
- Se guardan en la BD para consultarlos luego
- Se pueden generar manualmente o automáticamente (ej: cada fin de mes)
- No se envían datos personales identificables

---

## 8. Plan de Implementación (Fases)

### Fase 1: Setup & MVP Core (4-6 semanas)

**Semana 1: Setup del Proyecto**
- Crear estructura monorepo (apps/web, apps/api)
- Configurar Vite + React + TypeScript + Tailwind
- Configurar Express + Prisma
- Conectar a Supabase existente
- Setup de autenticación con Supabase Auth
- Definir Prisma schema completo
- Primera migración a Supabase

**Semana 2: Entidades Core**
- CRUD Cuentas (frontend + backend)
- CRUD Movimientos básicos (Ingreso, Gasto)
- Cálculo de saldos
- Dashboard básico minimalista
- **Quick Add v1** (modal simple)

**Semana 3: Tarjetas**
- CRUD Tarjetas
- Compras en cuotas
- Pago de tarjetas
- Visualización de límites
- Tests de lógica de cuotas

**Semana 4: Movimientos Avanzados**
- Transferencias
- Categorización
- Filtros en lista de movimientos
- Balance mensual
- **Quick Add v2** (optimizado con defaults inteligentes)

**Semana 5: Deudas & Presupuestos**
- CRUD Deudas
- Pagos de deudas
- CRUD Presupuestos
- Visualización de estado de presupuestos

**Semana 6: Polish & Deploy**
- Monedas y conversiones
- Configuración de categorías
- Responsive design completo
- Tests E2E básicos
- Deploy a Vercel + Supabase

**Entregables Fase 1**:
- ✅ Gestión de cuentas
- ✅ Movimientos (ingreso, gasto, transferencia)
- ✅ Tarjetas con cuotas
- ✅ Deudas
- ✅ Presupuestos
- ✅ Balance mensual
- ✅ UI minimalista y responsive
- ✅ Quick Add optimizado

### Fase 2: Features Avanzadas (2-3 semanas)

- Inversiones (CRUD + tracking)
- Insights de IA (integración con Claude API)
- Categorías personalizadas
- Shortcuts de teclado avanzados
- Exportación de datos (CSV)
- Mejoras de UX basadas en uso real

### Fase 3: Optimizaciones (2 semanas)

- Visualizaciones simples (barras de progreso, mini-gráficos)
- Performance optimization (React Query, caching)
- PWA (Progressive Web App) para mobile
- Modo oscuro
- Más inteligencia en Quick Add (ML para sugerir categorías)

### Fase 4: Features Premium (Futuro)

- Sincronización bancaria (API de bancos)
- Valorización de inversiones en tiempo real
- Metas de ahorro
- Compartir cuentas (familias)
- App móvil nativa (React Native)

---

## 9. Métricas de Éxito

### 9.1 Técnicas
- Tiempo de carga inicial < 2s
- Tiempo de respuesta API < 200ms (p95)
- Disponibilidad > 99.5%
- Cero inconsistencias en saldos (validado con tests)

### 9.2 UX
- **Tiempo de registro de gasto**: < 5 segundos (Quick Add)
- **Tiempo de carga de dashboard**: < 1 segundo
- Clicks para acción común (registrar gasto): 3 clicks máximo

### 9.3 Producto
- Balance mensual preciso (incluye todos los movimientos)
- Trazabilidad completa (cada peso tiene origen/destino)
- Saldos coinciden con realidad (validable con extractos bancarios)

### 9.4 Usuario
- Confianza en los números
- Visibilidad de compromisos futuros
- Insights accionables de IA
- Satisfacción con la velocidad de uso

---

## 10. Riesgos y Mitigaciones

### Riesgo 1: Complejidad del Modelo de Cuotas
**Mitigación**: Tests exhaustivos de casos de borde, documentación clara

### Riesgo 2: Conversión de Monedas Imprecisa
**Mitigación**: Guardar tasa histórica en cada movimiento, permitir actualización manual

### Riesgo 3: Performance con Muchos Movimientos
**Mitigación**: Indexación correcta en Supabase, paginación, React Query para caching

### Riesgo 4: Privacidad en Insights de IA
**Mitigación**: Enviar solo datos agregados, sin información identificable

### Riesgo 5: UX Demasiado Minimalista
**Mitigación**: Validar con usuario real desde fase 1, iterar basado en feedback

---

## 11. Próximos Pasos

1. ✅ **Spec validado**
2. **Setup de proyecto** en Claude Code:
   - Crear estructura monorepo
   - Configurar conexión a Supabase
   - Definir Prisma schema
   - Setup de auth con Supabase
3. **Mockups de Quick Add** (validar antes de implementar)
4. **Comenzar Fase 1** del plan de implementación

---

## Apéndice A: Glosario

- **Saldo Actual**: Balance real de una cuenta, calculado desde movimientos
- **Límite Comprometido**: Monto del límite de tarjeta usado por compras en cuotas aún no totalmente pagadas
- **Límite Disponible**: Límite total - límite comprometido
- **Saldo a Pagar**: Monto de cuotas vencidas en el período actual de una tarjeta
- **Balance Mensual**: Ingresos - Gastos en un período (incluye pagos de tarjetas y deudas)
- **Movimiento**: Cualquier transacción que afecte el saldo de una cuenta
- **Cuota**: Fracción de una compra en cuotas con fecha de vencimiento específica
- **Compromiso Futuro**: Cuota o pago recurrente que vencerá en el futuro
- **Quick Add**: Feature de registro ultra-rápido de movimientos (< 5 segundos)

---

## Apéndice B: Configuración de Supabase

### B.1 Extensión de BD Existente

**Situación Actual**:
- BD Supabase con tabla `productos` (lista de compras)

**Estrategia de Migración**:
1. No tocar tabla `productos` existente
2. Agregar nuevas tablas para Freya Balans
3. Usar Prisma migrations para gestionar esquema

**Schema Coexistente**:
```prisma
// Tabla existente (ignorada por Prisma)
// model Productos {
//   ...
// }

// Nuevas tablas de Freya Balans
model Usuario {
  id              String   @id @default(uuid())
  email           String   @unique
  nombre          String
  moneda_principal String   @default("ARS")
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  
  cuentas         Cuenta[]
  tarjetas        Tarjeta[]
  movimientos     Movimiento[]
  // ... más relaciones
}

// ... resto del schema
```

### B.2 Row Level Security (RLS)

**Políticas de Seguridad**:
```sql
-- Usuarios solo ven sus propios datos
CREATE POLICY "Usuarios ven solo sus datos"
ON public.movimientos
FOR SELECT
USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios insertan solo sus datos"
ON public.movimientos
FOR INSERT
WITH CHECK (auth.uid() = usuario_id);

-- Similar para todas las tablas
```

### B.3 Índices para Performance

```sql
-- Índices críticos
CREATE INDEX idx_movimientos_usuario_fecha 
ON movimientos(usuario_id, fecha DESC);

CREATE INDEX idx_movimientos_cuenta 
ON movimientos(cuenta_id);

CREATE INDEX idx_cuotas_fecha_vencimiento 
ON cuotas(fecha_vencimiento) 
WHERE pagada = false;
```

---

**Fin del Documento de Especificación**

Versión: 2.0 (Actualizada con Supabase + UX Minimalista)  
Fecha: Febrero 2025  
Autor: Especificación colaborativa Usuario + Claude
