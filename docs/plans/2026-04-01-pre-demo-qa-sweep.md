# Pre-Demo QA Sweep — 2026-04-01

## Goal
Systematically QA all 15 tools in Multitool before the 2026-04-02 presentation. Find and fix bugs, ensure every tab works smoothly.

## Architecture
- **Orchestrator** — manages batches, merges fixes, resolves conflicts, presents consolidated report
- **8 parallel agents max** — each gets its own worktree, unique Vite port, and 1 tool to QA
- **Testing environment**: Dev server (strict criteria)
- **Phases per tool**: Functional → Visual (structural) → Chaos → Edge Cases
- **No --visual-proof, no Phase 5/6/7**

## Batches

### Batch 1 — Least-tested, simplest tools (8 agents)
| Agent | Tool | Port | Priority |
|-------|------|------|----------|
| 1 | QR Code | 5181 | Low risk |
| 2 | Data Viewer | 5182 | Low risk |
| 3 | Image Resizer | 5183 | Medium |
| 4 | Background Remover | 5184 | Medium |
| 5 | File Compressor | 5185 | Medium |
| 6 | File Converter | 5186 | Medium |
| 7 | Org Chart | 5187 | Medium |
| 8 | Dashboard | 5188 | Medium |

### Batch 2 — Medium complexity (4 agents)
| Agent | Tool | Port | Priority |
|-------|------|------|----------|
| 1 | Form Builder | 5181 | High |
| 2 | Flow Chart | 5182 | High |
| 3 | PDF Merge | 5183 | High |
| 4 | PDF Split | 5184 | High |

### Batch 3 — Documents + Annotate sanity (3 agents)
| Agent | Tool | Port | Priority |
|-------|------|------|----------|
| 1 | PDF Watermark | 5181 | Medium |
| 2 | Text Extract | 5182 | Medium |
| 3 | PDF Annotate (sanity) | 5183 | Critical |

## Per-Agent Process
1. Create worktree + install deps
2. Start Vite dev server on assigned port
3. Read source code + existing tests for the tool
4. Generate functional tests (happy paths, exports, core workflows)
5. Generate chaos tests (rapid clicks, edge inputs, interrupts)
6. Run → auto-fix → rerun until green
7. Flaky check (--repeat-each=3)
8. Report: bugs found, fixes applied, confidence level

## Between Batches
- Merge all agent fixes to single branch
- Resolve conflicts
- Run cross-tool regression
- Start next batch

## Output
- Consolidated report per tool: bugs/fixes/severity/files modified
- Single branch with all fixes
- User approval required before merge

## Follow-Up (after sweep)
- PDF Annotate --visual-proof / VVP
- UI/UX layout redesign brainstorm (icon overload → dropdowns with labels)
