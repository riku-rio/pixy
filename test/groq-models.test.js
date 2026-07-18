const assert = require("node:assert/strict");
const { test } = require("node:test");

const {
  DEFAULT_GROQ_MODEL,
  getBlockedModelReason,
  validateModelMetadata,
} = require("../src/ai/groqModels");

test("uses GPT OSS 120B as the default model", () => {
  assert.equal(DEFAULT_GROQ_MODEL, "openai/gpt-oss-120b");
});

test("allows normal active text/chat model metadata", () => {
  const model = validateModelMetadata({
    id: "openai/gpt-oss-120b",
    active: true,
  });

  assert.equal(model.id, "openai/gpt-oss-120b");
});

test("rejects blocked non-chat model families", () => {
  const blocked = new Map([
    ["whisper-large-v3", "audio_model"],
    ["playai-tts", "audio_model"],
    ["meta-llama/llama-prompt-guard-2-86m", "moderation_model"],
    ["meta-llama/llama-guard-4-12b", "moderation_model"],
    ["stabilityai/stable-diffusion", "image_model"],
    ["nomic-embed-text", "embedding_model"],
    ["groq/compound", "system_model"],
  ]);

  for (const [modelId, expectedCode] of blocked) {
    assert.equal(getBlockedModelReason(modelId)?.code, expectedCode);
    assert.throws(
      () => validateModelMetadata({ id: modelId, active: true }),
      (error) => error.code === expectedCode
    );
  }
});

test("rejects missing and inactive models", () => {
  assert.throws(
    () => validateModelMetadata(null),
    (error) => error.code === "model_not_found"
  );

  assert.throws(
    () => validateModelMetadata({ id: "vendor/model", active: false }),
    (error) => error.code === "model_inactive"
  );
});
