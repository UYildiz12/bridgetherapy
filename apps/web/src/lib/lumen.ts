import "server-only";
import { GoogleGenAI } from "@google/genai";

/**
 * Lumen - the journaling companion. A thin wrapper over the Gemini
 * Interactions API. Lumen helps a patient explore and clarify a journal
 * entry; it is explicitly not a therapist and does not diagnose.
 *
 * Configure with `AI_key` and optionally `LUMEN_MODEL`.
 */

const MODEL = process.env.LUMEN_MODEL ?? "gemini-3.1-flash-lite";

export function lumenConfigured(): boolean {
  return Boolean(process.env.AI_key);
}

export interface LumenTurn {
  role: "USER" | "LUMEN";
  content: string;
}

export interface LumenContext {
  entryTitle?: string | null;
  entryContent: string;
  voiceNote?: { mimeType: string; dataBase64: string };
  concerns?: string[];
  recentMoods?: { score: number; tags: string[] }[];
}

const SUPPORTED_AUDIO_MIME_TYPES = new Set([
  "audio/wav",
  "audio/mp3",
  "audio/aiff",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
  "audio/mpeg",
  "audio/m4a",
  "audio/l16",
  "audio/opus",
  "audio/alaw",
  "audio/mulaw",
]);

function baseMimeType(mimeType: string) {
  return mimeType.split(";")[0].trim().toLowerCase();
}

function voiceNoteInput(voiceNote: NonNullable<LumenContext["voiceNote"]>) {
  const originalMimeType = baseMimeType(voiceNote.mimeType);
  const mimeType =
    originalMimeType === "audio/x-wav"
      ? "audio/wav"
      : originalMimeType === "audio/x-m4a" || originalMimeType === "audio/mp4"
        ? "audio/m4a"
        : originalMimeType;

  if (mimeType === "audio/webm" || mimeType === "video/webm") {
    return {
      type: "video" as const,
      data: voiceNote.dataBase64,
      mime_type: "video/webm",
    };
  }

  return {
    type: "audio" as const,
    data: voiceNote.dataBase64,
    mime_type: SUPPORTED_AUDIO_MIME_TYPES.has(mimeType) ? mimeType : originalMimeType,
  };
}

const SYSTEM = `You are Lumen, a warm, grounded reflection companion inside Bridge, a CBT-based therapy app.

Your role:
- Help the person explore, clarify, and deepen the journal entry they are working on. Draw out the situation, the automatic thoughts, the feelings and body signals, and the patterns underneath.
- Ask one focused, gentle, curious question at a time. Prefer reflecting back what you heard over giving advice.
- Use plain, human language. Keep replies short, usually 2 to 4 sentences.
- When useful, offer a small CBT-flavored reframe or a concrete next reflection, but always tentatively and with the person's consent.

Boundaries:
- You are not a therapist and you do not diagnose, prescribe, or give medical or crisis advice.
- If the person mentions self-harm, harming others, or being in danger, gently and directly encourage them to contact their therapist or a local crisis line right away.
- Never claim to be a human or to replace professional care. You complement the work they do with their therapist.

Style: calm, validating, never saccharine. No emoji. No em dashes.`;

/**
 * Ask Lumen for the next reply given the entry context and the conversation so
 * far. Throws when `AI_key` is not configured.
 */
export async function askLumen(ctx: LumenContext, thread: LumenTurn[]): Promise<string> {
  const apiKey = process.env.AI_key;
  if (!apiKey) throw new Error("AI_key is not configured");

  const contextBlock = [
    ctx.entryTitle ? `Entry title: ${ctx.entryTitle}` : null,
    `The entry I am reflecting on:\n${ctx.entryContent || "(still blank)"}`,
    ctx.voiceNote
      ? "The reflection also includes an attached voice note. Listen to the audio and use it as part of the reflection context."
      : null,
    ctx.concerns?.length ? `Focus areas from my intake: ${ctx.concerns.join(", ")}.` : null,
    ctx.recentMoods?.length
      ? `My recent mood check-ins: ${ctx.recentMoods
          .map((m) => `${m.score}/10${m.tags.length ? ` (${m.tags.join(", ")})` : ""}`)
          .join("; ")}.`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const transcript = thread
    .map((turn) => `${turn.role === "USER" ? "Patient" : "Lumen"}: ${turn.content}`)
    .join("\n\n");
  const input = [
    contextBlock,
    transcript ? `Conversation so far:\n${transcript}` : null,
    "Write Lumen's next reply.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const interactionInput = ctx.voiceNote
    ? [
        { type: "text" as const, text: input },
        voiceNoteInput(ctx.voiceNote),
      ]
    : input;

  const ai = new GoogleGenAI({ apiKey });
  const interaction = await ai.interactions.create({
    model: MODEL,
    input: interactionInput,
    system_instruction: SYSTEM,
    response_modalities: ["text"],
    generation_config: {
      temperature: 0.4,
      max_output_tokens: 700,
    },
    store: false,
  });

  const text = interaction.output_text?.trim();
  if (!text) throw new Error("Lumen returned an empty response.");
  return text;
}
