
-- Extend customers with profile fields
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Update handle_new_user to capture metadata (name, phone, provider)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customers (user_id, email, full_name, phone, provider, last_login_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.customers.full_name),
    phone = COALESCE(EXCLUDED.phone, public.customers.phone),
    provider = COALESCE(EXCLUDED.provider, public.customers.provider),
    last_login_at = now();
  RETURN NEW;
END;
$$;

-- Ensure customers.user_id has unique constraint for ON CONFLICT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_user_id_key'
  ) THEN
    ALTER TABLE public.customers ADD CONSTRAINT customers_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Triggers on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_customer ON auth.users;
CREATE TRIGGER on_auth_user_created_customer
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Backfill existing auth users into customers and user_roles
INSERT INTO public.customers (user_id, email, provider, last_login_at)
SELECT u.id, u.email,
  COALESCE(u.raw_app_meta_data->>'provider', 'email'),
  COALESCE(u.last_sign_in_at, u.created_at)
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role, email)
SELECT u.id, 'customer'::public.app_role, u.email
FROM auth.users u
ON CONFLICT DO NOTHING;
