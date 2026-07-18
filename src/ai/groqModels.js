const GroqSDK = require("groq-sdk");

const Groq = GroqSDK.default || GroqSDK;
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

const BLOCKED_MODEL_RULES = Object.freeze([
  Object.freeze({
    code: "audio_model",
    label: "audio/transcription/TTS",
    pattern: /(?:^|[\/_-])(whisper|audio|speech|transcrib|tts|orpheus|playai)(?:$|[\/_-])/i,
  }),
  Object.freeze({
    code: "moderation_model",
    label: "moderation/guard",
    pattern: /(?:guard|moderation|moderator|safeguard|prompt[-_]?guard)/i,
  }),
  Object.freeze({
    code: "image_model",
    label: "image-only/image generation",
    pattern: /(?:image|vision[-_]?only|stable[-_]?diffusion|flux|dall[-_]?e)/i,
  }),
  Object.freeze({
    code: "embedding_model",
    label: "embedding/reranking",
    pattern: /(?:embed|embedding|rerank)/i,
  }),
  Object.freeze({
    code: "system_model",
    label: "Groq system/compound",
    pattern: /(?:^|\/)compound(?:$|[-_/])/i,
  }),
]);

function normalizeModelList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function normalizeModelId(modelId) {
  return String(modelId || "").trim();
}

function getBlockedModelReason(modelId) {
  const id = normalizeModelId(modelId);
  if (!id) return null;
  return BLOCKED_MODEL_RULES.find((rule) => rule.pattern.test(id)) || null;
}

function createModelError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  return error;
}

function validateModelMetadata(model) {
  if (!model?.id) {
    throw createModelError("model_not_found", "The model was not returned by Groq.");
  }

  if (model.active === false) {
    throw createModelError("model_inactive", "The model is inactive.", {
      modelId: model.id,
    });
  }

  const blocked = getBlockedModelReason(model.id);
  if (blocked) {
    throw createModelError(blocked.code, `The model is classified as ${blocked.label}.`, {
      modelId: model.id,
      category: blocked.label,
    });
  }

  return model;
}

async function listGroqModels(apiKey) {
  const key = String(apiKey || "").trim();
  if (!key) {
    throw createModelError("missing_groq_api_key", "A Groq API key is required.");
  }

  const groq = new Groq({ apiKey: key });
  const response = await groq.models.list();
  return normalizeModelList(response);
}

async function validateGroqChatModel({ apiKey, modelId }) {
  const id = normalizeModelId(modelId);
  if (!id) {
    throw createModelError("model_required", "A model ID is required.");
  }

  const groq = new Groq({ apiKey: String(apiKey || "").trim() });
  const response = await groq.models.list();
  const model = normalizeModelList(response).find((item) => normalizeModelId(item?.id) === id);
  validateModelMetadata(model);

  try {
    await groq.chat.completions.create({
      model: id,
      messages: [{ role: "user", content: "Reply with OK." }],
      temperature: 0,
      max_completion_tokens: 1,
    });
  } catch (error) {
    const status = error?.status || error?.response?.status || null;
    if (status === 401 || status === 403 || status === 429) throw error;

    throw createModelError(
      "not_chat_compatible",
      "The model did not accept a normal text chat-completion request.",
      { modelId: id, status, cause: error }
    );
  }

  return {
    id,
    model,
    compatible: true,
  };
}

async function validateGroqApiKey(apiKey) {
  const models = await listGroqModels(apiKey);
  return {
    valid: true,
    modelIds: models
      .filter((model) => model?.active !== false)
      .map((model) => normalizeModelId(model?.id))
      .filter(Boolean),
  };
}

module.exports = {
  BLOCKED_MODEL_RULES,
  DEFAULT_GROQ_MODEL,
  getBlockedModelReason,
  listGroqModels,
  normalizeModelList,
  validateGroqApiKey,
  validateGroqChatModel,
  validateModelMetadata,
};
