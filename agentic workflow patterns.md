# AI-Friendly Backend Architecture Patterns

## Domain Brain, Flow Index, and Agent Skills

This document aggregates patterns for building **AI-friendly codebases** where coding agents can efficiently understand complex business logic without repeatedly analyzing large portions of the codebase.

The goal is to:

* reduce token usage
* improve agent reasoning
* prevent domain logic regressions
* keep domain documentation synchronized with code

These patterns are especially useful for **backend services with complex business flows**.

---

# 1. Core Problem

In complex systems, AI agents often need to repeatedly analyze the same domain logic:

Examples:

* order lifecycle
* billing workflows
* payment reconciliation
* fraud detection flows

Without additional structure, the agent must repeatedly scan:

* services
* repositories
* controllers
* models
* event handlers

This causes:

* high token usage
* slower reasoning
* missed dependencies
* inconsistent modifications

Solution: introduce a **Domain Knowledge Layer**.

---

# 2. Domain Brain Pattern

The **Domain Brain** is a structured knowledge layer that stores distilled domain knowledge separate from the code.

Instead of deriving domain rules from the implementation each time, agents read the **Domain Brain first**.

### Concept

```
Codebase = implementation
Domain Brain = distilled business knowledge
Agents = workflows operating on both
```

### Benefits

* dramatically reduces tokens
* improves reasoning accuracy
* prevents hallucinated domain rules
* stabilizes AI coding workflows

---

# 3. Domain Brain Structure

Recommended structure:

```
domain-brain/
  README.md
  glossary.md
  invariants.md

  entities/
    order.md
    payment.md

  flows/
    order-lifecycle.md
    payment-processing.md

  state-machines/
    order.yaml
    payment.yaml

  edge-cases.md
```

Each file should contain **short distilled knowledge**, not full documentation.

---

# 4. Domain Glossary

The glossary defines core domain terms.

Example:

```
Order
  Customer purchase entity.

Payment
  External transaction processed through PSP.

SettlementBatch
  Group of payments settled together.

Refund
  Reverse transfer after settlement.
```

Benefits:

* stabilizes terminology
* prevents hallucinated entities
* improves reasoning consistency

---

# 5. Domain Invariants

Invariants are rules that must never be violated.

Example:

```
Payment invariants

- A payment cannot be settled before it is authorized.
- A refund cannot exceed the settled amount.
- SettlementBatch must be closed before reconciliation.
```

Most production bugs violate invariants, so documenting them helps agents avoid breaking business logic.

---

# 6. Business Flow Documentation

Flows summarize business processes in a simplified form.

Example:

```
Order lifecycle

1. Order created
2. Payment authorized
3. Payment captured
4. Order fulfilled
5. Order shipped
6. Order delivered
```

Include alternative paths:

```
Cancellation allowed until fulfillment.
Refund possible after delivery.
```

---

# 7. State Machines (Structured Domain Knowledge)

Structured representations are easier for AI agents to reason about.

Example:

```yaml
order_state_machine:
  states:
    - created
    - paid
    - fulfilled
    - shipped
    - delivered

  transitions:
    created -> paid
    paid -> fulfilled
    fulfilled -> shipped
    shipped -> delivered
```

Benefits:

* prevents invalid state transitions
* enables deterministic reasoning

---

# 8. Flow Index Pattern

The **Flow Index** maps code areas to domain flows.

Purpose:

Allow the AI to quickly identify which domain knowledge applies to a code change.

Example:

```yaml
flows:

  order_lifecycle:
    docs:
      - domain-brain/flows/order-lifecycle.md
    services:
      - services/order_service
      - services/checkout_service
    entities:
      - Order
      - Cart

  payment_processing:
    docs:
      - domain-brain/flows/payment-processing.md
    services:
      - services/payment_service
      - services/billing_service
    entities:
      - Payment
      - SettlementBatch
```

---

# 9. How Agents Use the Flow Index

Example scenario:

File modified:

```
services/payment_service/process_payment.py
```

Agent workflow:

```
1. read flow-index.yaml
2. detect flow → payment_processing
3. load domain-brain/flows/payment-processing.md
4. apply domain rules before modifying code
```

Without Flow Index:

* agent must infer flow from code
* more token usage
* higher error probability

---

# 10. Making Flow Index Robust

Flow Index should be treated as a **routing hint**, not the only discovery mechanism.

Agents should still be able to:

* search code
* follow imports
* analyze dependencies
* use semantic search

### Optional improvement

Pattern matching:

```yaml
payment_processing:
  services:
    - services/payment_service
    - services/billing_service

  service_patterns:
    - services/payment*
    - services/fraud*
```

This helps discover newly created services.

---

# 11. Domain Tags in Code (Optional but Powerful)

Add domain tags in files.

Example:

```python
# @domain-flow: payment_processing
class PaymentService:
```

Agents can search for:

```
@domain-flow
```

to automatically identify domain ownership.

---

# 12. Skills for Domain Maintenance

Agents can use a **Skill** to maintain the Domain Brain.

Example skill structure:

```
skills/
  maintain-domain-brain/
    SKILL.md
```

Example skill instructions:

```
name: maintain-domain-brain
description: Keep domain-brain and flow-index.yaml synchronized with backend logic.

Workflow:

1. Identify affected domain flows.
2. Update files in domain-brain/flows/.
3. Update invariants if rules changed.
4. Add new services to flow-index.yaml.
5. Update glossary if new entities appear.
6. Include domain updates in the same commit.
```

---

# 13. AGENTS.md Integration

Example instruction:

```
When modifying backend business logic:

1. Consult flow-index.yaml
2. Load domain-brain files for the relevant flow
3. Apply invariants
4. Update domain-brain if business logic changes
5. Run maintain-domain-brain skill
```

---

# 14. CI Enforcement (Important)

To keep domain files up-to-date automatically, enforce a CI rule.

Example policy:

```
IF files in services/ change
AND domain-brain/ unchanged
THEN fail CI
```

This ensures domain knowledge is updated alongside code.

---

# 15. Domain Sync Script (Optional Automation)

Add a helper script:

```
scripts/domain-sync.ts
```

Possible functionality:

* detect new services
* suggest flow-index updates
* detect missing domain documentation
* generate summaries

Agents can run:

```
pnpm domain-sync
```

---

# 16. Recommended Project Structure

```
repo/

  AGENTS.md
  flow-index.yaml

  domain-brain/
    glossary.md
    invariants.md
    flows/
    entities/
    state-machines/

  skills/
    maintain-domain-brain/

  services/
  repositories/
  controllers/

  scripts/
    domain-sync.ts
```

---

# 17. How the Full System Works

Workflow:

```
Task assigned to AI agent
        ↓
Agent checks Flow Index
        ↓
Loads relevant Domain Brain knowledge
        ↓
Applies domain invariants
        ↓
Modifies code
        ↓
Runs maintain-domain-brain skill
        ↓
Updates domain files
        ↓
CI verifies synchronization
```

---

# 18. Benefits of This Architecture

| Metric                | Improvement          |
| --------------------- | -------------------- |
| token usage           | dramatically reduced |
| reasoning reliability | improved             |
| hallucinations        | reduced              |
| domain consistency    | improved             |
| onboarding            | faster               |

These patterns are especially useful for:

* fintech systems
* marketplaces
* SaaS platforms
* logistics systems
* any domain-heavy backend

---

# 19. Key Principle

Treat **domain knowledge as part of the codebase**, not just documentation.

```
Code = implementation
Domain Brain = business logic model
Flow Index = routing layer
Skills = operational workflows
```

Together these create an **AI-native backend architecture**.
