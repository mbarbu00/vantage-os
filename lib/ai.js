import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const MODEL = 'claude-sonnet-4-5';

/**
 * Single text completion. Returns the concatenated text content.
 */
export async function complete(prompt, { system, maxTokens = 4096 } = {}) {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
  });
  return msg.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

/**
 * Two-pass JSON extraction — the decision that solved persistent JSON parse
 * failures. Pass 1: Claude extracts intelligence as plain prose with no JSON
 * pressure, so verbatim quotes containing em-dashes, smart quotes, and nested
 * punctuation come through clean. Pass 2: a second call converts that prose to
 * strict JSON. Never ask Claude to do verbatim extraction and JSON formatting
 * in the same breath.
 */
export async function extractThenStructure({ extractPrompt, extractSystem, structurePrompt, structureSystem, maxTokens = 4096 }) {
  const prose = await complete(extractPrompt, { system: extractSystem, maxTokens });

  const jsonText = await complete(
    `${structurePrompt}\n\nHere is the source material to convert:\n\n${prose}`,
    { system: structureSystem, maxTokens }
  );

  return { prose, json: safeParseJson(jsonText) };
}

/**
 * Strips markdown fences and parses. Returns null on failure rather than
 * throwing so callers can degrade gracefully.
 */
export function safeParseJson(text) {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Last resort: grab the outermost JSON object/array.
    const match = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Generates an unguessable share token for client-facing artifact links.
 */
export function makeShareToken() {
  return crypto.randomBytes(18).toString('base64url');
}

/**
 * The verbatim-only constraint, centralized. This is the single most important
 * rule in the system: it feeds real capital campaigns, so fabrication is
 * unacceptable. Injected into every extraction system prompt.
 */
export const VERBATIM_CONSTRAINT = `CRITICAL ACCURACY RULES — these are non-negotiable:
- Every quote must be VERBATIM, copied word-for-word from the transcript. Never paraphrase a paraphrase as a quote.
- Never infer, embellish, or fabricate. If something was not said, it does not exist.
- If you are unsure whether text is a real quote, do not include it as a quote.
- Tag every quote to its speaker, role, and date.
This intelligence supports real strategic and funding decisions. Inaccuracy causes real harm.`;
