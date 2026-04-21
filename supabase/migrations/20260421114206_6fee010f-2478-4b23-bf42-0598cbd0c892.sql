
-- 1) Restrict tourist booking updates to special_requests only via trigger
CREATE OR REPLACE FUNCTION public.guard_booking_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins bypass restrictions
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- If the updater is the tourist (owner), only allow changing special_requests
  IF auth.uid() = OLD.tourist_id THEN
    IF NEW.tourist_id        IS DISTINCT FROM OLD.tourist_id        OR
       NEW.guide_id          IS DISTINCT FROM OLD.guide_id          OR
       NEW.service_id        IS DISTINCT FROM OLD.service_id        OR
       NEW.service_title     IS DISTINCT FROM OLD.service_title     OR
       NEW.date              IS DISTINCT FROM OLD.date               OR
       NEW.num_people        IS DISTINCT FROM OLD.num_people        OR
       NEW.total_price       IS DISTINCT FROM OLD.total_price       OR
       NEW.status            IS DISTINCT FROM OLD.status            OR
       NEW.created_at        IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Tourists may only update special_requests on their bookings';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_guard_update ON public.bookings;
CREATE TRIGGER bookings_guard_update
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_booking_update();

-- 2) Clean up user_roles policies: remove the broad ALL policy, keep explicit ones
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins insert roles" ON public.user_roles;

CREATE POLICY "Admins insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
