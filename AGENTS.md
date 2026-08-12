# CombatBound Idle — Agent Rules

- Keep screen-specific files inside their screen folders.
- Keep gameplay definitions inside `src/game/data` and permanent state inside the gameplay domain.
- Preserve the persistent sidebar, top status bar, and bottom activity bar.
- Treat Combat as the highest-priority screen.
- Keep stable semantic `data-debug-*` attributes for the UI Inspector.
- Keep App.tsx and AppShell.tsx small.
- Do not add an editable layout system or profession screens without explicit direction.
