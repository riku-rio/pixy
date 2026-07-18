function stripThinkBlocks(value) {
  const input = String(value ?? "");
  const tagPattern = /<\s*(\/?)\s*think\b[^>]*>/gi;

  let result = "";
  let cursor = 0;
  let depth = 0;
  let match;

  while ((match = tagPattern.exec(input)) !== null) {
    if (depth === 0) {
      result += input.slice(cursor, match.index);
    }

    if (match[1] === "/") {
      if (depth > 0) depth -= 1;
    } else {
      depth += 1;
    }

    cursor = tagPattern.lastIndex;
  }

  if (depth === 0) {
    result += input.slice(cursor);
  }

  return result
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

module.exports = {
  stripThinkBlocks,
};
