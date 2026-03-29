# SC23 Agent Rules

## Branch Safety
- Always verify the current branch before editing files.
- Never commit, push, or make direct feature work on `main`.

## Task Completion Notification
- After finishing any user-requested implementation task or meaningful milestone, send a Telegram completion alert.
- Use `npm run notify:telegram -- "<short summary>"`.
- If the notification fails, mention that failure explicitly in the final response.
- If the user explicitly asks not to send a notification, skip it for that task.

## Scope
- Keep notifications short and factual.
- Include what changed rather than verbose logs.
