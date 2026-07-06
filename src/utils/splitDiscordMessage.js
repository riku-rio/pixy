function splitDiscordMessage(text, maxLength = 1900) {
  const cleanText = String(text || "").trim();

  if (!cleanText) return [];

  if (cleanText.length <= maxLength) {
    return [cleanText];
  }

  const chunks = [];
  let remaining = cleanText;

  while (remaining.length > maxLength) {
    let splitIndex = remaining.lastIndexOf("\n", maxLength);

    if (splitIndex < 500) {
      splitIndex = remaining.lastIndexOf(" ", maxLength);
    }

    if (splitIndex < 500) {
      splitIndex = maxLength;
    }

    chunks.push(remaining.slice(0, splitIndex).trim());
    remaining = remaining.slice(splitIndex).trim();
  }

  if (remaining.length) {
    chunks.push(remaining);
  }

  return chunks;
}

module.exports = {
  splitDiscordMessage,
};
