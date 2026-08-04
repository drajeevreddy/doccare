-- Migration: 00004 - Add pharmacy/inventory columns to existing medicines table
-- ============================================================

-- Add columns to existing medicines table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'medicines' AND column_name = 'stock_quantity') THEN
    ALTER TABLE public.medicines ADD COLUMN stock_quantity INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'medicines' AND column_name = 'reorder_level') THEN
    ALTER TABLE public.medicines ADD COLUMN reorder_level INTEGER DEFAULT 10;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'medicines' AND column_name = 'selling_price') THEN
    ALTER TABLE public.medicines ADD COLUMN selling_price NUMERIC(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'medicines' AND column_name = 'unit_price') THEN
    ALTER TABLE public.medicines ADD COLUMN unit_price NUMERIC(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'medicines' AND column_name = 'generic_name') THEN
    ALTER TABLE public.medicines ADD COLUMN generic_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'medicines' AND column_name = 'is_active') THEN
    ALTER TABLE public.medicines ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'medicines' AND column_name = 'requires_prescription') THEN
    ALTER TABLE public.medicines ADD COLUMN requires_prescription BOOLEAN DEFAULT true;
  END IF;
END $$;
