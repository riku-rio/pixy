function cleanReplyText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function cleanSingleLine(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function findBalancedJsonObject(text) {
  const source = String(text || "");
  const start = source.indexOf("{");

  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < source.length; i += 1) {
    const char = source[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return source.slice(start, i + 1).trim();
      }
    }
  }

  return null;
}

function extractJsonCandidate(rawText) {
  const raw = String(rawText || "").trim();

  if (!raw) return null;

  const jsonFenceMatch = raw.match(/```json\s*([\s\S]*?)```/i);

  if (jsonFenceMatch?.[1]) {
    return {
      source: "json_fence",
      candidate: jsonFenceMatch[1].trim(),
    };
  }

  if (raw.startsWith("{")) {
    return {
      source: "leading_json",
      candidate: findBalancedJsonObject(raw) || raw,
    };
  }

  const inlineCandidate = findBalancedJsonObject(raw);

  if (
    inlineCandidate &&
    (/"type"\s*:/.test(inlineCandidate) ||
      /"action"\s*:/.test(inlineCandidate) ||
      /action_request/.test(inlineCandidate))
  ) {
    return {
      source: "inline_action_json",
      candidate: inlineCandidate,
    };
  }

  return null;
}

function extractFallbackText(rawText, candidate) {
  const raw = String(rawText || "");
  const json = String(candidate || "");

  let text = raw.replace(json, "").trim();

  text = text.replace(/```json\s*[\s\S]*?```/gi, "").trim();

  if (text.length < 20) return "";

  return cleanReplyText(text).slice(0, 4000);
}

function parseAiOutput(rawText) {
  const raw = cleanReplyText(rawText);

  if (!raw) {
    return {
      kind: "reply",
      text: "",
    };
  }

  const jsonInfo = extractJsonCandidate(raw);

  if (!jsonInfo) {
    return {
      kind: "reply",
      text: raw,
    };
  }

  try {
    const parsed = JSON.parse(jsonInfo.candidate);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        kind: "invalid_json",
        text: "",
        raw,
        error: "Parsed JSON is not an object.",
      };
    }

    const type = cleanSingleLine(parsed.type).toLowerCase();

    if (type === "reply") {
      return {
        kind: "reply",
        text: cleanReplyText(
          parsed.text || parsed.message || parsed.content || ""
        ),
      };
    }

    if (type === "action_request") {
      const data =
        parsed.data && typeof parsed.data === "object" && !Array.isArray(parsed.data)
          ? parsed.data
          : {};

      return {
        kind: "action_request",
        action: cleanSingleLine(parsed.action).toLowerCase(),
        text: cleanReplyText(parsed.text || parsed.message || ""),
        data,
        rawJson: parsed,
      };
    }

    return {
      kind: "invalid_json",
      text: cleanReplyText(parsed.text || parsed.message || ""),
      raw,
      error: `Unsupported JSON type: ${type || "missing"}`,
    };
  } catch (error) {
    return {
      kind: "invalid_json",
      text: extractFallbackText(raw, jsonInfo.candidate),
      raw,
      error: String(error?.message || error),
    };
  }
}

module.exports = {
  parseAiOutput,
};
