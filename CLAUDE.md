# Webflow Components: notes for agents

## 90five Brain: start and end of every session

This repo holds code and raw data. State, rules, worklog, meetings and tasks for **Webflow Components** live in ClickUp and are reached through the 90five Brain (knowledge MCP):

- **Start:** `context("Webflow Components")`: Current, Rules & Facts, latest worklog day, open tasks. Do not reconstruct history from files in this repo or old chats.
- **End:** `checkpoint("Webflow Components", done, tasks, aktuell?)` once per working session. Next steps only as ClickUp tasks, never as to-do lists in files.
- **Details:** `search("Webflow Components <topic>")`, then `get_page(id)`.
- Project facts and decisions go to ClickUp via checkpoint, not into Claude memory or local notes.

A Stop hook (`.claude/hooks/checkpoint-reminder.sh`) reminds you to checkpoint when files changed after the last one. If the Brain is not connected, tell the user to add the `knowledge` MCP server.
