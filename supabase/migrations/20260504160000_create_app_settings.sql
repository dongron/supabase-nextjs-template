-- Create app_settings table for per-user application configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  designer_email text NOT NULL DEFAULT '',
  CONSTRAINT app_settings_owner_unique UNIQUE (owner)
);

-- Enable Row Level Security
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: users can only read their own settings
CREATE POLICY "Users can read own app_settings"
  ON public.app_settings
  FOR SELECT
  USING (auth.uid() = owner);

-- Policy: users can insert their own settings
CREATE POLICY "Users can insert own app_settings"
  ON public.app_settings
  FOR INSERT
  WITH CHECK (auth.uid() = owner);

-- Policy: users can update their own settings
CREATE POLICY "Users can update own app_settings"
  ON public.app_settings
  FOR UPDATE
  USING (auth.uid() = owner)
  WITH CHECK (auth.uid() = owner);
