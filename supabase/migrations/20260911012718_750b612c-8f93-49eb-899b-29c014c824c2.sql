REVOKE ALL ON FUNCTION public.guard_package_booking_delete() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_package_booking_item_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_package_booking() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_package_booking() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.next_package_booking_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_package_booking_number() TO service_role;