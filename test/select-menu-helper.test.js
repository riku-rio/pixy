const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createStringSelectMenus, RESET_OPTION } = require("../src/utils/selectMenuHelper");

test("adds Reset Menu option to a single select menu", () => {
  const rows = createStringSelectMenus({
    customId: "test_menu",
    placeholder: "Select an option",
    options: [
      { label: "Option 1", value: "opt1" },
      { label: "Option 2", value: "opt2" },
    ],
  });

  assert.equal(rows.length, 1);
  const menuData = rows[0].components[0].toJSON();
  assert.equal(menuData.custom_id, "test_menu");
  assert.equal(menuData.options.length, 3);
  assert.equal(menuData.options[2].value, "reset");
  assert.equal(menuData.options[2].label, "Reset Menu");
});

test("chunks options into 24 items per select menu plus Reset option when option count exceeds 24", () => {
  const options = Array.from({ length: 50 }, (_, i) => ({
    label: `Item ${i + 1}`,
    value: `item_${i + 1}`,
  }));

  const rows = createStringSelectMenus({
    customId: "multi_menu",
    placeholder: "Choose item",
    options,
  });

  // 50 items -> chunk 1: 24, chunk 2: 24, chunk 3: 2 -> total 3 rows
  assert.equal(rows.length, 3);

  const menu1 = rows[0].components[0].toJSON();
  const menu2 = rows[1].components[0].toJSON();
  const menu3 = rows[2].components[0].toJSON();

  assert.equal(menu1.options.length, 25);
  assert.equal(menu1.options[24].value, "reset");
  assert.equal(menu1.custom_id, "multi_menu:0");

  assert.equal(menu2.options.length, 25);
  assert.equal(menu2.options[24].value, "reset");
  assert.equal(menu2.custom_id, "multi_menu:1");

  assert.equal(menu3.options.length, 3); // 2 items + 1 reset
  assert.equal(menu3.options[2].value, "reset");
  assert.equal(menu3.custom_id, "multi_menu:2");
});

test("supports disabling reset option if specified", () => {
  const rows = createStringSelectMenus({
    customId: "no_reset_menu",
    options: [{ label: "Option 1", value: "opt1" }],
    includeReset: false,
  });

  assert.equal(rows.length, 1);
  const menuData = rows[0].components[0].toJSON();
  assert.equal(menuData.options.length, 1);
  assert.equal(menuData.options[0].value, "opt1");
});
