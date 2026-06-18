
-- 1. Replace tourist INSERT policy to enforce tourist role
DROP POLICY IF EXISTS "Tourist creates booking" ON public.bookings;

CREATE POLICY "Tourist creates booking"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = tourist_id
  AND public.has_role(auth.uid(), 'tourist'::public.app_role)
  AND NOT public.is_banned(auth.uid())
);

-- 2. Split tourist UPDATE policy to restrict columns at RLS layer
DROP POLICY IF EXISTS "Tourist updates own booking" ON public.bookings;

-- Tourist can only update rows they own, and the trigger guard_booking_update
-- still enforces that only special_requests changes are accepted.
CREATE POLICY "Tourist updates own booking special requests"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  auth.uid() = tourist_id
  AND NOT public.is_banned(auth.uid())
)
WITH CHECK (
  auth.uid() = tourist_id
  AND NOT public.is_banned(auth.uid())
);
