# AGENTS

General repository guidance for automated coding agents.

## Scope
- Apply these instructions to all tasks in this repository unless the task requests otherwise.
- Keep changes minimal and focused on the requested work.

## Workflow
- Prefer `rg` for searching.
- Avoid modifying `dist/` unless the user explicitly asks for built artifacts.
- Update documentation when behavior changes or new configuration options are added.
- Run tests or build commands only if requested or clearly needed to validate a change.

## Style
- Keep edits in existing file style and formatting.
- Add brief comments only when logic is non-obvious.

## Output
- In responses, reference changed files with inline code paths.
- Suggest next steps (tests/build) only when relevant.
