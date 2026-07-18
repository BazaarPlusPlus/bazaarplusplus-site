# BazaarPlusPlus Site Docs

The code is the source of truth. Current implementation guidance lives in one architecture document plus compact decision records. Historical working documents live in git history, not in the active tree. This file is the single documentation map.

## Current Docs

- [MEMORY.md](MEMORY.md) — dense, agent-facing durable knowledge. **Load this first.**
- [ARCHITECTURE.md](ARCHITECTURE.md) — living architecture and data-flow summary for the current code (the structure/overview layer).
- [../CONTEXT.md](../CONTEXT.md) — project vocabulary (glossary only).
- [agents/](agents/) — per-repo config for the engineering skills (issue tracker, triage labels, domain-doc consumer rules).

## Decision records (`adr/`)

ADRs retain only the decision, its load-bearing rationale, guardrails, and current code evidence. They may be corrected or compressed during consolidation when the code has drifted. None exist yet; the directory is created with the first ADR, numbering starts at 0001 and is never reused.

## Future Work

Task plans, feature requests, and bugs are tracked as **GitHub issues** (see [agents/issue-tracker.md](agents/issue-tracker.md)), not repo docs.

`drafts/` is the write buffer for **knowledge documents only** — design records, root-cause analyses, and decision/option analyses produced mid-session. Task plans do not go there. Consolidation promotes durable outcomes into MEMORY/ADR/ARCHITECTURE, moves actionable work to GitHub Issues, and deletes the spent draft; the directory therefore exists only while unswept drafts are pending.

## Agent Rules

Agent rules and project-specific operating constraints live in [../CLAUDE.md](../CLAUDE.md). `AGENTS.md` is a symlink to that file.
