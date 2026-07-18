const assert = require("node:assert/strict");
const { test } = require("node:test");

const {
  CURATED_GROQ_MODELS,
  DEFAULT_GROQ_MODEL,
  isCuratedGroqModel,
} = require("../src/ai/groqModels");

test("uses GPT OSS 120B as the default model", () => {
  assert.equal(DEFAULT_GROQ_MODEL, "openai/gpt-oss-120b");
});

test("curated catalog contains only approved text and reasoning models", () => {
  assert.deepEqual(
    CURATED_GROQ_MODELS.map((model) => model.id),
    ["openai/gpt-oss-120b", "openai/gpt-oss-20b"]
  );

  for (const blocked of [
    "whisper-large-v3",
    "playai-tts",
    "meta-llama/llama-prompt-guard-2-86m",
    "meta-llama/llama-guard-4-12b",
    "groq/compound",
    "qwen/qwen3-32b",
  ]) {
    assert.equal(isCuratedGroqModel(blocked), false);
  }
});

test("rejects arbitrary interaction model values", () => {
  assert.equal(isCuratedGroqModel("openai/gpt-oss-120b"), true);
  assert.equal(isCuratedGroqModel("openai/gpt-oss-20b"), true);
  assert.equal(isCuratedGroqModel("attacker/custom-model"), false);
});
