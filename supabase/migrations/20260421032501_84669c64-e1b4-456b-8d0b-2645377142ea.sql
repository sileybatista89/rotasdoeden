-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'guide', 'tourist');
CREATE TYPE public.kyc_status AS ENUM ('pending', 'submitted', 'verified', 'rejected');
CREATE TYPE public.booking_status AS ENUM ('pending_payment', 'confirmed', 'completed', 'cancelled', 'refunded');

-- ============================================
-- HELPER: updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  phone TEXT,
  country TEXT,
  bio TEXT,
  kyc_status public.kyc_status NOT NULL DEFAULT 'pending',
  banned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- USER ROLES
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer helpers (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
$$;

-- ============================================
-- KYC SUBMISSIONS
-- ============================================
CREATE TABLE public.kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_front_url TEXT NOT NULL,
  document_back_url TEXT,
  selfie_url TEXT NOT NULL,
  license_number TEXT,
  license_url TEXT,
  status public.kyc_status NOT NULL DEFAULT 'submitted',
  reviewer_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- BOOKINGS
-- ============================================
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tourist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL,
  service_title TEXT NOT NULL,
  date DATE NOT NULL,
  num_people INTEGER NOT NULL CHECK (num_people > 0),
  total_price NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
  special_requests TEXT,
  status public.booking_status NOT NULL DEFAULT 'pending_payment',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- CONVERSATIONS
-- ============================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tourist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tourist_id, guide_id)
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- MESSAGES
-- ============================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  original_content TEXT,
  was_filtered BOOLEAN NOT NULL DEFAULT false,
  flagged_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);

-- ============================================
-- FLAGGED MESSAGES (admin moderation queue)
-- ============================================
CREATE TABLE public.flagged_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  reviewed BOOLEAN NOT NULL DEFAULT false,
  action_taken TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.flagged_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES — profiles
-- ============================================
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins update any profile" ON public.profiles FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS — user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- RLS — kyc_submissions
CREATE POLICY "Users view own kyc" ON public.kyc_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own kyc" ON public.kyc_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all kyc" ON public.kyc_submissions FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins update kyc" ON public.kyc_submissions FOR UPDATE USING (public.is_admin(auth.uid()));

-- RLS — bookings
CREATE POLICY "Tourist views own bookings" ON public.bookings FOR SELECT USING (auth.uid() = tourist_id);
CREATE POLICY "Guide views received bookings" ON public.bookings FOR SELECT USING (auth.uid() = guide_id);
CREATE POLICY "Admin views all bookings" ON public.bookings FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Tourist creates booking" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = tourist_id);
CREATE POLICY "Tourist updates own booking" ON public.bookings FOR UPDATE USING (auth.uid() = tourist_id);
CREATE POLICY "Admin updates any booking" ON public.bookings FOR UPDATE USING (public.is_admin(auth.uid()));

-- RLS — conversations
CREATE POLICY "Participants view conversation" ON public.conversations FOR SELECT
  USING (auth.uid() = tourist_id OR auth.uid() = guide_id OR public.is_admin(auth.uid()));
CREATE POLICY "Participants create conversation" ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = tourist_id OR auth.uid() = guide_id);
CREATE POLICY "Admin updates conversation" ON public.conversations FOR UPDATE USING (public.is_admin(auth.uid()));

-- RLS — messages
CREATE POLICY "Participants view messages" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id
    AND (c.tourist_id = auth.uid() OR c.guide_id = auth.uid()))
  OR public.is_admin(auth.uid())
);
CREATE POLICY "Participants send messages" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM public.conversations c WHERE c.id = conversation_id
      AND (c.tourist_id = auth.uid() OR c.guide_id = auth.uid())
  )
);

-- RLS — flagged_messages
CREATE POLICY "Admin views flagged" ON public.flagged_messages FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "System inserts flagged" ON public.flagged_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin updates flagged" ON public.flagged_messages FOR UPDATE USING (public.is_admin(auth.uid()));

-- ============================================
-- HANDLE NEW USER — first user becomes admin
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INTEGER;
  chosen_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));

  SELECT COUNT(*) INTO user_count FROM public.user_roles;

  IF user_count = 0 THEN
    chosen_role := 'admin';
  ELSE
    chosen_role := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', '')::public.app_role,
      'tourist'
    );
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, chosen_role);

  -- Guides start KYC pending; tourists default verified (no KYC needed)
  IF chosen_role = 'guide' THEN
    UPDATE public.profiles SET kyc_status = 'pending' WHERE id = NEW.id;
  ELSE
    UPDATE public.profiles SET kyc_status = 'verified' WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false)
  ON CONFLICT (id) DO NOTHING;

-- Storage policies — avatars (public read, owner write)
CREATE POLICY "Avatars public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Avatars owner upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Avatars owner update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies — kyc (private, owner+admin)
CREATE POLICY "KYC owner read" ON storage.objects FOR SELECT USING (
  bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "KYC admin read" ON storage.objects FOR SELECT USING (
  bucket_id = 'kyc-documents' AND public.is_admin(auth.uid())
);
CREATE POLICY "KYC owner upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;