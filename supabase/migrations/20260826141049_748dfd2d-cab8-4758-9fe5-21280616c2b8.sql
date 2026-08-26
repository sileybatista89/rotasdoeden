-- Harden professional_profiles owner updates: keep silent revert of admin-only fields
-- and also prevent owner from re-pointing the row to another user.
CREATE OR REPLACE FUNCTION public.protect_professional_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    NEW.user_id := OLD.user_id;
    NEW.verification_status := OLD.verification_status;
    NEW.verified_at := OLD.verified_at;
    NEW.verification_expires_at := OLD.verification_expires_at;
    NEW.admin_notes := OLD.admin_notes;
    NEW.suspended := OLD.suspended;
    NEW.status := OLD.status;
    NEW.status_changed_at := OLD.status_changed_at;
    NEW.applied_at := OLD.applied_at;
    NEW.approved_at := OLD.approved_at;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS trg_protect_pp ON public.professional_profiles;
CREATE TRIGGER trg_protect_pp
BEFORE UPDATE ON public.professional_profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_professional_profile_fields();

-- Defensive guard on verification_requests: only admins may change review state.
CREATE OR REPLACE FUNCTION public.guard_verification_request_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    NEW.user_id := OLD.user_id;
    NEW.status := OLD.status;
    NEW.reviewer_notes := OLD.reviewer_notes;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS trg_vr_updated ON public.verification_requests;
DROP TRIGGER IF EXISTS trg_guard_vr ON public.verification_requests;
CREATE TRIGGER trg_guard_vr
BEFORE UPDATE ON public.verification_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_verification_request_update();