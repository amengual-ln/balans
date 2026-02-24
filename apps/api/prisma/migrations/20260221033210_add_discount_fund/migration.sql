-- CreateEnum
CREATE TYPE "TipoCuenta" AS ENUM ('BANCO', 'BILLETERA', 'BROKER', 'EFECTIVO', 'FONDO_DESCUENTO');

-- CreateEnum
CREATE TYPE "TipoTarjeta" AS ENUM ('VISA', 'MASTERCARD', 'OTRA');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('INGRESO', 'GASTO', 'TRANSFERENCIA', 'PAGO_TARJETA', 'GASTO_TARJETA', 'PAGO_DEUDA', 'INVERSION', 'RETORNO_INVERSION', 'AJUSTE', 'INGRESO_INICIAL', 'GASTO_CON_DESCUENTO', 'SUBSIDIO');

-- CreateEnum
CREATE TYPE "TipoDeuda" AS ENUM ('PERSONAL', 'CREDITO_BILLETERA', 'PRESTAMO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoInversion" AS ENUM ('PLAZO_FIJO', 'BONOS', 'ACCIONES', 'CRYPTO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoInversion" AS ENUM ('ACTIVA', 'PARCIALMENTE_RECUPERADA', 'FINALIZADA');

-- CreateEnum
CREATE TYPE "PeriodoPresupuesto" AS ENUM ('MENSUAL', 'ANUAL');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "moneda_principal" TEXT NOT NULL DEFAULT 'ARS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuentas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoCuenta" NOT NULL,
    "moneda" TEXT NOT NULL,
    "saldo_actual" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuentas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarjetas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "cuenta_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoTarjeta" NOT NULL,
    "limite_total" DECIMAL(15,2) NOT NULL,
    "limite_comprometido" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "moneda" TEXT NOT NULL,
    "dia_cierre" INTEGER NOT NULL,
    "dia_vencimiento" INTEGER NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tarjetas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "cuenta_id" TEXT NOT NULL,
    "cuenta_destino_id" TEXT,
    "tarjeta_id" TEXT,
    "deuda_id" TEXT,
    "monto" DECIMAL(15,2) NOT NULL,
    "moneda" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "categoria" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tasa_conversion" DECIMAL(10,4),
    "movimiento_relacionado_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compras_en_cuotas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tarjeta_id" TEXT NOT NULL,
    "movimiento_id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "monto_total" DECIMAL(15,2) NOT NULL,
    "cantidad_cuotas" INTEGER NOT NULL,
    "monto_por_cuota" DECIMAL(15,2) NOT NULL,
    "cuotas_pagadas" INTEGER NOT NULL DEFAULT 0,
    "fecha_compra" TIMESTAMP(3) NOT NULL,
    "categoria" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compras_en_cuotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuotas" (
    "id" TEXT NOT NULL,
    "compra_id" TEXT NOT NULL,
    "numero_cuota" INTEGER NOT NULL,
    "monto" DECIMAL(15,2) NOT NULL,
    "fecha_vencimiento" TIMESTAMP(3) NOT NULL,
    "pagada" BOOLEAN NOT NULL DEFAULT false,
    "fecha_pago" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cuotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deudas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tipo" "TipoDeuda" NOT NULL,
    "acreedor" TEXT NOT NULL,
    "monto_total" DECIMAL(15,2) NOT NULL,
    "monto_pendiente" DECIMAL(15,2) NOT NULL,
    "moneda" TEXT NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "cantidad_cuotas" INTEGER,
    "monto_cuota" DECIMAL(15,2),
    "saldada" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deudas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_deuda" (
    "id" TEXT NOT NULL,
    "deuda_id" TEXT NOT NULL,
    "movimiento_id" TEXT NOT NULL,
    "monto" DECIMAL(15,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_deuda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inversiones" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tipo" "TipoInversion" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "monto_invertido" DECIMAL(15,2) NOT NULL,
    "monto_recuperado" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "moneda" TEXT NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "cuenta_origen_id" TEXT,
    "estado" "EstadoInversion" NOT NULL DEFAULT 'ACTIVA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inversiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presupuestos" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "monto_limite" DECIMAL(15,2) NOT NULL,
    "periodo" "PeriodoPresupuesto" NOT NULL,
    "moneda" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presupuestos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuraciones_moneda" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "moneda" TEXT NOT NULL,
    "tasa_a_principal" DECIMAL(10,4) NOT NULL,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuraciones_moneda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "cuentas_usuario_id_idx" ON "cuentas"("usuario_id");

-- CreateIndex
CREATE INDEX "tarjetas_usuario_id_idx" ON "tarjetas"("usuario_id");

-- CreateIndex
CREATE INDEX "movimientos_usuario_id_fecha_idx" ON "movimientos"("usuario_id", "fecha");

-- CreateIndex
CREATE INDEX "movimientos_cuenta_id_idx" ON "movimientos"("cuenta_id");

-- CreateIndex
CREATE INDEX "compras_en_cuotas_usuario_id_idx" ON "compras_en_cuotas"("usuario_id");

-- CreateIndex
CREATE INDEX "compras_en_cuotas_tarjeta_id_idx" ON "compras_en_cuotas"("tarjeta_id");

-- CreateIndex
CREATE INDEX "cuotas_fecha_vencimiento_pagada_idx" ON "cuotas"("fecha_vencimiento", "pagada");

-- CreateIndex
CREATE INDEX "deudas_usuario_id_idx" ON "deudas"("usuario_id");

-- CreateIndex
CREATE INDEX "pagos_deuda_deuda_id_idx" ON "pagos_deuda"("deuda_id");

-- CreateIndex
CREATE INDEX "inversiones_usuario_id_idx" ON "inversiones"("usuario_id");

-- CreateIndex
CREATE INDEX "presupuestos_usuario_id_idx" ON "presupuestos"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "configuraciones_moneda_usuario_id_moneda_key" ON "configuraciones_moneda"("usuario_id", "moneda");

-- AddForeignKey
ALTER TABLE "cuentas" ADD CONSTRAINT "cuentas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarjetas" ADD CONSTRAINT "tarjetas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarjetas" ADD CONSTRAINT "tarjetas_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "cuentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "cuentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_cuenta_destino_id_fkey" FOREIGN KEY ("cuenta_destino_id") REFERENCES "cuentas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_tarjeta_id_fkey" FOREIGN KEY ("tarjeta_id") REFERENCES "tarjetas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_deuda_id_fkey" FOREIGN KEY ("deuda_id") REFERENCES "deudas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_movimiento_relacionado_id_fkey" FOREIGN KEY ("movimiento_relacionado_id") REFERENCES "movimientos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras_en_cuotas" ADD CONSTRAINT "compras_en_cuotas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras_en_cuotas" ADD CONSTRAINT "compras_en_cuotas_tarjeta_id_fkey" FOREIGN KEY ("tarjeta_id") REFERENCES "tarjetas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras_en_cuotas" ADD CONSTRAINT "compras_en_cuotas_movimiento_id_fkey" FOREIGN KEY ("movimiento_id") REFERENCES "movimientos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuotas" ADD CONSTRAINT "cuotas_compra_id_fkey" FOREIGN KEY ("compra_id") REFERENCES "compras_en_cuotas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deudas" ADD CONSTRAINT "deudas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_deuda" ADD CONSTRAINT "pagos_deuda_deuda_id_fkey" FOREIGN KEY ("deuda_id") REFERENCES "deudas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_deuda" ADD CONSTRAINT "pagos_deuda_movimiento_id_fkey" FOREIGN KEY ("movimiento_id") REFERENCES "movimientos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inversiones" ADD CONSTRAINT "inversiones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inversiones" ADD CONSTRAINT "inversiones_cuenta_origen_id_fkey" FOREIGN KEY ("cuenta_origen_id") REFERENCES "cuentas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuraciones_moneda" ADD CONSTRAINT "configuraciones_moneda_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
