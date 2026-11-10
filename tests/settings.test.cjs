const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");
const { setImmediate: nextTurn } = require("node:timers/promises");
const { runInNewContext } = require("node:vm");

const script = readFileSync(`${__dirname}/../extension/settings.js`, "utf8");

test("a fresh settings read wins over an older read without losing a newer local change", async () => {
  const reads = [];
  let onChanged;
  const browser = {
    storage: {
      local: { get: () => new Promise((resolve) => { reads.push(resolve); }) },
      onChanged: { addListener: (callback) => { onChanged = callback; } },
    },
  };
  const context = { browser };
  runInNewContext(script, context);
  const updates = [];
  const refresh = context.AFL.watchSettings((settings) => updates.push({ ...settings }));
  const latest = refresh();
  onChanged({ youtubeWatchRecommendations: { newValue: false } }, "local");
  reads[1]({ youtubeRecommendations: true, youtubeHome: false });
  await latest;
  reads[0]({ youtubeRecommendations: true });
  await nextTurn();

  assert.deepEqual(updates, [{
    youtubeShorts: false,
    youtubeHome: false,
    youtubeWatchRecommendations: false,
    redditTrending: false,
  }]);
});
