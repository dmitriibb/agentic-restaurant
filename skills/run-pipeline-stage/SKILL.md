name: run-pipeline-stage
description: Execute a multi-agent pipeline stage by launching a subagent with a dedicated agent role. MUST be used by the supervisor for every execution stage in the pipeline.
trigger: When the supervisor needs to hand off work to planner, coder, tester, reviewer, architect, or task-splitter.

## Rules

- The supervisor MUST use `runSubagent` to execute each pipeline stage. This is mandatory, not optional.
- The supervisor MUST NOT role-play or simulate another agent's work within its own context.
- Each subagent invocation creates a fresh execution context — this satisfies the `fresh_agent_context_per_stage` requirement.
- The supervisor MUST pass all required context to the subagent in the prompt since subagent invocations are stateless.
- The supervisor MUST wait for the subagent result before proceeding to the next stage.

## Procedure

### 1. Prepare the subagent prompt

The prompt MUST include:

- The agent role and its instructions file path: `agent/<role>/AGENT.md`
- The task file path and task id
- All relevant artifact paths (plan, coder notes, test report, source architecture, etc.)
- The specific action expected (e.g., "create implementation plan", "implement the plan", "run tests", "review code")
- Instruction to read `AGENTS.md` for global rules
- Instruction to use `get-local-time` skill (read `skills/get-local-time/SKILL.md`) for all timestamps
- Instruction to append audit log entries to the audit file
- Any feedback from previous stages (for retries)

### 2. Invoke the subagent

```
runSubagent with prompt containing all context above
```

### 3. Process the result

- Read the subagent's response
- Verify the required artifact was produced
- Verify audit log entries were appended
- Update task status
- Append supervisor audit entry for the stage transition
- Proceed to next stage or handle failure

## Subagent Prompt Template

Below is the template the supervisor should use. Fill in the bracketed values:

```
You are the [ROLE] agent. Read and follow your instructions from agent/[ROLE]/AGENT.md and the global rules from AGENTS.md.

Your first message must be: "Working as [ROLE] agent."

**MANDATORY**: Before writing ANY timestamp, use the get-local-time skill. Read skills/get-local-time/SKILL.md for instructions. Run `Get-Date -Format "yyyy-MM-dd HH:mm:ss"` in the terminal and use the REAL time returned. NEVER fabricate timestamps.

Task: [TASK_ID]
Task file: agent/tasks/[TASK_ID].md
Audit log: agent/tasks/[TASK_ID].agents-audit.md

[ADDITIONAL CONTEXT — plan path, source architecture path, feedback, etc.]

Execute your stage fully. Produce the required artifact. Append your audit log entries (Received + Completed) with real timestamps. Report back what you did and the result.
```

## Anti-Patterns (MUST NOT DO)

- Supervisor reading an agent's AGENT.md and doing the work itself — this is role-playing, not multi-agent execution.
- Writing audit entries for an agent that never ran as a subagent — this is fabrication.
- Skipping subagent invocation "for efficiency" — every stage must have its own execution context.
- Passing insufficient context to the subagent and then fixing up the result in the supervisor context.

## Validation

- Every execution-stage audit entry must have been written by an actual subagent invocation, not by the supervisor.
- If the audit log shows stage entries but no `runSubagent` call was made for that stage, the execution is invalid.
