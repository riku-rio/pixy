const { ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");

const RESET_OPTION = Object.freeze({
  label: "Reset Menu",
  description: "Reset menu selection",
  value: "reset",
  emoji: "🔄",
});

const MAX_ITEMS_PER_MENU_WITH_RESET = 24;
const MAX_ITEMS_PER_MENU_WITHOUT_RESET = 25;
const MAX_SELECT_MENUS_PER_MESSAGE = 5;

/**
 * Creates one or more ActionRowBuilder instances containing StringSelectMenuBuilder.
 * Automatically appends a 'Reset Menu' option and chunks options if count exceeds 24.
 *
 * @param {Object} params
 * @param {string} params.customId - Custom ID for the select menu(s)
 * @param {string} [params.placeholder] - Placeholder text
 * @param {Array<Object|StringSelectMenuOptionBuilder>} params.options - Array of select menu options
 * @param {number} [params.minValues=1] - Min values allowed
 * @param {number} [params.maxValues=1] - Max values allowed
 * @param {boolean} [params.disabled=false] - Whether the menu is disabled
 * @param {boolean} [params.includeReset=true] - Whether to include the Reset Menu option
 * @param {Object} [params.resetOption] - Custom reset option properties
 * @returns {ActionRowBuilder[]} Array of ActionRowBuilder components
 */
function createStringSelectMenus({
  customId,
  placeholder,
  options = [],
  minValues = 1,
  maxValues = 1,
  disabled = false,
  includeReset = true,
  resetOption = RESET_OPTION,
}) {
  if (!customId) throw new Error("customId is required to create StringSelectMenu");

  const maxItemsPerChunk = includeReset ? MAX_ITEMS_PER_MENU_WITH_RESET : MAX_ITEMS_PER_MENU_WITHOUT_RESET;
  const rawOptions = Array.isArray(options) ? options : [];

  // Chunk options into slices of maxItemsPerChunk
  const chunks = [];
  if (rawOptions.length === 0) {
    chunks.push([]);
  } else {
    for (let i = 0; i < rawOptions.length; i += maxItemsPerChunk) {
      chunks.push(rawOptions.slice(i, i + maxItemsPerChunk));
    }
  }

  // Cap at 5 select menus (Discord limit of 5 ActionRows per message)
  const cappedChunks = chunks.slice(0, MAX_SELECT_MENUS_PER_MESSAGE);

  return cappedChunks.map((chunk, index) => {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(cappedChunks.length > 1 ? `${customId}:${index}` : customId)
      .setMinValues(minValues)
      .setMaxValues(maxValues)
      .setDisabled(disabled);

    if (placeholder) {
      const partNotice = cappedChunks.length > 1 ? ` (Part ${index + 1}/${cappedChunks.length})` : "";
      selectMenu.setPlaceholder(`${placeholder}${partNotice}`.slice(0, 150));
    }

    if (chunk.length > 0) {
      selectMenu.addOptions(chunk);
    }

    if (includeReset) {
      selectMenu.addOptions(resetOption);
    }

    return new ActionRowBuilder().addComponents(selectMenu);
  });
}

module.exports = {
  RESET_OPTION,
  MAX_ITEMS_PER_MENU_WITH_RESET,
  createStringSelectMenus,
};
