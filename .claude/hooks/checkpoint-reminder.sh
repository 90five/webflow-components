#!/bin/bash
# Claude Code Stop hook: if this session edited files after its last Brain
# checkpoint (or never checkpointed), block the stop once and ask the agent to
# call checkpoint. Portable: no absolute paths. Install in a repo's
# .claude/hooks/ and register it under "Stop" in .claude/settings.json.
INPUT=$(cat)
# Never loop: if we already blocked once in this stop sequence, let it stop.
echo "$INPUT" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true' && exit 0
T=$(echo "$INPUT" | sed -n 's/.*"transcript_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
[ -f "$T" ] || exit 0
last_work=$(grep -n -E '"name":"(Edit|Write|MultiEdit|NotebookEdit)"' "$T" | tail -1 | cut -d: -f1)
[ -z "$last_work" ] && exit 0
last_cp=$(grep -n -E '"name":"mcp__[^"]*__checkpoint"' "$T" | tail -1 | cut -d: -f1)
[ -n "$last_cp" ] && [ "$last_cp" -gt "$last_work" ] && exit 0
printf '{"decision":"block","reason":"You changed files after the last Brain checkpoint. If this was real work (not a typo fix), call checkpoint(scope, done, tasks, aktuell?) now so the worklog and tasks in ClickUp stay current, then stop. If it was trivial, just stop."}\n'
