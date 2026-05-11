
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code text NOT NULL UNIQUE,
  user_id uuid,
  customer_email text,
  customer_name text,
  customer_phone text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  item_count integer NOT NULL DEFAULT 0,
  total_estimate numeric,
  pdf_path text,
  whatsapp_status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX orders_user_id_idx ON public.orders(user_id);
CREATE INDEX orders_order_code_idx ON public.orders(order_code);
CREATE INDEX orders_created_at_idx ON public.orders(created_at DESC);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders self read"
  ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_or_staff(auth.uid()));

CREATE POLICY "orders admin manage"
  ON public.orders FOR ALL TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- Private storage bucket for invoice PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-pdfs', 'order-pdfs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "order-pdfs admin read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'order-pdfs' AND public.is_admin_or_staff(auth.uid()));

CREATE POLICY "order-pdfs admin write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'order-pdfs' AND public.is_admin_or_staff(auth.uid()));
