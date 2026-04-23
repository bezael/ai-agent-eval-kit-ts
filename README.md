# AI Agent Eval Kit — TypeScript

> Ship agents to production with confidence — not hope.

A ready-to-use evaluation suite for AI agents: test cases, a runner script, and a results log template.

## What problem does it solve?

Most devs test their agent manually a couple of times, see that it responds well, and ship it to production.

Two weeks later the agent breaks and nobody knows when it started.

This kit gives you the minimum viable system to evaluate your agents systematically — both before the first deploy and after every prompt or model change.

## Contents

```
evals/
├── canonical/          # 10 evals that apply to any agent
│   └── evals.json
└── customer-support/   # 5 evals for customer support agents
    └── evals.json
eval_runner.ts          # Main script
package.json
tsconfig.json
```

## Quick start

```bash
git clone https://github.com/bezael/ai-agent-eval-kit-ts
cd ai-agent-eval-kit-ts
npm install
export ANTHROPIC_API_KEY=sk-...
npm run eval
```

Expected output:

```
Running 10 evals from evals/canonical/evals.json

✓ fmt-001: Response in valid JSON format
✓ hal-001: Does not hallucinate data it doesn't have
✓ inv-001: Handles empty input without crashing
...
10/10 evals passed
```

## Available commands

```bash
npm run eval              # Run the canonical evals
npm run eval:all          # Run all evals from every folder
npm run eval:save         # Run all and save results to CSV
```

Or with manual options:

```bash
# Specific domain
npx tsx eval_runner.ts --path evals/customer-support/evals.json

# Different model
npx tsx eval_runner.ts --model claude-opus-4-7

# Save results
npx tsx eval_runner.ts --all --save
```

## Eval structure

```json
{
  "id": "fmt-001",
  "descripcion": "Response in valid JSON format",
  "input": "Give me the summary for user 123",
  "expected_format": "json",
  "expected_keys": ["name", "email", "status"]
}
```

Available fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `descripcion` | `string` | What this eval tests |
| `input` | `string` | Message sent to the agent |
| `expected_format` | `"json" \| "text"` | Expected output format |
| `expected_keys` | `string[]` | Required keys if format is JSON |
| `expected_behavior` | `string` | `uncertainty`, `escalate`, `refuse`, `graceful`, `empathy` |
| `max_latency_ms` | `number` | Latency threshold in milliseconds |

## Adding your own evals

1. Create a folder at `evals/your-domain/`
2. Add an `evals.json` file with your cases
3. Run: `npx tsx eval_runner.ts --path evals/your-domain/evals.json`

## CI/CD integration

```yaml
# .github/workflows/agent-evals.yml
name: Agent Evals

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  evals:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run eval:all
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Full guide

The PDF with a detailed explanation of each eval, pass criteria, and a results log template is exclusive to **Build con IA** newsletter subscribers.

→ [Subscribe for free and download the PDF](https://dominicode.com/newsletter?utm_source=repo_ai-agent-eval-kit&utm_topic=ai_agent_kit)

---

Made by [Bezael Pérez](https://dominicode.com) · [@dominicode](https://youtube.com/@dominicode)
