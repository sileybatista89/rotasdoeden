-- ============ CONTENT AGENT V1 ============

CREATE TABLE public.content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('destination_page','seo_article','landing_page','faq','social_post','experience_content','market_content')),
  discovery_opportunity_id uuid REFERENCES public.discovery_opportunities(id) ON DELETE SET NULL,
  country text,
  language text NOT NULL,
  market text,
  intent text,
  season text,
  audience text,
  title text,
  slug text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','approved','published','rejected','archived')),
  generated_by text NOT NULL DEFAULT 'ai_content' CHECK (generated_by IN ('ai_content','human')),
  translation_group_id uuid NOT NULL DEFAULT gen_random_uuid(),
  current_version_id uuid,
  quality_passed boolean NOT NULL DEFAULT false,
  quality_issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  task_id uuid REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
  run_id uuid REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_items TO authenticated;
GRANT ALL ON public.content_items TO service_role;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read content items" ON public.content_items FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins update content items" ON public.content_items FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE UNIQUE INDEX content_items_dedup_idx ON public.content_items (
  discovery_opportunity_id, content_type, lower(language), lower(coalesce(market,''))
) WHERE discovery_opportunity_id IS NOT NULL AND status <> 'archived';
CREATE UNIQUE INDEX content_items_slug_lang_idx ON public.content_items (lower(slug), lower(language)) WHERE slug IS NOT NULL AND status <> 'archived';
CREATE UNIQUE INDEX content_items_translation_lang_idx ON public.content_items (translation_group_id, lower(language));
CREATE INDEX content_items_status_idx ON public.content_items (status, created_at DESC);
CREATE INDEX content_items_created_idx ON public.content_items (created_at DESC);
CREATE INDEX content_items_opportunity_idx ON public.content_items (discovery_opportunity_id);

CREATE TABLE public.content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  title text,
  meta_description text,
  slug text,
  outline jsonb NOT NULL DEFAULT '[]'::jsonb,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  language text NOT NULL,
  word_count integer NOT NULL DEFAULT 0,
  author_type text NOT NULL DEFAULT 'agent' CHECK (author_type IN ('agent','human')),
  author_id uuid,
  agent_type text,
  change_reason text,
  quality_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  task_id uuid REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
  run_id uuid REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_id, version_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_versions TO authenticated;
GRANT ALL ON public.content_versions TO service_role;
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read content versions" ON public.content_versions FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX content_versions_content_idx ON public.content_versions (content_id, version_number DESC);

ALTER TABLE public.content_items
  ADD CONSTRAINT content_items_current_version_fkey
  FOREIGN KEY (current_version_id) REFERENCES public.content_versions(id) ON DELETE SET NULL;

CREATE TABLE public.content_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.content_versions(id) ON DELETE CASCADE,
  source_scope text NOT NULL CHECK (source_scope IN ('internal','external')),
  source_table text,
  source_record_id uuid,
  url text,
  title text,
  excerpt text,
  evidence_type text NOT NULL CHECK (evidence_type IN ('observed','interpreted','hypothesis','recommendation')),
  consulted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_sources TO authenticated;
GRANT ALL ON public.content_sources TO service_role;
ALTER TABLE public.content_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read content sources" ON public.content_sources FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX content_sources_content_idx ON public.content_sources (content_id, created_at DESC);
CREATE INDEX content_sources_version_idx ON public.content_sources (version_id);

CREATE TABLE public.content_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.content_versions(id) ON DELETE SET NULL,
  reviewer_id uuid,
  decision text NOT NULL CHECK (decision IN ('in_review','approved','rejected','archived','restored')),
  previous_status text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_reviews TO authenticated;
GRANT ALL ON public.content_reviews TO service_role;
ALTER TABLE public.content_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read content reviews" ON public.content_reviews FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX content_reviews_content_idx ON public.content_reviews (content_id, created_at DESC);

CREATE TABLE public.content_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.content_versions(id) ON DELETE SET NULL,
  approval_id uuid REFERENCES public.agent_approvals(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  requested_by text NOT NULL DEFAULT 'ai_content',
  decided_by uuid,
  decided_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_publications TO authenticated;
GRANT ALL ON public.content_publications TO service_role;
ALTER TABLE public.content_publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read content publications" ON public.content_publications FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX content_publications_content_idx ON public.content_publications (content_id, created_at DESC);

CREATE TABLE public.content_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.content_cache TO service_role;
ALTER TABLE public.content_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No user access to content cache" ON public.content_cache FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE INDEX content_cache_expires_idx ON public.content_cache (expires_at);

CREATE TRIGGER content_items_updated_at BEFORE UPDATE ON public.content_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER content_publications_updated_at BEFORE UPDATE ON public.content_publications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Configuração extensível (não são dados fictícios: é configuração do sistema)
INSERT INTO public.agent_config (key, value) VALUES
  ('content_limits', '{"max_items_per_run":3,"max_drafts_per_task":1,"cache_ttl_hours":24,"min_words":{"destination_page":400,"seo_article":600,"landing_page":250,"faq":150,"social_post":30,"experience_content":200,"market_content":300},"max_keyword_density":0.03,"max_similarity":0.85}'::jsonb),
  ('content_types', '{"destination_page":{"requires_seo":true,"allows_images":true},"seo_article":{"requires_seo":true,"allows_images":true},"landing_page":{"requires_seo":true,"allows_images":true},"faq":{"requires_seo":true,"allows_images":false},"social_post":{"requires_seo":false,"allows_images":true},"experience_content":{"requires_seo":true,"allows_images":true},"market_content":{"requires_seo":true,"allows_images":false}}'::jsonb),
  ('content_models', '{"provider":"lovable","outline_model":"google/gemini-3.6-flash","draft_model":"google/gemini-3.6-flash","quality_model":"google/gemini-3.6-flash"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
