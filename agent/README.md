# Agent System

This folder contains the multi-agent workflow used by this repository.

## Execution Model

The pipelines are designed around **artifact-based handoff**: agents communicate through files on disk, not shared memory. This means each agent can run in a fresh context without carrying the full history of previous stages.

Each task also has a shared execution log at `agent/tasks/<task-id>.agents-audit.md`. This file records when an agent starts, what it is doing, when it hands off, and when retries or blocks occur.

### How to run the pipelines in practice

**Recommended approach: Supervisor + sub-agents**

Your main AI conversation acts as the supervisor. For each pipeline stage, the supervisor spawns a fresh sub-agent with:

1. Only that agent's `AGENT.md` as instructions
2. The relevant input artifacts from `agent/tasks/` or `agent/done/`
3. Domain-brain files relevant to the task

The sub-agent does its work, writes its output artifact to disk, and exits. The supervisor then inspects the output and decides whether to proceed, retry, or stop.

**Why this works:** Each sub-agent starts with a clean context. It reads its inputs from files, produces its output as a file. No single agent carries the entire pipeline history, so context never explodes.

Each fresh sub-agent must also identify itself in its first chat message with explicit role wording such as `Working as coder agent.`

**Implementation pipeline example:**

```text
You: "Implement user authentication for the API"

Supervisor:
  1. Creates agent/tasks/task-012-auth-hardening.md
  2. Spawns planner -> writes task-012-auth-hardening.plan.md
  3. Spawns coder -> writes code + task-012-auth-hardening.coder.md
  4. Spawns tester -> writes task-012-auth-hardening.test.md
  5. Spawns reviewer -> writes task-012-auth-hardening.review.md
  6. If approved: creates PR handoff and archives to agent/done/task-012-auth-hardening/
```

**Architecture pipeline example:**

```text
You: "Let's work on architecture for guest checkout and split it into tasks"

Supervisor:
  1. Creates agent/tasks/task-010-guest-checkout-architecture.md
  2. Spawns architect -> writes task-010-guest-checkout-architecture.arch.md
  3. Spawns task-splitter -> writes task-010-guest-checkout-architecture.split.md
  4. task-splitter creates:
     - agent/tasks/task-011-migrate-db.md
     - agent/tasks/task-012-add-auth-endpoint.md
     - agent/tasks/task-013-update-client-flow.md
  5. Archives task-010-guest-checkout-architecture/* to agent/done/
  6. Leaves task-011+, task-012+, task-013+ in agent/tasks/ for the implementation pipeline
```

**Alternative approaches:**

- **Manual orchestration**: You invoke each agent yourself, one at a time, passing the relevant files. More control, more effort.
- **Single-session**: One AI role-plays all agents sequentially. Simpler, but context grows large on non-trivial tasks. Only suitable for small, focused changes.

### Key principle

The files in `agent/tasks/` are the message bus. Artifacts are the inter-agent protocol. The pipelines work regardless of whether agents are sub-processes, separate conversations, API calls, or human-driven.

The audit file is part of that protocol. It is the human-visible execution history for the task.

---

## Roles

| Agent | Directory | Purpose | Artifact |
|-------|-----------|---------|----------|
| Supervisor | `agent/supervisor/` | Orchestrates lifecycle and handoffs | manages flow |
| Architect | `agent/architect/` | Designs the architecture for a requested problem | `<task-id>.arch.md` |
| Task Splitter | `agent/task-splitter/` | Converts approved architecture into implementation-ready tasks | `<task-id>.split.md` + generated task files |
| Planner | `agent/planner/` | Converts an implementation task into executable steps | `<task-id>.plan.md` |
| Coder | `agent/coder/` | Implements the plan | `<task-id>.coder.md` + code |
| Tester | `agent/tester/` | Validates implementation | `<task-id>.test.md` |
| Reviewer | `agent/reviewer/` | Final quality gate | `<task-id>.review.md` |

All stages append execution events to `<task-id>.agents-audit.md`.

---

## Queue

- Put new tasks in `agent/tasks/`.
- Use `agent/tasks/TASK_TEMPLATE.md` for implementation tasks.
- Use `agent/tasks/ARCHITECTURE_TASK_TEMPLATE.md` for architecture tasks.
- Store per-task artifacts in task-scoped files during execution.
- Keep `agent/tasks/<task-id>.agents-audit.md` updated throughout execution.
- Set `pipeline: implementation` for normal execution tasks.
- Set `pipeline: architecture` only when the user explicitly asked for architecture/design work.
- Use `source_architecture` on implementation tasks generated from architecture work.
- On completion, move finished task artifacts to `agent/done/<task-id>/`.

### Task numbering

- Use standalone task ids such as `task-011-migrate-db`.
- Do not create `task-009-A`, `task-009-B`, or similar letter-suffixed child ids for implementation work.
- Preserve architecture lineage with metadata, not with task id suffixes.
- Historical archived `task-009-A/B/C/...` examples are legacy output and should not be copied into new work.

## Agent Audit Log

Audit entry format:

```text
YYYY-MM-DD HH:MM:SS - <agent-name>
<short action description>
```

Every agent must log exactly two entries per normal stage execution:

1. **Received**: logged immediately when the agent receives the task, before any processing.
2. **Completed**: logged when the agent finishes work, describing what was done and who the task is being passed to.

Additional entries are required when:

- receiving retry feedback
- blocking the task

---

## Task Status Lifecycle

```text
architecture pipeline:
queued -> in_progress -> designing -> splitting -> done

implementation pipeline:
queued -> in_progress -> planning -> implementing -> testing -> reviewing
             ^             ^              ^             |
             |             |              |             v
             |             +--------------+-------- changes_required
             |                                           |
             +-------------------------------------------+
                                                         |
                                                  (max retries exceeded)
                                                         v
reviewing -> approved -> pr_created -> done            blocked
```

Valid statuses: `queued`, `in_progress`, `designing`, `splitting`, `planning`, `implementing`, `testing`, `reviewing`, `changes_required`, `approved`, `pr_created`, `done`, `blocked`.

The supervisor updates the task status at each transition.

---

## Feedback and Retry Loop

When the reviewer returns `CHANGES_REQUIRED` or the tester reports failures:

1. The supervisor reads the failure details from the test or review report.
2. The supervisor classifies the issue and routes to the correct agent:
   - **Plan-level issue** -> back to planner
   - **Implementation issue** -> back to coder
   - **Test gaps** -> back to coder
   - **Domain-brain inconsistency** -> back to coder
   - **Architecture gap** -> stop the implementation pipeline and open or route a separate architecture task
3. The receiving agent gets the feedback as additional input alongside the original artifacts.
4. After the fix, the pipeline resumes from that agent forward.
5. **Retry limits**: maximum 2 retry cycles per task. If still failing after 2 retries, the supervisor sets status to `blocked` and stops. Human intervention is required.

---

## Pipelines

Implementation:

```text
tasks -> supervisor -> planner -> coder -> tester -> reviewer -> PR handoff -> done
```

Architecture:

```text
tasks -> supervisor -> architect -> task-splitter -> done
```

Future:

```text
tasks -> supervisor -> e2e-<agents> -> done
```

The e2e pipeline is intentionally not implemented yet, but `pipeline: e2e` is reserved so prompt routing stays consistent later.

## Pipeline Selection

Prompt shortcuts are useful only for bootstrapping a new task. The durable routing decision must live in the task file.

- If the prompt is about architecture, design, or "split this into tasks", create an architecture task.
- If the prompt is about implementing or fixing an existing task, create or pick an implementation task.
- If the prompt is about e2e or Playwright work, reserve that work for a future `pipeline: e2e` task instead of forcing it into the architecture or implementation pipeline.
