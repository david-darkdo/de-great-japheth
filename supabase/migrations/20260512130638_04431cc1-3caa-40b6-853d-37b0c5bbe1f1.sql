ALTER TABLE public.products ADD COLUMN IF NOT EXISTS family text;
CREATE INDEX IF NOT EXISTS idx_products_category_family ON public.products(category, family);