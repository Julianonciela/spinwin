# spinwin: rules for every session

Owner: Juliano. Reply in French, short. Code, commits and technical docs in English.

## Front-end rule (ALWAYS, no exception)
Every page is built MOBILE FIRST and must work on iPhone, Android, tablet, laptop and desktop: no horizontal scroll,
nothing cut off, photos centered and framed for portrait, tap targets >= 44 px, body text >= 16 px.
Load skill `mobile-first` before writing front-end code, and pass its gate before saying done or deploying:
`node .claude/skills/mobile-first/check.cjs <url-or-local-build>` (8 screens, exit 1 = not done). Report PASS/FAIL per screen.

## Token economy
Read only what you need (grep, offset/limit). Never open large images/videos unless asked. Do not load MCP tools the
task does not need. No subagents or workflows for small tasks. Ask before paid generations (credits).
