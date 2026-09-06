// Phase 2A stub. Validates the orchestrator flow only. No public chatbot yet.
import { handleAgentStub } from "../_shared/agents/stub.ts";

Deno.serve((req) => handleAgentStub(req, "conversion"));
