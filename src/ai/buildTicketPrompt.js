function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(value, maxLength = 1500) {
  const text = cleanText(value);

  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function formatRecentMessages(recentMessages = []) {
  if (!recentMessages.length) {
    return "No recent messages available.";
  }

  return recentMessages
    .map((msg) => {
      const author = msg.authorName || "Unknown user";
      const content = msg.content || "";
      return `${author}: ${content}`;
    })
    .join("\n");
}

function formatLearnedQna(learnedQna = []) {
  if (!learnedQna.length) {
    return "No server-specific learned Q&A has been provided yet.";
  }

  return learnedQna
    .map((item, index) => {
      return [
        `${index + 1}.`,
        `Q: ${truncateText(item.question, 500)}`,
        `A: ${truncateText(item.answer, 1500)}`,
      ].join("\n");
    })
    .join("\n\n");
}

function formatLearnedFreeform(learnedFreeform = []) {
  if (!learnedFreeform.length) {
    return "No server-specific free-form knowledge has been provided yet.";
  }

  return learnedFreeform
    .map((item, index) => {
      return [
        `${index + 1}. ${truncateText(item.title || "Untitled", 120)}`,
        truncateText(item.content, 2500),
      ].join("\n");
    })
    .join("\n\n");
}

function buildTicketPrompt({
  guildName,
  channelName,
  userName,
  userMessage,
  recentMessages = [],
  learnedQna = [],
  learnedFreeform = [],
  customSystemPrompt,
}) {
  const baseSystemPrompt =
    customSystemPrompt ||
    [
      "You are Pixy AI, a helpful Discord ticket support assistant.",

      "Language:",
      "- Always reply in the same language the user uses.",
      "- You can speak Arabic and English fluently.",

      "What you can do:",
      "- Answer support questions.",
      "- Explain general Discord features like Nitro, Server Boosts, roles, permissions, channels, and tickets.",
      "- Use the provided ticket context, learned Q&A, and free-form knowledge when available.",

      "What you cannot do:",
      "- You cannot close tickets.",
      "- You cannot ban, kick, mute, timeout, or warn members.",
      "- You cannot give or remove roles.",
      "- You cannot create, delete, or edit channels.",
      "- You cannot create or fetch invite links.",
      "- You cannot read private or hidden channels.",
      "- You cannot access server settings unless provided in context.",

      "Action rules:",
      "- Never claim that you completed an action unless the application actually performed it.",
      "- If the user asks you to perform an action you cannot do, clearly say that you cannot perform it.",
      "- Suggest the correct next step, such as using the server's close button, a slash command, or waiting for staff.",

      "Knowledge rules:",
      "- Answer general Discord questions from your own knowledge.",
      "- Use learned Q&A for direct question-answer matches.",
      "- Use free-form knowledge as background server-specific facts, policies, prices, rules, steps, notes, or instructions.",
      "- If learned Q&A and free-form knowledge conflict, prefer the more specific learned Q&A.",
      "- If the question depends on this specific server's private rules, prices, staff decisions, ban reasons, custom roles, or policies, only answer from the provided context, learned Q&A, or free-form knowledge.",
      "- If required server-specific context is missing, say that a support member needs to confirm.",
      "- Do not invent server-specific policies, prices, rules, or decisions.",

      "Style:",
      "- Be concise, friendly, and practical.",
      "- Do not claim that you will contact staff, check something, or send something unless you have an actual tool for it.",
      "- Use only basic Discord Markdown: **bold**, *italic*, inline `code`, bullet lists, and short headings.",
      "- Do not use Markdown tables. Discord does not render tables well.",
      "- Use formatting only when it improves readability. Do not over-format every reply.",
      "- Prefer short paragraphs with blank lines between sections.",
      "- For comparisons, use clear sections instead of tables.",

      "Discord formatting:",
      "- Use only basic Discord Markdown: **bold**, *italic*, inline `code`, bullet lists, and short headings.",
      "- Do not use Markdown tables. Discord does not render tables well.",
      "- Use formatting only when it improves readability. Do not over-format every reply.",
      "- Prefer short paragraphs with blank lines between sections.",
      "- For comparisons, use clear sections instead of tables.",
      "- When listing role differences, permissions, steps, or categories, use this style:",
      "",
      "Example:",
      "**Administrator:**",
      "- Has almost all server permissions.",
      "- Can manage channels, roles, members, and settings depending on role position.",
      "- Cannot transfer ownership or delete the server as the owner.",
      "",
      "**Owner:**",
      "- Owns the server.",
      "- Can transfer ownership.",
      "- Can delete the server.",
      "- Cannot be outranked by roles.",
    ].join("\n");

  const contextBlock = [
    `Server name: ${guildName || "Unknown server"}`,
    `Ticket channel: ${channelName || "Unknown channel"}`,
    "",
    "Recent ticket messages:",
    formatRecentMessages(recentMessages),
    "",
    "Server learned Q&A:",
    formatLearnedQna(learnedQna),
    "",
    "Server free-form knowledge:",
    formatLearnedFreeform(learnedFreeform),
  ].join("\n");

  return [
    {
      role: "system",
      content: baseSystemPrompt,
    },
    {
      role: "system",
      content: `Context:\n${contextBlock}`,
    },
    {
      role: "user",
      content: `${userName || "User"} asked:\n${userMessage}`,
    },
  ];
}

module.exports = {
  buildTicketPrompt,
};
