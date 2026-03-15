name: run-pipeline-stage
description: Execute a multi-agent pipeline stage by launching a subagent with a dedicated agent role. MUST be used by the supervisor for every execution stage in the pipeline.
trigger: When the supervisor needs to hand off work to planner, coder, tester, reviewer, architect, or task-splitter.

## Core Requirement

Each pipeline stage MUST execute in a fresh, isolated agent context — NOT in the supervisor's own context. The supervisor orchestrates; it does not role-play other agents.

## Rules

- The supervisor MUST delegate each pipeline stage to a separate agent execution context.
- The supervisor MUST NOT role-play or simulate another agent's work within its own context.
- Each stage execution creates a fresh context — this satisfies the `fresh_agent_context_per_stage` requirement.
- The supervisor MUST pass all required context to the sub-agent since each invocation is stateless.
- The supervisor MUST wait for the sub-agent result before proceeding to the next stage.

## Platform-Specific Delegation Mechanism

Different AI coding tools provide different mechanisms for creating fresh agent contexts. Use whichever mechanism your platform provides:

| Platform | Mechanism | How to invoke |
|----------|-----------|---------------|
| GitHub Copilot (VS Code) | `runSubagent` tool | Call the `runSubagent` tool with the agent prompt |
| Codex (VS Code / CLI) | Native multi-agent orchestration | Use the platform's built-in agent delegation (Codex handles sub-agent spawning at the infrastructure level) |
| OpenCode | `Task` tool (subagent) | Call the `Task` tool with `subagent_type: "general"` and a prompt containing the full agent context. Each `Task` call creates a fresh, isolated context window. The supervisor MUST use `Task` — never role-play agents in its own context. |
| Other tools | Check available tools | Look for any tool that creates an isolated agent execution context |

**If no sub-agent mechanism is available**: The agent must state this limitation clearly in the audit log and proceed with the best available isolation (e.g., explicit context reset). It must NOT silently role-play multiple agents without disclosure.

## Procedure

### 1. Prepare the sub-agent context

The context passed to the sub-agent MUST include:

- The agent role and its instructions file path: `agent/<role>/AGENT.md`
- The task file path and task id
- All relevant artifact paths (plan, coder notes, test report, source architecture, etc.)
- The specific action expected (e.g., "create implementation plan", "implement the plan", "run tests", "review code")
- Instruction to read `AGENTS.md` for global rules
- Instruction to use `get-local-time` skill (read `skills/get-local-time/SKILL.md`) for all timestamps
- Instruction to append audit log entries to the audit file
- Any feedback from previous stages (for retries)

### 2. Invoke the sub-agent

Use the platform-appropriate mechanism from the table above to delegate.

For **GitHub Copilot**, this is:

```
runSubagent with prompt containing all context above
```

For **OpenCode**, this is:

```
Task tool call with:
  subagent_type: "general"
  description: "<role> stage for <task-id>"
  prompt: "<full sub-agent prompt from template above>"
```

Each `Task` call spawns a new agent session with its own independent context window. The sub-agent does NOT inherit the supervisor's conversation history. The supervisor receives a single text message back when the sub-agent finishes.

**OpenCode-specific rules:**
- The supervisor MUST use the `Task` tool for every pipeline stage. There are no exceptions.
- The supervisor MUST NOT read an agent's `AGENT.md` and perform the work itself. That is role-playing, not delegation.
- The supervisor MUST NOT write audit log entries on behalf of a sub-agent. If an audit entry exists but no `Task` call was made for that stage, the execution is invalid.
- If the supervisor's context is growing large, this is expected — each `Task` call offloads the heavy work to a fresh context. The supervisor only accumulates short result summaries.

For **Codex** and other platforms, use the native delegation mechanism — the key requirement is a **fresh execution context**, not a specific tool name.

### 3. Process the result

- Read the sub-agent's response
- Verify the required artifact was produced
- Verify audit log entries were appended
- Update task status
- Append supervisor audit entry for the stage transition
- Proceed to next stage or handle failure

## Sub-Agent Prompt Template

When the platform requires the supervisor to construct a prompt for the sub-agent (e.g., Copilot's `runSubagent`, OpenCode's `Task` tool), use this template. Fill in the bracketed values:

```
You are the [ROLE] agent. Read and follow your instructions from agent/[ROLE]/AGENT.md and the global rules from AGENTS.md.

Your first message must be: "Working as [ROLE] agent."

**MANDATORY**: Before writing ANY timestamp, use the get-local-time skill. Read skills/get-local-time/SKILL.md for instructions. Run `Get-Date -Format "yyyy-MM-dd HH:mm:ss"` (Windows) or `date "+%Y-%m-%d %H:%M:%S"` (Linux/macOS) in the terminal and use the REAL time returned. NEVER fabricate timestamps.

Task: [TASK_ID]
Task file: agent/tasks/[TASK_ID].md
Audit log: agent/tasks/[TASK_ID].agents-audit.md

[ADDITIONAL CONTEXT — plan path, source architecture path, feedback, etc.]

Execute your stage fully. Produce the required artifact. Append your audit log entries (Received + Completed) with real timestamps. Report back what you did and the result.
```

## Anti-Patterns (MUST NOT DO)

- Supervisor reading an agent's AGENT.md and doing the work itself — this is role-playing, not multi-agent execution.
- Writing audit entries for an agent that never ran as a sub-agent — this is fabrication.
- Skipping sub-agent invocation "for efficiency" — every stage must have its own execution context.
- Passing insufficient context to the sub-agent and then fixing up the result in the supervisor context.
- Hardcoding a platform-specific tool name and failing when the tool doesn't exist — use what the platform provides.

## Validation

- Every execution-stage audit entry must have been written by an actual sub-agent invocation, not by the supervisor.
- If the audit log shows stage entries but no sub-agent delegation occurred for that stage, the execution is invalid.
