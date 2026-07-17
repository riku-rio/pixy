const GroqSDK = require("groq-sdk");

const Groq = GroqSDK.default || GroqSDK;
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

const CURATED_GROQ_MODELS = Object.freeze([
  Object.freeze({
    id: "openai/gpt-oss-120b",
    label: "GPT OSS 120B",
    description: "Large text and reasoning model (default)",
  }),
  Object.freeze({
    id: "openai/gpt-oss-20b",
    label: "GPT OSS 20B",
    description: "Fast text and reasoning model",
  }),
]);

function getCuratedModel(modelId) {
  return CURATED_GROQ_MODELS.find((model) => model.id === modelId) || null;
}

function isCuratedGroqModel(modelId) {
  return Boolean(getCuratedModel(String(modelId || "").trim()));
}

function normalizeModelList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

async function listAvailableGroqModels(apiKey) {
  const key = String(apiKey || "").trim();
  if (!key) {
    const error = new Error("A Groq API key is required.");
    error.code = "missing_groq_api_key";
    throw error;
  }

  const groq = new Groq({ apiKey: key });
  const response = await groq.models.list();
  const activeIds = new Set(
    normalizeModelList(response)
      .filter((model) => model && model.active !== false)
      .map((model) => String(model.id || "").trim())
      .filter(Boolean)
  );

  return CURATED_GROQ_MODELS.filter((model) => activeIds.has(model.id));
}

async function validateGroqApiKey(apiKey) {
  const models = await listAvailableGroqModels(apiKey);
  return {
    valid: true,
    models,
  };
}

module.exports = {
  CURATED_GROQ_MODELS,
  DEFAULT_GROQ_MODEL,
  getCuratedModel,
  isCuratedGroqModel,
  listAvailableGroqModels,
  validateGroqApiKey,
};
