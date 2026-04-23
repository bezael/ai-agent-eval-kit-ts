# AI Agent Eval Kit — TypeScript

> Sube agentes a producción con confianza — no con esperanza.

Un conjunto de evaluaciones listas para usar para agentes de IA: casos de test, script de ejecución y plantilla de registro de resultados.

## ¿Qué problema resuelve?

La mayoría de devs prueba su agente manualmente un par de veces, ve que responde bien y lo sube a producción.

Dos semanas después el agente falla y nadie sabe cuándo empezó.

Este kit te da el sistema mínimo viable para evaluar tus agentes de forma sistemática — tanto antes del primer deploy como después de cada cambio de prompt o modelo.

## Contenido

```
evals/
├── canonical/          # 10 evals que aplican a cualquier agente
│   └── evals.json
└── customer-support/   # 5 evals para agentes de soporte al cliente
    └── evals.json
eval_runner.ts          # Script principal
package.json
tsconfig.json
```

## Inicio rápido

```bash
git clone https://github.com/bezael/ai-agent-eval-kit-ts
cd ai-agent-eval-kit-ts
npm install
export ANTHROPIC_API_KEY=sk-...
npm run eval
```

Resultado esperado:

```
Ejecutando 10 evals desde evals/canonical/evals.json

✓ fmt-001: Respuesta en formato JSON válido
✓ hal-001: No alucina datos que no tiene
✓ inv-001: Maneja input vacío sin crashear
...
10/10 evals pasaron
```

## Comandos disponibles

```bash
npm run eval              # Ejecuta los evals canónicos
npm run eval:all          # Ejecuta todos los evals de todas las carpetas
npm run eval:save         # Ejecuta todos y guarda resultados en CSV
```

O con opciones manuales:

```bash
# Dominio específico
npx tsx eval_runner.ts --path evals/customer-support/evals.json

# Modelo diferente
npx tsx eval_runner.ts --model claude-opus-4-7

# Guardar resultados
npx tsx eval_runner.ts --all --save
```

## Estructura de un eval

```json
{
  "id": "fmt-001",
  "descripcion": "Respuesta en formato JSON válido",
  "input": "Dame el resumen del usuario 123",
  "expected_format": "json",
  "expected_keys": ["nombre", "email", "estado"]
}
```

Campos disponibles:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | `string` | Identificador único |
| `descripcion` | `string` | Qué prueba este eval |
| `input` | `string` | Mensaje enviado al agente |
| `expected_format` | `"json" \| "text"` | Formato esperado del output |
| `expected_keys` | `string[]` | Claves requeridas si el formato es JSON |
| `expected_behavior` | `string` | `uncertainty`, `escalate`, `refuse`, `graceful`, `empathy` |
| `max_latency_ms` | `number` | Umbral de latencia en milisegundos |

## Añadir tus propios evals

1. Crea una carpeta en `evals/tu-dominio/`
2. Añade un archivo `evals.json` con tus casos
3. Ejecuta: `npx tsx eval_runner.ts --path evals/tu-dominio/evals.json`

## Integración con CI/CD

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

## Guía completa

El PDF con la explicación detallada de cada eval, criterios de paso y plantilla de registro de resultados es exclusivo para suscriptores del newsletter **Build con IA**.

→ [Suscríbete gratis y descarga el PDF](https://dominicode.com/newsletter?source=repo_ai-agent-eval-kit-ts&topic=ai-agent)

---

Hecho por [Bezael Pérez](https://dominicode.com) · [@dominicode](https://youtube.com/@dominicode)
