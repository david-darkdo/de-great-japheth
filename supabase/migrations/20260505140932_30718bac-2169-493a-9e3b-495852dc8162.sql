-- Ensure RLS is enabled
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop existing if present, then create permissive insert policy for any authenticated user
DROP POLICY IF EXISTS "Allow admin insert products" ON public.products;

CREATE POLICY "Allow admin insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
