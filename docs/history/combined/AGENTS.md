# Agent instructions

## Read first

Before changing application code, read:

1. docs/prd.md
2. docs/technical-spec.md
3. docs/api-contract.md
4. docs/openapi.yaml, when available
5. docs/erd.mmd
6. docs/data-flow.mmd
7. docs/testing.md

Do not infer business behavior already defined by these documents.

If documents contradict each other:
- Identify the concrete contradiction.
- Use the PRD for business intent.
- Update the technical design and contract consistently.
- Record the decision before implementing affected behavior.

## Scope

Implement only the assessment scope and the explicitly requested additions:
- Supervisor-managed users.
- Session authentication.
- CSRF.
- Redis session storage and rate limiting.
- Express/React TypeScript.
- Prisma.
- TanStack Query.

Do not add unrelated features or an extra administrator role.

## Architecture

- Follow the documented folder structure.
- Keep app.ts separate from server.ts.
- Route wires middleware and controller.
- Controller handles HTTP adaptation.
- Service owns business rules and transaction boundaries.
- Repository owns database access.
- Mapper creates safe response DTOs.
- Do not introduce empty abstractions.

## TypeScript

- Use strict TypeScript.
- Avoid explicit any and type suppression.
- Validate untrusted data before using it.
- Keep database models separate from public DTOs.
- Never expose password hashes or session internals.

## Database

- Use Prisma ORM 7 and compatible dependencies.
- Use multi-file models under prisma/models.
- Generate the client into src/generated/prisma.
- Add forward migrations.
- Include required SQL constraints.
- Do not edit applied migrations.
- Do not use db push as deployment migration strategy.

## Authentication

- Use Redis-backed server sessions.
- Regenerate session after successful login.
- Protect login and all mutations with CSRF.
- Reload user role/status/authVersion from PostgreSQL.
- Fail safely on Redis outages.
- Never fall back to in-memory production sessions or rate limits.

## Receiving

- One receipt uses one PostgreSQL transaction.
- Lock receiving before idempotency and quantity decisions.
- Check existing receipt before rejecting completed status.
- Use the transaction client for every transaction operation.
- Persist idempotency in PostgreSQL.
- Same operation replays the original receipt.
- Changed operation with the same key returns conflict.
- Update item counters, ledger, balances, and status atomically.
- Keep balance updates in deterministic product order.
- Never trust client-provided stock or received totals.

## Frontend

- Use useQuery for server reads.
- Use useMutation for server mutations.
- Centralize query keys and HTTP security behavior.
- Preserve pending receipt key and payload.
- Do not optimistically increase inventory.
- Distinguish committed mutation from refetch failure.
- Clear cached user data on authentication loss.
- Backend authorization remains mandatory.

## Verification and evidence

- Add meaningful tests for changed business behavior.
- Run checks appropriate to the task.
- Use real PostgreSQL/Redis for relevant integration tests.
- Record actual commands and results.
- Leave unexecuted checks marked NOT_RUN.
- Never fabricate prompts, logs, test passes, deployment, or work history.
- Keep Git commits small and descriptive.
