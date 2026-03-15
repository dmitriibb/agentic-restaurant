name: get-local-time
description: Get the current local machine time. MUST be used for every audit log timestamp and any other time-sensitive output.
trigger: Before writing any timestamp in audit logs, task metadata, or any output that includes a date/time value.

## Rules

- NEVER fabricate, estimate, or hardcode timestamps.
- NEVER reuse a previously fetched timestamp for a later event. Each audit entry requires a fresh time fetch.
- Timestamps MUST come from the host machine's system clock.

## Procedure

Run this terminal command to get the current local time:

```powershell
Get-Date -Format "yyyy-MM-dd HH:mm:ss"
```

On Linux/macOS:

```bash
date "+%Y-%m-%d %H:%M:%S"
```

Use the returned value verbatim as the timestamp in the audit log entry or wherever a timestamp is needed.

## Example

Before writing an audit entry like:

```text
YYYY-MM-DD HH:MM:SS - supervisor
received task, starting pipeline coordination
```

First run `Get-Date -Format "yyyy-MM-dd HH:mm:ss"` in the terminal, get the result (e.g., `2026-03-15 15:55:31`), then write:

```text
2026-03-15 15:55:31 - supervisor
received task, starting pipeline coordination
```

## Validation

Any audit log entry with a fabricated timestamp is invalid. Reviewers should flag timestamps that don't correspond to actual execution time as a blocking issue.
