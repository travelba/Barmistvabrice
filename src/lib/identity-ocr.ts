import { IdentityError } from "./identity-error";
import { applyMrz, normalizeVisualFields } from "./identity-mrz";
import { isExpiryPast, type IdentityFields, type IdentityMime } from "./identity-manifest";

export type IdentityRead = {
  fields: IdentityFields;
  warnings: string[];
};

const PROMPT = `You read a passport or a national identity card (CNI) from the attached image or PDF.
Return only the JSON object described by the schema.
Rules:
- Copy names and place of birth exactly as printed, including accents and hyphens. Do not invent characters.
- sex is M or F. If unreadable, use an empty string.
- docType is PP for a passport and CNI for a national identity card. Empty string if unsure.
- nationality is the 3-letter ICAO code printed on the document (example FRA). Empty string if unsure.
- dateOfBirth and expiryDate are YYYY-MM-DD. Empty string if unreadable.
- docNumber is the document number without spaces.
- mrzLines is the machine-readable zone, one string per line, exactly as printed (A-Z, 0-9 and <). Empty array if the MRZ is not visible.
- Leave a field empty rather than guessing.`;

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export async function readIdentityDocument(
  buf: Uint8Array,
  mime: IdentityMime,
): Promise<IdentityRead> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new IdentityError("gemini");

  const response = await requestGemini(apiKey, buf, mime);

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  let raw: Record<string, unknown>;
  try {
    raw = parseModelJson(text);
  } catch {
    throw new IdentityError("unreadable");
  }

  const mrzLines = Array.isArray(raw.mrzLines)
    ? raw.mrzLines.filter((line): line is string => typeof line === "string")
    : [];
  const visual = normalizeVisualFields({
    sex: stringField(raw.sex),
    lastName: stringField(raw.lastName),
    firstName: stringField(raw.firstName),
    dateOfBirth: stringField(raw.dateOfBirth),
    placeOfBirth: stringField(raw.placeOfBirth),
    docType: stringField(raw.docType),
    docNumber: stringField(raw.docNumber),
    nationality: stringField(raw.nationality),
    expiryDate: stringField(raw.expiryDate),
    specifications: "",
  });
  const applied = applyMrz(visual, mrzLines);
  const warnings = [...applied.warnings];
  if (!applied.fields.placeOfBirth) warnings.push("place_missing");
  if (isExpiryPast(applied.fields.expiryDate)) warnings.push("expiry_past");
  return { fields: applied.fields, warnings };
}

const RETIRED_MODELS = new Set([
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
]);

function geminiModel(): string {
  const configured = process.env.GEMINI_MODEL?.trim().replace(/^"|"$/g, "");
  if (!configured || RETIRED_MODELS.has(configured)) return "gemini-3.5-flash-lite";
  return configured;
}

function geminiModels(): string[] {
  // 3.8-flash et 3.1-flash-lite répondent souvent 503. On tente d'abord un modèle qui accepte la photo.
  return [...new Set(["gemini-3.5-flash-lite", geminiModel()])];
}

async function requestGemini(apiKey: string, buf: Uint8Array, mime: IdentityMime): Promise<Response> {
  const body = JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [
          { text: PROMPT },
          { inlineData: { mimeType: mime, data: Buffer.from(buf).toString("base64") } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          sex: { type: "STRING" },
          lastName: { type: "STRING" },
          firstName: { type: "STRING" },
          dateOfBirth: { type: "STRING" },
          placeOfBirth: { type: "STRING" },
          docType: { type: "STRING" },
          docNumber: { type: "STRING" },
          nationality: { type: "STRING" },
          expiryDate: { type: "STRING" },
          mrzLines: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: [
          "sex",
          "lastName",
          "firstName",
          "dateOfBirth",
          "placeOfBirth",
          "docType",
          "docNumber",
          "nationality",
          "expiryDate",
          "mrzLines",
        ],
      },
    },
  });

  let lastStatus = 0;
  for (const model of geminiModels()) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          signal: AbortSignal.timeout(40_000),
          body,
        },
      );
      if (response.ok) return response;
      lastStatus = response.status;
      console.error("[identity/ocr] gemini", response.status, model);
    } catch (e) {
      console.error("[identity/ocr] network", e instanceof Error ? e.name : "error");
    }
  }
  console.error("[identity/ocr] gemini", lastStatus || "timeout");
  throw new IdentityError("gemini");
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseModelJson(text: string): Record<string, unknown> {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const parsed: unknown = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("json");
  }
  return parsed as Record<string, unknown>;
}
