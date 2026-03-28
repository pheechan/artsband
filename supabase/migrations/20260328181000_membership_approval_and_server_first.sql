DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'membership_status'
  ) THEN
    CREATE TYPE public.membership_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS student_id TEXT,
  ADD COLUMN IF NOT EXISTS membership_status public.membership_status DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE public.profiles
  ALTER COLUMN membership_status SET DEFAULT 'pending';

UPDATE public.profiles
SET membership_status = 'pending'
WHERE membership_status IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN membership_status SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_student_id_unique
  ON public.profiles (student_id)
  WHERE student_id IS NOT NULL;

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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    COALESCE((NEW.raw_user_meta_data ->> 'primary_instrument')::instrument_part, 'other'),
    NULLIF(NEW.raw_user_meta_data ->> 'student_id', ''),
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

DROP TRIGGER IF EXISTS protect_profile_membership_fields ON public.profiles;
CREATE TRIGGER protect_profile_membership_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_membership_fields();

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Events are viewable by authenticated users" ON public.events;
DROP POLICY IF EXISTS "Admins can create events" ON public.events;
DROP POLICY IF EXISTS "Admins can update events" ON public.events;
DROP POLICY IF EXISTS "Admins can delete events" ON public.events;
DROP POLICY IF EXISTS "Songs are viewable by authenticated users" ON public.songs;
DROP POLICY IF EXISTS "Authenticated users can suggest songs" ON public.songs;
DROP POLICY IF EXISTS "Admins can update songs" ON public.songs;
DROP POLICY IF EXISTS "Admins can delete songs" ON public.songs;
DROP POLICY IF EXISTS "Votes are viewable by authenticated users" ON public.song_votes;
DROP POLICY IF EXISTS "Users can vote" ON public.song_votes;
DROP POLICY IF EXISTS "Users can remove their vote" ON public.song_votes;
DROP POLICY IF EXISTS "Lineups are viewable by authenticated users" ON public.lineups;
DROP POLICY IF EXISTS "Admins can manage lineups" ON public.lineups;
DROP POLICY IF EXISTS "Users can view all availability" ON public.availability;
DROP POLICY IF EXISTS "Users can manage their own availability" ON public.availability;
DROP POLICY IF EXISTS "Users can update their own availability" ON public.availability;
DROP POLICY IF EXISTS "Users can delete their own availability" ON public.availability;
DROP POLICY IF EXISTS "Rehearsals are viewable by authenticated users" ON public.rehearsals;
DROP POLICY IF EXISTS "Admins can manage rehearsals" ON public.rehearsals;

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
