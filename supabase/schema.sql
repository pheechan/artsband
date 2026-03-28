-- Artsband Supabase schema
-- Use this file for a fresh Supabase project setup.
-- For existing projects with prior data, prefer the incremental files in supabase/migrations.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'member');
CREATE TYPE public.availability_status AS ENUM ('certain', 'uncertain');
CREATE TYPE public.instrument_part AS ENUM ('vocals', 'guitar', 'bass', 'keyboard', 'drums', 'other');
CREATE TYPE public.event_status AS ENUM ('draft', 'voting', 'confirmed', 'completed');
CREATE TYPE public.membership_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  full_name TEXT,
  phone_number TEXT,
  avatar_url TEXT,
  primary_instrument public.instrument_part NOT NULL DEFAULT 'other',
  secondary_instrument public.instrument_part,
  bio TEXT,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  student_id TEXT NOT NULL UNIQUE,
  membership_status public.membership_status NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'member',
  UNIQUE (user_id, role)
);

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  theme TEXT,
  description TEXT,
  event_date DATE NOT NULL,
  venue TEXT,
  status public.event_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  youtube_link TEXT,
  spotify_link TEXT,
  suggested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  vote_count INTEGER NOT NULL DEFAULT 0,
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.song_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (song_id, user_id)
);

CREATE TABLE public.lineups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_assigned TEXT NOT NULL,
  instrument public.instrument_part NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (song_id, member_id, role_assigned)
);

CREATE TABLE public.availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status public.availability_status NOT NULL DEFAULT 'certain',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE TABLE public.rehearsals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX profiles_membership_status_idx ON public.profiles (membership_status);
CREATE INDEX user_roles_user_id_idx ON public.user_roles (user_id);
CREATE INDEX events_status_event_date_idx ON public.events (status, event_date);
CREATE INDEX songs_event_id_idx ON public.songs (event_id);
CREATE INDEX songs_vote_count_idx ON public.songs (vote_count DESC);
CREATE INDEX lineups_song_id_idx ON public.lineups (song_id);
CREATE INDEX availability_member_start_idx ON public.availability (member_id, start_time);
CREATE INDEX rehearsals_start_time_idx ON public.rehearsals (start_time);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rehearsals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_approved_member(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND membership_status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin');
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  submitted_student_id TEXT;
BEGIN
  submitted_student_id := NULLIF(NEW.raw_user_meta_data ->> 'student_id', '');

  IF submitted_student_id IS NULL THEN
    RAISE EXCEPTION 'student_id is required for Artsband registration';
  END IF;

  INSERT INTO public.profiles (
    id,
    nickname,
    full_name,
    primary_instrument,
    student_id,
    membership_status
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nickname', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'full_name',
    COALESCE((NEW.raw_user_meta_data ->> 'primary_instrument')::public.instrument_part, 'other'),
    submitted_student_id,
    'pending'
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_membership_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.membership_status IS DISTINCT FROM OLD.membership_status
    OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
    OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
    OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
    RAISE EXCEPTION 'Only admins can change membership approval fields.';
  END IF;

  IF OLD.membership_status <> 'pending'
    AND NEW.student_id IS DISTINCT FROM OLD.student_id THEN
    RAISE EXCEPTION 'Student ID can only be changed while the account is pending review.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_song_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.songs
    SET vote_count = vote_count + 1
    WHERE id = NEW.song_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.songs
    SET vote_count = vote_count - 1
    WHERE id = OLD.song_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER protect_profile_membership_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_membership_fields();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_availability_updated_at
  BEFORE UPDATE ON public.availability
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rehearsals_updated_at
  BEFORE UPDATE ON public.rehearsals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_song_vote_change
  AFTER INSERT OR DELETE ON public.song_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_song_vote_count();

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Approved members can view approved profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    membership_status = 'approved'
    AND (public.is_approved_member(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved members can view events"
  ON public.events FOR SELECT
  TO authenticated
  USING (public.is_approved_member(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete events"
  ON public.events FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved members can view songs"
  ON public.songs FOR SELECT
  TO authenticated
  USING (public.is_approved_member(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved members can suggest songs"
  ON public.songs FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = suggested_by
    AND (public.is_approved_member(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Admins can update songs"
  ON public.songs FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete songs"
  ON public.songs FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved members can view votes"
  ON public.song_votes FOR SELECT
  TO authenticated
  USING (public.is_approved_member(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved members can vote"
  ON public.song_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (public.is_approved_member(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Approved members can remove their vote"
  ON public.song_votes FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND (public.is_approved_member(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Approved members can view lineups"
  ON public.lineups FOR SELECT
  TO authenticated
  USING (public.is_approved_member(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage lineups"
  ON public.lineups FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved members can view availability"
  ON public.availability FOR SELECT
  TO authenticated
  USING (public.is_approved_member(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved members can insert their own availability"
  ON public.availability FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = member_id
    AND (public.is_approved_member(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Approved members can update their own availability"
  ON public.availability FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = member_id
    AND (public.is_approved_member(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  )
  WITH CHECK (
    auth.uid() = member_id
    AND (public.is_approved_member(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Approved members can delete their own availability"
  ON public.availability FOR DELETE
  TO authenticated
  USING (
    auth.uid() = member_id
    AND (public.is_approved_member(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Approved members can view rehearsals"
  ON public.rehearsals FOR SELECT
  TO authenticated
  USING (public.is_approved_member(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage rehearsals"
  ON public.rehearsals FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'events'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'songs'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.songs;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'rehearsals'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.rehearsals;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'availability'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.availability;
    END IF;
  END IF;
END $$;

-- After the first approved user exists, promote them manually:
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('YOUR_USER_UUID_HERE', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;
