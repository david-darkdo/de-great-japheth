
ALTER TABLE public.cart_email_progress
  ADD COLUMN IF NOT EXISTS cart_items JSONB NOT NULL DEFAULT '[]';
