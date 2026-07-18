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
    pattern: /(?:^|[\/_-])(guard|moderation|moderator|safeguard|prompt-guard)(?:$|[\/_-