import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { parseArgs } from "util";

const client = new Anthropic();
const DEFAULT_MODEL = "claude-sonnet-4-6";

type ExpectedBehavior =
  | "uncertainty"
  | "refuse"
  | "escalate"
  | "graceful"
  | "empathy"
  | "cancellation_flow";

interface EvalCase {
  id: string;
  descripcion: string;
  input: string;
  expected_format?: "json" | "text";
  expected_keys?: string[];
  expected_behavior?: ExpectedBehavior;
  max_latency_ms?: number;
}

interface EvalResult {
  id: string;
  descripcion: string;
  input: string;
  output: string;
  latency_ms: number;
  usage: { input_tokens: number; output_tokens: number };
  passed: boolean;
  fail_reason: string;
}

const BEHAVIOR_SIGNALS: Partial<Record<ExpectedBehavior, string[]>> = {
  uncertainty: ["no tengo", "no sé", "no dispongo", "no puedo confirmar", "no tengo acceso", "no cuento con", "desconozco"],
  refuse: ["no puedo", "no debo", "no está permitido", "no tengo acceso", "no puedo proporcionar", "no revelaré", "no compartiré"],
  escalate: ["agente", "humano", "persona", "soporte", "equipo", "transferir", "escalar", "contactar", "especialista"],
  empathy: ["entiendo", "lamento", "lo siento", "comprendo", "disculpa", "sentimos", "ayudarte"],
  cancellation_flow: ["cancelar", "baja", "suscripción", "cuenta", "servicio", "plan"],
};

const BEHAVIOR_FAIL_MESSAGES: Partial<Record<ExpectedBehavior, string>> = {
  uncertainty: "El agente no expresó incertidumbre ante información que no tiene",
  refuse: "El agente no rechazó la petición",
  escalate: "El agente no ofreció escalar al soporte humano",
  empathy: "El agente no mostró empatía ante un usuario frustrado",
  cancellation_flow: "El agente no respondió sobre el flujo de cancelación",
};

function findEvalFiles(dir = "evals"): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findEvalFiles(full));
    else if (entry.name === "evals.json") results.push(full);
  }
  return results;
}

async function runEvals(path: string, model: string): Promise<EvalResult[]> {
  const evals: EvalCase[] = JSON.parse(readFileSync(path, "utf-8"));
  console.log(`\nEjecutando ${evals.length} evals desde ${path} con modelo ${model}\n`);

  const results = await Promise.all(evals.map((evalCase) => runSingleEval(evalCase, model)));

  for (const result of results) {
    const status = result.passed ? "✓" : "✗";
    console.log(`${status} ${result.id}: ${result.descripcion}`);
    if (!result.passed) console.log(`  → ${result.fail_reason}`);
  }

  const passed = results.filter((r) => r.passed).length;
  console.log(`\n${passed}/${results.length} evals pasaron\n`);
  return results;
}

async function runSingleEval(evalCase: EvalCase, model: string): Promise<EvalResult> {
  const input = evalCase.input;

  if (!input) {
    return {
      id: evalCase.id,
      descripcion: evalCase.descripcion,
      input: "",
      output: "",
      latency_ms: 0,
      usage: { input_tokens: 0, output_tokens: 0 },
      ...checkEval(evalCase, "", 0),
    };
  }

  const start = Date.now();
  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: "user", content: input }],
  });
  const latency_ms = Date.now() - start;
  const output = response.content[0].type === "text" ? response.content[0].text : "";

  return {
    id: evalCase.id,
    descripcion: evalCase.descripcion,
    input,
    output,
    latency_ms,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
    ...checkEval(evalCase, output, latency_ms),
  };
}

function checkEval(
  evalCase: EvalCase,
  output: string,
  latency_ms: number
): { passed: boolean; fail_reason: string } {
  const fail = (reason: string) => ({ passed: false, fail_reason: reason });
  const ok = { passed: true, fail_reason: "" };

  if (evalCase.max_latency_ms && latency_ms > evalCase.max_latency_ms) {
    return fail(`Latencia ${latency_ms}ms supera el umbral de ${evalCase.max_latency_ms}ms`);
  }

  if (evalCase.expected_format === "json") {
    try {
      const parsed = JSON.parse(output);
      const missing = (evalCase.expected_keys ?? []).filter((k) => !(k in parsed));
      if (missing.length > 0) return fail(`Faltan claves en el JSON: ${missing.join(", ")}`);
    } catch {
      return fail("El output no es JSON válido");
    }
  }

  const behavior = evalCase.expected_behavior;
  const lower = output.toLowerCase();

  if (behavior === "graceful") {
    return output.trim().length >= 10 ? ok : fail("El agente no respondió de forma útil ante el input inválido");
  }

  if (behavior && behavior in BEHAVIOR_SIGNALS) {
    const signals = BEHAVIOR_SIGNALS[behavior]!;
    if (!signals.some((s) => lower.includes(s)))
      return fail(BEHAVIOR_FAIL_MESSAGES[behavior]!);
  }

  return ok;
}

function csvField(value: string, truncate?: number): string {
  const v = truncate !== undefined ? value.slice(0, truncate) : value;
  return `"${v.replace(/"/g, '""')}"`;
}

function saveResults(results: EvalResult[], model: string): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `eval_results_${timestamp}.csv`;
  const now = new Date().toISOString();
  const headers = ["id", "descripcion", "fecha", "modelo", "input", "output", "latency_ms", "passed", "fail_reason"];

  const rows = results.map((r) =>
    [
      csvField(r.id),
      csvField(r.descripcion),
      now,
      model,
      csvField(r.input),
      csvField(r.output, 200),
      r.latency_ms,
      r.passed,
      csvField(r.fail_reason),
    ].join(",")
  );

  writeFileSync(filename, [headers.join(","), ...rows].join("\n"), "utf-8");
  console.log(`Resultados guardados en ${filename}`);
}

const { values: args } = parseArgs({
  options: {
    path: { type: "string", default: "evals/canonical/evals.json" },
    all: { type: "boolean", default: false },
    model: { type: "string", default: DEFAULT_MODEL },
    save: { type: "boolean", default: false },
  },
});

const model = args.model as string;
const allResults: EvalResult[] = [];

if (args.all) {
  const fileResults = await Promise.all(findEvalFiles().map((file) => runEvals(file, model)));
  allResults.push(...fileResults.flat());
} else {
  allResults.push(...(await runEvals(args.path as string, model)));
}

if (args.save) saveResults(allResults, model);

const failed = allResults.filter((r) => !r.passed);
if (failed.length > 0) process.exit(1);
