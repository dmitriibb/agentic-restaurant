# Agent System

This folder contains the multi-agent workflow used by this repository.

## Execution Model

The pipeline is designed around **artifact-based handoff**: agents communicate through files on disk, not shared memory. This means each agent can run in a fresh context without carrying the full history of previous stages.

Each task also has a shared execution log at `agent/tasks/<task-id>.agents-audit.md`. This file records when an agent starts, what it is doing, when it hands off, and when retries or blocks occur.

### How to run the pipeline in practice

**Recommended approach: Supervisor + sub-agents**

Your main AI conversation acts as the supervisor. For each pipeline stage, the supervisor spawns a fresh sub-agent (using the AI tool's sub-agent capability) with:

1. Only that agent's `AGENT.md` as instructions
2. The relevant input artifacts from `agent/tasks/` (task file, plan.md, etc.)
3. Domain-brain files relevant to the task

The sub-agent does its work, writes its output artifact to `agent/tasks/`, and exits. The supervisor then inspects the output and decides whether to proceed to the next stage or route feedback.

**Why this works:** Each sub-agent starts with a clean context. It reads its inputs from files, produces its output as a file. No single agent carries the entire pipeline history, so context never explodes.

Each fresh sub-agent must also identify itself in its first chat message with explicit role wording such as `Working as coder agent.`

**Example flow using OpenCode:**

```
You: "Implement user authentication for the API"

Supervisor (main conversation):
  1. Creates agent/tasks/task-012.md from your request
  2. Spawns planner sub-agent → reads task-012.md → writes task-012.plan.md
  3. Spawns coder sub-agent  → reads task-012.plan.md → writes code + task-012.coder.md
  4. Spawns tester sub-agent → runs tests → writes task-012.test.md
  5. Spawns reviewer sub-agent → reads all artifacts → writes task-012.review.md
  6. If APPROVED: creates branch + PR, archives to agent/done/task-012/
  7. If CHANGES_REQUIRED: routes feedback to the appropriate stage
```

**Alternative approaches:**

- **Manual orchestration**: You invoke each agent yourself, one at a time, passing the relevant files. More control, more effort.
- **Single-session**: One AI role-plays all agents sequentially. Simpler, but context grows large on non-trivial tasks. Only suitable for small, focused changes.

### Key principle

The files in `agent/tasks/` are the message bus. Artifacts are the inter-agent protocol. The pipeline works regardless of whether agents are sub-processes, separate conversations, API calls, or human-driven.

The audit file is part of that protocol. It is the human-visible execution history for the task.

---

## Roles

| Agent | Directory | Purpose | Artifact |
|-------|-----------|---------|----------|
| Supervisor | `agent/supervisor/` | Orchestrates lifecycle and handoffs | (manages flow) |
| Architect | `agent/architect/` | Optional design stage | `<task-id>.arch.md` |
| Planner | `agent/planner/` | Converts task into executable steps | `<task-id>.plan.md` |
| Coder | `agent/coder/` | Implements the plan | `<task-id>.coder.md` + code |
| Tester | `agent/tester/` | Validates implementation | `<task-id>.test.md` |
| Reviewer | `agent/reviewer/` | Final quality gate | `<task-id>.review.md` |

All stages append execution events to `<task-id>.agents-audit.md`.

---

## Queue

- Put new tasks in `agent/tasks/`.
- Use `agent/tasks/TASK_TEMPLATE.md` as the task format.
- Store per-task artifacts in task-scoped files during execution.
- Keep `agent/tasks/<task-id>.agents-audit.md` updated throughout execution.
- Set `architecture: required` in the task metadata only when the user explicitly asked for architecture/design work.
- On completion, move task and all artifacts to `agent/done/<task-id>/`.

## Agent Audit Log

Audit entry format:

```text
YYYY-MM-DD HH:MM:SS
<agent-name>
<short action description>
```

Minimum required events:

- stage started
- handoff to next stage
- retry received
- task blocked
- stage completed

---

## Task Status Lifecycle

```
queued ──> in_progress ──> planning ──> implementing ──> testing ──> reviewing
                                ^            ^              ^           |
                                |            |              |           v
                                |            +──────────────+───── changes_required
                                |                                      |
                                +──────────────────────────────────────+
                                                                       |
                                                                  (max retries exceeded)
                                                                       v
reviewing ──> approved ──> pr_created ──> done                      blocked
```

Valid statuses: `queued`, `in_progress`, `planning`, `implementing`, `testing`, `reviewing`, `changes_required`, `approved`, `pr_created`, `done`, `blocked`.

The supervisor updates the task status at each transition.

---

## Feedback and Retry Loop

When the reviewer returns `CHANGES_REQUIRED` or the tester reports failures:

1. The supervisor reads the failure details from the test or review report.
2. The supervisor classifies the issue and routes to the correct agent:
   - **Plan-level issue** (missing requirements, wrong approach) → back to planner
   - **Implementation issue** (bugs, incorrect logic, missing code) → back to coder
   - **Test gaps** (missing test coverage, failing tests) → back to coder
   - **Domain-brain inconsistency** (missing doc updates) → back to coder
3. The receiving agent gets the feedback as additional input alongside the original artifacts.
4. After the fix, the pipeline resumes from that agent forward (coder fix → re-run tester → re-run reviewer).
5. **Retry limits**: maximum 2 retry cycles per task. If still failing after 2 retries, the supervisor sets status to `blocked` and stops. Human intervention is required.

---

## Pipelines

Default:

```
tasks -> supervisor -> planner -> coder -> tester -> reviewer -> PR handoff -> done
```

Optional (when `architecture: required`):

```
tasks -> supervisor -> architect -> planner -> coder -> tester -> reviewer -> PR handoff -> done
```
