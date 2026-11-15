---
name: ai-feature
description: Only for cases that need an AI/LLM feature in the product — how to add a Gemini call with schema, API route, prompt, rendering and fallback. Skip if the product has no AI feature.
---

# Adding an AI feature

Setup (once): `npm i @google/genai`, add `GEMINI_API_KEY` to `.env.local`, create `lib/ai.ts`:
```ts
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
export async function generateStructured<T extends z.ZodType>(schema: T, prompt: string, system?: string): Promise<z.infer<T>> {
  const res = await ai.models.generateContent({
    model, contents: prompt,
    config: { systemInstruction: system, responseMimeType: "application/json", responseJsonSchema: z.toJSONSchema(schema) },
  });
  return schema.parse(JSON.parse(res.text ?? ""));
}
```
The AI call lives in a service (`server/services/*.service.ts`), called from a route handler.

## Steps
1. **Schema** — add a Zod schema in `lib/schemas.ts`. Use `.describe()` on fields; descriptions guide the model.
   Prefer arrays of objects, enums for categories, numbers for scores. Keep it small (5-8 fields).
2. **Mock** — add a matching realistic object in `lib/mock-data.ts`.
3. **Service + route** — service calls `generateStructured(schema, prompt, system)`; the route handler validates input,
   calls the service, and on any error returns the mock with `source: "mock"`. Never expose the API key to the client.
4. **Prompt** — system prompt: role + domain context + output rules. Put the user's data in the prompt clearly
   labelled (e.g. `### Data\n...`). Ask for specific, numeric, actionable output.
5. **UI** — render each part of the JSON as its own card/badge/list (see `ui-style`). Skeleton while loading.

## Rules
- Use `generateStructured` (JSON) by default; `generateText` only for free text like a chat reply.
- Do not set `temperature`/`topP`/`topK` — newer Gemini models reject them.
- Model comes from `GEMINI_MODEL` env (default `gemini-flash-latest`). Don't hardcode model names.
- If the case gives a dataset, send only the relevant rows/summary to the model, not the whole file.
- Show *that AI did the work* in the UI: e.g. "AI analysis" label, reasoning/explanation field, confidence or score.

## Optional upgrades (only if time allows)
- Streaming text for a chat-like feel.
- Function calling: let the model call one of our functions to fetch data, then answer.
