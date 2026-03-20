# UI Design with Penpot MCP

## When to use this skill
Apply this skill whenever a task involves reading, creating, or updating UI designs, wireframes, or frontend layout specs using the Penpot MCP.

## Context
We use Penpot as our primary design tool. We utilize the Penpot MCP server to programmatically interact with these designs—such as executing code using the `mcp_penpot_execute_code` tool to draw boards, read properties, layout containers or fetch design assets directly.

## Rules for Using Penpot MCP
1. **Understand Penpot API First:** Call `mcp_penpot_high_level_overview` once to grasp the layout mechanism (groups, boards, flex layout, shapes, positioning).
2. **Execute Canvas Refactoring:** Use `mcp_penpot_execute_code` effectively via typical JS scripts accessing `penpot.root`. Use `if (page.children) { ...c.remove() }` to clear and redraw or dynamically find and update specific named boards. 
3. **Responsive Mindset:** Whenever requested to create UI designs, make separate logically named boards for common device viewports: Desktop (e.g. 1280x800), Tablet (e.g. 768x1024), and Mobile (e.g. 390x844).
4. **Coordinate UI code & Rules:** Before coding UI (React/HTML/CSS), extract exact hex colors, spacings, and sizes from the Penpot reference, and keep them consistent with `docs/ui-design-rules.md`.

## Troubleshooting (MCP Not Reachable)
If the Penpot MCP tools are unavailable, failing, or not reachable, stop the execution or before failing, tell the user the following exact steps to resolve the connection:

1. use penpot project 
2. cd mcp
3. npm install
4. npm run bootstrap
5. open penpot project file (in browser) and do "Ctrl + Alt + P"
6. put "http://localhost:4400/manifest.json"
7. click "Connect to MCP server"
8. keep terminal and MCP window open and running