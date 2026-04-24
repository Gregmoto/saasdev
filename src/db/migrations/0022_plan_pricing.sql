-- Migration 0022: Plan pricing update + annual billing column + unlimited products

-- Add annual pricing column (price per month when billed annually)
ALTER TABLE plans ADD COLUMN IF NOT EXISTS annual_price_cents INTEGER;

-- Update Starter: 299 kr/month, 199 kr/month annual, unlimited products
UPDATE plans SET
  monthly_price_cents = 29900,
  annual_price_cents  = 19900,
  description         = 'Perfekt för enskilda butiker som just kommit igång.',
  limits = '{"maxProducts":null,"maxOrders":500,"maxUsers":3,"maxStorefronts":1,"maxWarehouses":1,"maxMarkets":1,"apiRequestsPerDay":1000,"storageGb":5}'::jsonb,
  updated_at = now()
WHERE slug = 'starter';

-- Update Growth: 1 199 kr/month, 899 kr/month annual, unlimited products
UPDATE plans SET
  monthly_price_cents = 119900,
  annual_price_cents  = 89900,
  description         = 'För växande handlare med flera kanaler och marknader.',
  limits = '{"maxProducts":null,"maxOrders":null,"maxUsers":10,"maxStorefronts":3,"maxWarehouses":3,"maxMarkets":5,"apiRequestsPerDay":10000,"storageGb":50}'::jsonb,
  updated_at = now()
WHERE slug = 'growth';

-- Enterprise already has maxProducts null — just keep it consistent
UPDATE plans SET
  limits = '{"maxProducts":null,"maxOrders":null,"maxUsers":null,"maxStorefronts":null,"maxWarehouses":null,"maxMarkets":null,"apiRequestsPerDay":null,"storageGb":null}'::jsonb,
  updated_at = now()
WHERE slug = 'enterprise';
