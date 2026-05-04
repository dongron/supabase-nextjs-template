-- Migration: prospect_services table
-- Per-prospect price overrides, one row per (prospect, service) pair.

CREATE TABLE IF NOT EXISTS public.prospect_services (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id  uuid          NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  service_id   uuid          NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  price        numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  created_at   timestamptz   NOT NULL DEFAULT now(),
  updated_at   timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (prospect_id, service_id)
);

-- Fast lookup: all service price rows for a given prospect
CREATE INDEX IF NOT EXISTS prospect_services_prospect_idx ON public.prospect_services (prospect_id);

-- RLS
ALTER TABLE public.prospect_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prospect_services_select_own" ON public.prospect_services
  FOR SELECT TO authenticated
  USING (
    prospect_id IN (SELECT id FROM public.proposals WHERE owner = auth.uid())
  );

CREATE POLICY "prospect_services_insert_own" ON public.prospect_services
  FOR INSERT TO authenticated
  WITH CHECK (
    prospect_id IN (SELECT id FROM public.proposals WHERE owner = auth.uid())
  );

CREATE POLICY "prospect_services_update_own" ON public.prospect_services
  FOR UPDATE TO authenticated
  USING (
    prospect_id IN (SELECT id FROM public.proposals WHERE owner = auth.uid())
  );
