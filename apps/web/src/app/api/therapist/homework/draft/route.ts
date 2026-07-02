import { requireApprovedTherapist } from "@/lib/authz";
import {
  draftHomeworkWithGemini,
  HOMEWORK_DRAFT_MODEL,
  homeworkDraftRequestSchema,
  isRiskyHomeworkPrompt,
} from "@/lib/homework/ai-draft";
import { json, withErrorHandling } from "@/lib/http";
import { parseBody } from "@/lib/validation";

export const POST = withErrorHandling(async (req: Request) => {
  const therapist = await requireApprovedTherapist(req);
  if (!therapist.ok) return therapist.response;

  const parsed = await parseBody(req, homeworkDraftRequestSchema);
  if (!parsed.ok) return parsed.response;

  if (isRiskyHomeworkPrompt(parsed.data.prompt)) {
    return json(
      {
        error:
          "AI homework drafting is not available for crisis, emergency, or safety-plan prompts. Use live care pathways instead.",
      },
      400,
    );
  }

  const apiKey = process.env.AI_key?.trim();
  if (!apiKey) {
    return json({ error: "AI_key is not configured." }, 503);
  }

  let draft;
  try {
    draft = await draftHomeworkWithGemini(parsed.data, apiKey);
  } catch (err) {
    // Model output that fails validation (or a transient API hiccup) is not a
    // server fault worth a 500; tell the therapist to simply try again.
    console.error("homework draft failed", err);
    return json(
      { error: "The draft came back incomplete. Rephrase the brief slightly and try again." },
      502,
    );
  }

  return json(
    {
      data: {
        ...draft,
        model: HOMEWORK_DRAFT_MODEL,
        reviewRequired: true,
        guidance: "Therapist review required before assigning this set.",
      },
    },
    200,
  );
});
