# This file explains main rules, ideas and concepts of all UI in this repository

When working on design of UI implementation these rules and concepts must be followed

## Concepts

- All applications should look good on Desktop browser, tablet and phone
- All UI elements should be touch-screen friendly
- We need to support 3 verions:
    - Desktop and tablet landscape
    - tablet portrait
    - mobile phone portrait

- In all UI applications we need to have menu/navigaton section
    - on "Desktop and tablet landscape" this section should be on the left side of the screen and have a toggle to display or hide it. If toggle it set to display it - we display it always
    - on "tablet portrait" this section should be on top of the screen and have a toggle to display or hide it. If toggle it set to display it - we display it always
    - on "mobile phone portrait" - it should be like standart mobile apps kebab menu. it kebab butto is cliked - show it on the left side. If after that suers click somewhere on the screen - need to hide this navigation menu

- We need to supporot tex-size configuration. let't have it somehere in settings and have 3 options for text size, the default (standart) text is the smalles option. options 2 and 3 should enlarge text size for better readability on big screen or for blind people

- Overall design should look nice, simple and user-friendly. 

## Rules

- All applications should have similar design and look consistent, like it is from the sabe scosystem.
- All shared React UI primitives, theme tokens, and app-shell layout components must live in `apps/ui-common-libs`.
- `apps/ui-common-libs` is the default place to add shared buttons, cards, badges, form fields, and navigation shells before creating anything app-specific.
- Web UI applications should consume the shared exports from `apps/ui-common-libs` instead of importing raw component-library primitives directly inside app code.

