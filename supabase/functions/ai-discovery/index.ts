// Phase 2A stub. Validates the orchestrator flow only.
import { handleAgentStub } from "../_shared/agents/stub.ts";

Deno.serve((req) => handleAgentStub(req, "discovery"));
