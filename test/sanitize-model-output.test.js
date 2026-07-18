const assert = require("node:assert/strict");
const { test } = require("node:test");

const { stripThinkBlocks } = require("../src/ai/sanitizeModelOutput");

test("removes a complete think block and keeps only the visible answer", () => {
  assert.equal(
    stripThinkBlocks("<think>private reasoning</think>\n\nVisible answer"),
    "Visible answer"
  );
});

test("removes multiple and mixed-case think blocks", () => {
  assert.equal(
    stripThinkBlocks("Before <THINK>one</THINK> middle <think>two</think> after"),
    "Before  middle  after"
  );
});

test("removes nested think blocks", () => {
  assert.equal(
    stripThinkBlocks("<think>outer <think>inner</think> outer</think>Answer"),
    "Answer"
  );
});

test("drops an unfinished think block and everything after it", () => {
  assert.equal(
    stripThinkBlocks("Visible first\n<think>unfinished private reasoning"),
    "Visible first"
  );
});

test("leaves ordinary text unchanged apart from whitespace normalization", () => {
  assert.equal(stripThinkBlocks("Hello\r\n\r\n\r\nWorld"), "Hello\n\nWorld");
});
