-- Esquema relacional del catálogo de productos y favoritos.
-- Idempotente: se puede ejecutar más de una vez con seguridad.

BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_role_check CHECK (role IN ('user', 'admin')),
  CONSTRAINT users_email_not_blank CHECK (LENGTH(TRIM(email)) > 0),
  CONSTRAINT users_name_not_blank CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT users_password_not_blank CHECK (LENGTH(TRIM(password)) > 0)
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category VARCHAR(100) NOT NULL DEFAULT 'General',
  price NUMERIC(10, 2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT products_name_unique UNIQUE (name),
  CONSTRAINT products_name_not_blank CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT products_category_not_blank CHECK (LENGTH(TRIM(category)) > 0),
  CONSTRAINT products_price_positive CHECK (price > 0),
  CONSTRAINT products_stock_non_negative CHECK (stock >= 0)
);

CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT favorites_user_fk
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT favorites_product_fk
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT favorites_user_product_unique UNIQUE (user_id, product_id)
);

-- --- Migración idempotente para bases creadas en etapas anteriores ---

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category VARCHAR(100);

UPDATE products
SET category = 'General'
WHERE category IS NULL OR LENGTH(TRIM(category)) = 0;

ALTER TABLE products
  ALTER COLUMN category SET DEFAULT 'General';

ALTER TABLE products
  ALTER COLUMN category SET NOT NULL;

UPDATE products
SET description = ''
WHERE description IS NULL;

ALTER TABLE products
  ALTER COLUMN description SET DEFAULT '';

ALTER TABLE products
  ALTER COLUMN description SET NOT NULL;

-- Reemplaza la restricción antigua price >= 0 por price > 0.
UPDATE products
SET price = 0.01
WHERE price <= 0;

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_price_non_negative;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_price_positive'
      AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_price_positive CHECK (price > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_category_not_blank'
      AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_category_not_blank
      CHECK (LENGTH(TRIM(category)) > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_product_id ON favorites (product_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);

-- Garantiza unicidad también en bases ya creadas antes de products_name_unique.
CREATE UNIQUE INDEX IF NOT EXISTS products_name_unique ON products (name);

COMMIT;
