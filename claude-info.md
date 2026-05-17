# About Claude

Claude is a family of large language models developed by Anthropic, an AI safety company founded in 2021.

## Model Family (Claude 4.x)

| Model | Model ID | Strengths |
|-------|----------|-----------|
| Claude Opus 4.7 | `claude-opus-4-7` | Most capable; deep reasoning, complex coding, long-horizon agentic tasks |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | Balanced performance and speed for everyday production workloads |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | Fastest and most cost-efficient for high-volume, low-latency tasks |

## Key Capabilities

- **1M token context window** (Opus 4.7) — long documents, large codebases, extended conversations
- **Extended thinking** — visible step-by-step reasoning before producing a final answer
- **Tool use** — function calling, code execution, file handling, web search
- **Vision** — reading images, screenshots, diagrams, and PDFs natively
- **Prompt caching** — large reductions in cost and latency for repeated context
- **Multilingual** — strong performance across English, Danish, and most major languages

## How People Use Claude

- **Claude Code** — Anthropic's official CLI for software engineering: refactoring, code review, debugging, full feature builds
- **Claude API** — direct integration via `@anthropic-ai/sdk` or the Python `anthropic` package
- **Claude apps** — chat on web, desktop (macOS/Windows), and mobile
- **Claude Agent SDK** — building custom autonomous agents on top of Claude

## Design Principles

Anthropic builds Claude around three ideas:

1. **Helpful** — produce useful, accurate, complete answers
2. **Harmless** — refuse genuinely dangerous requests, avoid manipulation
3. **Honest** — acknowledge uncertainty, decline to fabricate, cite sources where possible

## Knowledge Cutoff

Claude Opus 4.7's training data extends to January 2026.

---

_Last updated: 2026-05-17_
