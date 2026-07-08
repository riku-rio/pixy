const { aiConfig } = require("../config/ai");
const { prisma } = require("../config/prisma");

const KNOWLEDGE_TYPE_QNA = "qna";
const KNOWLEDGE_TYPE_FREEFORM = "freeform";

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

async function getLearnedKnowledge(guildId) {
  if (!guildId) {
    return {
      learnedQna: [],
      learnedFreeform: [],
    };
  }

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

    const items = await prisma.learnedAnswer.findMany({
      where: {
        guildId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take,
      select: {
        id: true,
        type: true,
        question: true,
        answer: true,
        title: true,
        content: true,
      },
    });

    return {
      learnedQna: items.filter((item) => item.type === KNOWLEDGE_TYPE_QNA),
      learnedFreeform: items.filter((item) => item.type === KNOWLEDGE_TYPE_FREEFORM),
    };
  } catch (error) {
    console.error("Failed to fetch learned knowledge:", error);

    return {
      learnedQna: [],
      learnedFreeform: [],
    };
  }
}

async function buildTicketContext({ message }) {
  const recentMessages = await getRecentChannelMessages(
    message.channel,
    message.id
  );

  const learnedKnowledge = await getLearnedKnowledge(message.guild?.id);

  return {
    guildName: message.guild?.name || null,
    channelName: message.channel?.name || null,
    recentMessages,
    learnedQna: learnedKnowledge.learnedQna,
    learnedFreeform: learnedKnowledge.learnedFreeform,
  };
}

module.exports = {
  buildTicketContext,
};
