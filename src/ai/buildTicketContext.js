const { aiConfig } = require("../config/ai");
const { prisma } = require("../config/prisma");

function cleanMessageContent(content) {
  return String(content || "")
    .replace(/\s+/g, " ")
    .trim();
}

async function getRecentChannelMessages(channel, currentMessageId) {
  try {
    const fetched = await channel.messages.fetch({
      limit: aiConfig.recentMessagesLimit + 3,
    });

    return Array.from(fetched.values())
      .filter((msg) => msg.id !== currentMessageId)
      .filter((msg) => !msg.author?.bot)
      .filter((msg) => cleanMessageContent(msg.content).length > 0)
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .slice(-aiConfig.recentMessagesLimit)
      .map((msg) => ({
        authorName: msg.member?.displayName || msg.author?.username || "User",
        content: cleanMessageContent(msg.content).slice(0, 500),
      }));
  } catch (error) {
    console.error("Failed to fetch recent ticket messages:", error);
    return [];
  }
}

async function getLearnedQna(guildId) {
  if (!guildId) return [];

  try {
    const config = await prisma.guildConfig.findUnique({
      where: {
        guildId,
      },
      select: {
        maxLearnedItems: true,
      },
    });

    const take = Math.max(1, Math.min(Number(config?.maxLearnedItems || 20), 100));

    return await prisma.learnedAnswer.findMany({
      where: {
        guildId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take,
      select: {
        id: true,
        question: true,
        answer: true,
      },
    });
  } catch (error) {
    console.error("Failed to fetch learned Q&A:", error);
    return [];
  }
}

async function buildTicketContext({ message }) {
  const recentMessages = await getRecentChannelMessages(
    message.channel,
    message.id
  );

  const learnedQna = await getLearnedQna(message.guild?.id);

  return {
    guildName: message.guild?.name || null,
    channelName: message.channel?.name || null,
    recentMessages,
    learnedQna,
  };
}

module.exports = {
  buildTicketContext,
};
