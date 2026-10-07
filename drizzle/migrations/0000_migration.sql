CREATE TABLE public.hub_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'proxy',
  icon text NOT NULL DEFAULT '🌐',
  color text NOT NULL DEFAULT 'oklch(0.6 0.18 250)',
  urls text[] NOT NULL DEFAULT '{}',
  html text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hub_apps TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hub_apps TO authenticated;
GRANT ALL ON public.hub_apps TO service_role;
ALTER TABLE public.hub_apps ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_hub_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(lower(auth.jwt()->>'email') = 'corniestc@gmail.com', false)
     AND coalesce(lower(auth.jwt()->'user_metadata'->>'name') = 'minh', false)
$$;

CREATE POLICY "anyone reads apps" ON public.hub_apps FOR SELECT USING (true);
CREATE POLICY "admin inserts" ON public.hub_apps FOR INSERT TO authenticated WITH CHECK (public.is_hub_admin());
CREATE POLICY "admin updates" ON public.hub_apps FOR UPDATE TO authenticated USING (public.is_hub_admin());
CREATE POLICY "admin deletes" ON public.hub_apps FOR DELETE TO authenticated USING (public.is_hub_admin());

ALTER PUBLICATION supabase_realtime ADD TABLE public.hub_apps;

INSERT INTO public.hub_apps (name, kind, icon, color, urls) VALUES
('Nebulo','proxy','🌌','oklch(0.55 0.2 280)', ARRAY['https://plat.primebuildings.bg/','https://plat.sfero.cl/','https://plat.n43.pw/']),
('Nova','proxy','🚀','oklch(0.62 0.2 30)', ARRAY['https://plat.sfero.cl/','https://plat.n43.pw/','https://plat.primebuildings.bg/']),
('Orbit','proxy','🪐','oklch(0.65 0.15 200)', ARRAY['https://plat.n43.pw/','https://plat.primebuildings.bg/','https://plat.sfero.cl/']),
('Comet','proxy','☄️','oklch(0.7 0.17 70)', ARRAY['https://plat.primebuildings.bg/','https://plat.n43.pw/']),
('Pulsar','proxy','💫','oklch(0.6 0.2 340)', ARRAY['https://plat.sfero.cl/','https://plat.primebuildings.bg/']),
('Quasar','proxy','✨','oklch(0.6 0.17 150)', ARRAY['https://plat.n43.pw/','https://plat.sfero.cl/']),
('2048','game','🔢','oklch(0.75 0.15 80)', ARRAY['https://play2048.co/']),
('Slope','game','🎿','oklch(0.55 0.18 145)', ARRAY['https://slopegame.io/']);