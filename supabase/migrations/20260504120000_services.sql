-- Migration: services table
-- Catalog of billable services, scoped per owner account.

CREATE TABLE IF NOT EXISTS public.services (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz   NOT NULL DEFAULT now(),
  owner         uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text          NOT NULL,
  description   text          NOT NULL DEFAULT '',
  default_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (default_price >= 0),
  sort_order    integer       NOT NULL DEFAULT 0
);

-- Fast lookup: all services for an owner, ordered for display
CREATE INDEX IF NOT EXISTS services_owner_sort_idx ON public.services (owner, sort_order);

-- RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services_select_own" ON public.services
  FOR SELECT TO authenticated
  USING (auth.uid() = owner);

CREATE POLICY "services_insert_own" ON public.services
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner);

CREATE POLICY "services_update_own" ON public.services
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner);

CREATE POLICY "services_delete_own" ON public.services
  FOR DELETE TO authenticated
  USING (auth.uid() = owner);
