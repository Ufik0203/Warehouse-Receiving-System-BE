CREATE TABLE "product_edit_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "actor_name" VARCHAR(120) NOT NULL,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT clock_timestamp(),
    "before_sku" VARCHAR(40) NOT NULL,
    "after_sku" VARCHAR(40) NOT NULL,
    "before_name" VARCHAR(120) NOT NULL,
    "after_name" VARCHAR(120) NOT NULL,
    CONSTRAINT "product_edit_history_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_edit_history_effective_change" CHECK ("before_sku" <> "after_sku" OR "before_name" <> "after_name"),
    CONSTRAINT "product_edit_history_sku_format" CHECK ("before_sku" ~ '^[A-Z0-9_-]{1,40}$' AND "after_sku" ~ '^[A-Z0-9_-]{1,40}$'),
    CONSTRAINT "product_edit_history_names_nonempty" CHECK (char_length("actor_name") BETWEEN 1 AND 120 AND char_length("before_name") BETWEEN 1 AND 120 AND char_length("after_name") BETWEEN 1 AND 120),
    CONSTRAINT "product_edit_history_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT "product_edit_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE INDEX "product_edit_history_product_id_changed_at_id_idx" ON "product_edit_history"("product_id", "changed_at" DESC, "id" DESC);
CREATE INDEX "product_edit_history_actor_id_idx" ON "product_edit_history"("actor_id");
