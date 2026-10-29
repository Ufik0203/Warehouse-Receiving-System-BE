-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "receiving_status" AS ENUM ('OPEN', 'PARTIAL', 'COMPLETED');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('OPERATOR', 'SUPERVISOR');

-- CreateTable
CREATE TABLE "inventory_balances" (
    "product_id" UUID NOT NULL,
    "available_quantity" BIGINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_balances_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "receipt_id" UUID NOT NULL,
    "receiving_id" UUID NOT NULL,
    "receiving_item_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sku" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "unit" VARCHAR(8) NOT NULL DEFAULT 'pcs',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receivings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "number" VARCHAR(40) NOT NULL,
    "reference" VARCHAR(160) NOT NULL DEFAULT '',
    "status" "receiving_status" NOT NULL DEFAULT 'OPEN',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receivings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receiving_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "receiving_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "expected_quantity" INTEGER NOT NULL,
    "received_quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "receiving_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "receiving_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "idempotency_key" UUID NOT NULL,
    "payload_hash" CHAR(64) NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(254) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "auth_version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_transactions_product_id_created_at_id_idx" ON "inventory_transactions"("product_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "inventory_transactions_receiving_id_created_at_id_idx" ON "inventory_transactions"("receiving_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "inventory_transactions_receiving_item_id_idx" ON "inventory_transactions"("receiving_item_id");

-- CreateIndex
CREATE INDEX "inventory_transactions_created_at_id_idx" ON "inventory_transactions"("created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_transactions_receipt_id_receiving_item_id_key" ON "inventory_transactions"("receipt_id", "receiving_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "receivings_number_key" ON "receivings"("number");

-- CreateIndex
CREATE INDEX "receivings_status_created_at_id_idx" ON "receivings"("status", "created_at", "id");

-- CreateIndex
CREATE INDEX "receivings_created_at_id_idx" ON "receivings"("created_at", "id");

-- CreateIndex
CREATE INDEX "receiving_items_product_id_idx" ON "receiving_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "receiving_items_receiving_id_product_id_key" ON "receiving_items"("receiving_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "receiving_items_id_receiving_id_product_id_key" ON "receiving_items"("id", "receiving_id", "product_id");

-- CreateIndex
CREATE INDEX "receipts_actor_id_idx" ON "receipts"("actor_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_receiving_id_idempotency_key_key" ON "receipts"("receiving_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_id_receiving_id_key" ON "receipts"("id", "receiving_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_is_active_idx" ON "users"("role", "is_active");

-- CreateIndex
CREATE INDEX "users_created_at_id_idx" ON "users"("created_at", "id");

-- AddForeignKey
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_receipt_id_receiving_id_fkey" FOREIGN KEY ("receipt_id", "receiving_id") REFERENCES "receipts"("id", "receiving_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_receiving_item_id_receiving_id_prod_fkey" FOREIGN KEY ("receiving_item_id", "receiving_id", "product_id") REFERENCES "receiving_items"("id", "receiving_id", "product_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_receiving_id_fkey" FOREIGN KEY ("receiving_id") REFERENCES "receivings"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "receivings" ADD CONSTRAINT "receivings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "receiving_items" ADD CONSTRAINT "receiving_items_receiving_id_fkey" FOREIGN KEY ("receiving_id") REFERENCES "receivings"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "receiving_items" ADD CONSTRAINT "receiving_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_receiving_id_fkey" FOREIGN KEY ("receiving_id") REFERENCES "receivings"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;


-- Domain CHECK constraints not represented by Prisma schema syntax.
ALTER TABLE "users" ADD CONSTRAINT "users_email_lowercase" CHECK (email = lower(email));
ALTER TABLE "users" ADD CONSTRAINT "users_auth_version_positive" CHECK (auth_version >= 1);
ALTER TABLE "products" ADD CONSTRAINT "products_sku_format" CHECK (sku ~ '^[A-Z0-9_-]+$');
ALTER TABLE "products" ADD CONSTRAINT "products_unit_pcs" CHECK (unit = 'pcs');
ALTER TABLE "receiving_items" ADD CONSTRAINT "receiving_items_expected_range" CHECK (expected_quantity BETWEEN 1 AND 1000000);
ALTER TABLE "receiving_items" ADD CONSTRAINT "receiving_items_received_nonnegative" CHECK (received_quantity >= 0);
ALTER TABLE "receiving_items" ADD CONSTRAINT "receiving_items_received_max" CHECK (received_quantity <= expected_quantity);
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_quantity_range" CHECK (quantity BETWEEN 1 AND 1000000);
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_nonnegative" CHECK (available_quantity >= 0);
