-- 1. Remove the permissive products INSERT policy (admin/staff ALL policy already covers inserts)
DROP POLICY IF EXISTS "Allow admin insert products" ON public.products;

-- 2. Stop broadcasting sensitive tables over Realtime
ALTER PUBLICATION supabase_realtime DROP TABLE public.customers;
ALTER PUBLICATION supabase_realtime DROP TABLE public.activity_logs;

-- 3. Add admin/staff-only UPDATE and DELETE policies on order-pdfs storage objects
CREATE POLICY "order-pdfs admin update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'order-pdfs' AND public.is_admin_or_staff(auth.uid()))
WITH CHECK (bucket_id = 'order-pdfs' AND public.is_admin_or_staff(auth.uid()));

CREATE POLICY "order-pdfs admin delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'order-pdfs' AND public.is_admin_or_staff(auth.uid()));