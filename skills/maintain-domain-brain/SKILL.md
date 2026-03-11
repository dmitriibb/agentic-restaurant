name: maintain-domain-brain
description: Keep domain-brain and flow-index.yaml synchronized with implementation changes.
trigger: Any code change that adds, modifies, or removes business logic, domain entities, flows, or state transitions.

## Rules

- Domain documentation updates MUST be in the same commit as the code change. Never defer.
- If a domain-brain update is required but missing, the reviewer MUST flag it as a blocking issue.

## Workflow

1. Identify affected domain flows by checking `flow-index.yaml` for the changed code paths.
2. Update `domain-brain/flows/` when business flow behavior changes (add new file or update existing).
3. Update `domain-brain/entities/` when entity structure, rules, or relationships change.
4. Update `domain-brain/state-machines/` when state transitions are added or modified.
5. Update `domain-brain/invariants.md` if any business rule that must never be violated is added or changed.
6. Update `domain-brain/edge-cases.md` if new exceptional scenarios are discovered or handled.
7. Update `domain-brain/glossary.md` if new domain terms are introduced in the code.
8. Update `flow-index.yaml` mappings if new code paths, entities, or flows are introduced.

## Validation

The reviewer agent checks domain-brain consistency as part of its review. A missing domain-brain update for a business logic change is a blocking issue.
