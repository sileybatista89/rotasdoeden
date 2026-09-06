// Phase 2A stub. Validates the orchestrator flow only.
// No content generation, no publishing, no business behaviour.
import { handleAgentStub } from "../_shared/agents/stub.ts";

Deno.serve((req) => handleAgentStub(req, "content"));
