name: maintain-domain-brain
description: Keep domain-brain and flow-index.yaml synchronized with implementation changes.

workflow:
  - Identify affected domain flows.
  - Update files in domain-brain/flows and domain-brain/entities when business behavior changes.
  - Update invariants and edge cases if rules changed.
  - Update flow-index.yaml mappings.
  - Ensure glossary includes new domain terms.
  - Keep domain updates in the same PR/commit as code changes.