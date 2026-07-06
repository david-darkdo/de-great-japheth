
-- =========================================================
-- EMAIL AUTOMATION ENGINE — new additive subsystem
-- =========================================================

-- 1. email_templates ------------------------------------------------
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_type TEXT NOT NULL CHECK (template_type IN ('monthly','cart')),
  template_content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_templates admin manage" ON public.email_templates
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- 2. email_campaigns ------------------------------------------------
CREATE TABLE public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('monthly','cart','manual')),
  title TEXT,
  banner_image TEXT,
  body TEXT,
  audience TEXT NOT NULL DEFAULT 'all_users'
    CHECK (audience IN ('all_users','selected_users','users_with_orders','users_with_cart')),
  selected_user_ids UUID[] NOT NULL DEFAULT '{}',
  product_ids UUID[] NOT NULL DEFAULT '{}',
  template_type TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sending','sent','failed','test')),
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaigns TO authenticated;
GRANT ALL ON public.email_campaigns TO service_role;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_campaigns admin manage" ON public.email_campaigns
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- 3. email_logs -----------------------------------------------------
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  user_id UUID,
  email TEXT,
  status TEXT NOT NULL
    CHECK (status IN ('Queued','Delivered','Failed','Bounced','Opened','Clicked WhatsApp','Visited Showroom','Visited Cart')),
  provider_message_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  event_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX email_logs_campaign_idx ON public.email_logs (campaign_id);
CREATE INDEX email_logs_user_idx ON public.email_logs (user_id);
CREATE INDEX email_logs_status_idx ON public.email_logs (status);
CREATE INDEX email_logs_event_at_idx ON public.email_logs (event_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_logs TO authenticated;
GRANT ALL ON public.email_logs TO service_role;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_logs admin read" ON public.email_logs
  FOR SELECT TO authenticated
  USING (public.is_admin_or_staff(auth.uid()));

-- 4. scheduler_state (also holds the global automation switch) -------
CREATE TABLE public.scheduler_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduler_name TEXT NOT NULL UNIQUE,
  automation_status TEXT NOT NULL DEFAULT 'enabled'
    CHECK (automation_status IN ('enabled','paused')),
  last_execution TIMESTAMPTZ,
  next_execution TIMESTAMPTZ,
  current_template_index INTEGER NOT NULL DEFAULT 0,
  current_product_index INTEGER NOT NULL DEFAULT 0,
  cart_reminder_index INTEGER NOT NULL DEFAULT 0,
  used_product_combos JSONB NOT NULL DEFAULT '[]',
  used_template_indexes JSONB NOT NULL DEFAULT '[]',
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduler_state TO authenticated;
GRANT ALL ON public.scheduler_state TO service_role;
ALTER TABLE public.scheduler_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scheduler_state admin manage" ON public.scheduler_state
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- 5. cart_email_progress -------------------------------------------
CREATE TABLE public.cart_email_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_product_index INTEGER NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX cart_email_progress_user_idx ON public.cart_email_progress (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_email_progress TO authenticated;
GRANT ALL ON public.cart_email_progress TO service_role;
ALTER TABLE public.cart_email_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cart_email_progress admin manage" ON public.cart_email_progress
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- updated_at triggers ----------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_email_templates_updated BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_email_campaigns_updated BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_scheduler_state_updated BEFORE UPDATE ON public.scheduler_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cart_email_progress_updated BEFORE UPDATE ON public.cart_email_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the scheduler rows + global switch --------------------------
INSERT INTO public.scheduler_state (scheduler_name, automation_status)
VALUES ('monthly', 'enabled'), ('cart', 'enabled'), ('global', 'enabled')
ON CONFLICT (scheduler_name) DO NOTHING;
