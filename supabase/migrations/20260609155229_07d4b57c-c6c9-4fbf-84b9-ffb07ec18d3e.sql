CREATE TABLE public.app_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_state TO anon, authenticated;
GRANT ALL ON public.app_state TO service_role;
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read app_state" ON public.app_state FOR SELECT USING (true);
CREATE POLICY "Public insert app_state" ON public.app_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update app_state" ON public.app_state FOR UPDATE USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_state;