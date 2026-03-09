# Multi-Agent Development Architecture for AI Coding Agents

This document describes a **multi-agent development system** for AI-assisted coding.
The goal is to allow AI agents to work autonomously on a repository while humans assign tasks and review results.

The architecture is designed to run in a **cloud development workspace** (e.g., Codespaces or similar) and operate directly on the project repository.

---

# 1. Goals

The system should enable:

* asynchronous development by AI agents
* task-based workflows
* structured collaboration between multiple agents
* automated testing and validation
* automated commits and pull requests

Developers interact with the system by **creating tasks** rather than issuing direct prompts.

---

# 2. Core Concept

Instead of a single AI agent performing all actions, the system uses **specialized agents**.

```text
Task → Planner Agent → Coder Agent → Test Agent → Review Agent → Pull Request
```

Each agent performs one responsibility.

Benefits:

* better reasoning
* fewer hallucinations
* easier debugging
* clearer workflow

---

# 3. System Architecture

Typical repository layout:

```text
repo/

  AGENTS.md
  flow-index.yaml
  domain-brain/

  services/
  tests/

  agent/
    supervisor/
    planner/
    coder/
    tester/
    reviewer/

    tasks/
    done/
```

The **agent directory** contains all orchestration logic.

---

# 4. Task Queue

Tasks represent work items for the AI system.

Tasks are stored as files.

Example:

```text
agent/tasks/
  task-001.md
  task-002.md
```

Example task:

```text
Title: Implement refund validation

Requirements:
- follow domain-brain rules
- update flow-index.yaml if services change
- add unit tests
- ensure build passes
```

Tasks may be created from:

* CLI
* GitHub issues
* phone browser
* scripts
* manual files

---

# 5. Supervisor (Orchestrator)

The **supervisor** coordinates the entire system.

Responsibilities:

* monitor task queue
* assign tasks to agents
* manage workflow pipeline
* retry failed steps
* move completed tasks to done/

Pseudo workflow:

```text
loop
  check tasks
  select next task
  run planner agent
  run coder agent
  run test agent
  run review agent
  create PR
  move task to done
end
```

The supervisor ensures the pipeline runs consistently.

---

# 6. Planner Agent

The planner converts a task into a structured plan.

Input:

* task file
* repository context
* domain knowledge

Output example:

```text
Plan:

1 create refund validator
2 update payment service
3 update flow-index.yaml
4 add unit tests
5 update domain documentation
```

Purpose:

* reduce ambiguity
* improve agent accuracy
* create deterministic workflow.

---

# 7. Coder Agent

The coder agent implements the plan.

Inputs:

* planner output
* repository code
* domain-brain knowledge
* AGENTS.md rules

Typical actions:

* create files
* modify services
* update domain files
* update configuration
* generate tests

The coder agent should follow repository conventions.

---

# 8. Test Agent

The test agent validates the implementation.

Typical actions:

```text
run tests
run linters
run build
run static analysis
```

If errors occur:

```text
send failure details to coder agent
```

The coder agent attempts to repair the implementation.

---

# 9. Review Agent

The review agent acts as an automated code reviewer.

Checks include:

* domain invariants
* architectural rules
* coding style
* missing tests
* incomplete documentation

Example feedback:

```text
Refund service missing rule defined in invariants.md
```

If issues are found, the coder agent must fix them.

---

# 10. Pull Request Step

When all checks pass:

```text
git branch feature/task-id
git commit
git push
create pull request
```

The human developer later reviews and merges.

---

# 11. Task Lifecycle

```text
tasks/
   ↓
planner
   ↓
coder
   ↓
tester
   ↓
reviewer
   ↓
PR
   ↓
done/
```

The system operates continuously.

---

# 12. Integration with Domain Knowledge

Agents should use structured project knowledge.

Important files:

```text
domain-brain/
  glossary.md
  invariants.md
  flows/
```

Agents must consult these before modifying domain logic.

---

# 13. Flow Index

The file `flow-index.yaml` maps services to business flows.

Example:

```yaml
flows:

  payment_processing:
    services:
      - services/payment_service
      - services/billing_service

    docs:
      - domain-brain/flows/payment-processing.md
```

Agents use this file to identify relevant domain knowledge.

---

# 14. AGENTS.md

`AGENTS.md` defines development rules for AI agents.

Example responsibilities:

* follow domain-brain invariants
* update flow-index when services change
* include tests with new features
* follow repository conventions

All agents must respect these rules.

---

# 15. Example Workflow

Example task:

```text
Implement fraud detection service
```

Pipeline execution:

```text
Supervisor detects task
↓
Planner generates implementation plan
↓
Coder implements service
↓
Test agent runs tests
↓
Review agent checks domain rules
↓
PR created
```

Human later reviews PR.

---

# 16. Running Environment

The system is designed to run inside a **cloud development workspace** such as:

* cloud containers
* remote development machines
* devcontainer environments

This allows agents to:

* run builds
* execute tests
* commit code
* push branches

while developers monitor progress remotely.

---

# 17. Human Role

Humans remain responsible for:

* defining architecture
* reviewing pull requests
* creating tasks
* approving merges

AI agents handle **implementation loops**.

---

# 18. Key Principles

1. tasks should be small and specific
2. agents should have specialized roles
3. domain knowledge must be structured
4. automated testing is mandatory
5. humans review final output

---

# 19. Minimal Implementation Goal

The minimal working system should include:

```text
agent/
  supervisor
  planner
  coder
  tester
  reviewer

agent/tasks/
```

plus repository knowledge files:

```text
AGENTS.md
flow-index.yaml
domain-brain/
```

---

# 20. Outcome

This architecture enables:

* asynchronous AI development
* task-driven workflows
* autonomous feature implementation
* remote management from any device

while maintaining **human oversight and repository quality**.
