-- Migration 0024: Add Free plan
-- Free plan: 0 kr/month, max 250 products (product rows, not variants), max 100 orders/calendar month.
-- Product counting rule: counts rows in the `products` table for the store (simple products +
-- variable product parents). Variants are NOT counted separately. One product with 10 variants = 1.

INSERT INTO plans (
  slug, name, description,
  monthly_price_cents, annual_price_cents,
  limits, features,
  sort_order, is_public, is_active
)
VALUES (
  'free',
  'Free',
  'Kom igång utan kostnad. Perfekt för att testa ShopMan med upp till 250 produkter och 100 ordrar per månad.',
  0, 0,
  '{
    "maxProducts": 250,
    "maxOrders": 100,
    "maxUsers": 1,
    "maxStorefronts": 1,
    "maxWarehouses": 1,
    "maxMarkets": 1,
    "apiRequestsPerDay": 500,
    "storageGb": 2
  }'::jsonb,
  '{
    "multiShop": false,
    "marketplace": false,
    "resellerPanel": false,
    "customDomains": false,
    "advancedAnalytics": false,
    "prioritySupport": false,
    "apiAccess": false,
    "webhooks": false,
    "bulkImport": false
  }'::jsonb,
  0,
  true,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  annual_price_cents = EXCLUDED.annual_price_cents,
  limits = EXCLUDED.limits,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order,
  is_public = EXCLUDED.is_public,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Update sort order of existing plans to fit after Free
UPDATE plans SET sort_order = 1 WHERE slug = 'starter';
UPDATE plans SET sort_order = 2 WHERE slug = 'growth';
UPDATE plans SET sort_order = 3 WHERE slug = 'enterprise';
