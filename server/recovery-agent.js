import OpenAI from "openai";

const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "hypothesis",
    "confidence",
    "evidence_used",
    "rejected_alternatives",
    "recommended_route",
    "action_bundle",
    "approval_rationale",
  ],
  properties: {
    hypothesis: { type: "string" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    evidence_used: { type: "array", items: { type: "string" } },
    rejected_alternatives: { type: "array", items: { type: "string" } },
    recommended_route: {
      type: "string",
      enum: ["support", "billing", "adoption", "human_review", "block"],
    },
    action_bundle: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["tool", "action", "reason", "requires_approval"],
        properties: {
          tool: { type: "string" },
          action: { type: "string" },
          reason: { type: "string" },
          requires_approval: { type: "boolean" },
        },
      },
    },
    approval_rationale: { type: "string" },
  },
};

export async function reasonAboutRecovery(account, evidence) {
  if (!process.env.OPENAI_API_KEY)
    throw new Error("OPENAI_API_KEY is required to run the reasoning agent.");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.AGENT_MODEL || "gpt-5-mini",
    store: false,
    instructions: `You are RevenueRescue, a cautious B2B revenue-operations agent. Reason only from supplied evidence. Find the most plausible recoverable cause, reject unsupported claims, and choose exactly one route. Never propose external contact for do-not-contact or legal-escalation accounts; choose block. For enterprise accounts, every external write must require approval. Return only the requested structured object.`,
    input: JSON.stringify({ account, evidence }),
    text: {
      format: {
        type: "json_schema",
        name: "recovery_plan",
        strict: true,
        schema,
      },
    },
  });
  return {
    model: process.env.AGENT_MODEL || "gpt-5-mini",
    responseId: response.id,
    ...JSON.parse(response.output_text),
  };
}
