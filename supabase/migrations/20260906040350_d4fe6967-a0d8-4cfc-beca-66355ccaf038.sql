REVOKE ALL ON FUNCTION public.agent_claim_task(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agent_claim_task(integer) TO service_role;

REVOKE ALL ON FUNCTION public.agent_cost_totals(public.agent_type) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agent_cost_totals(public.agent_type) TO authenticated, service_role;