"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");
const { setImmediate: nextTurn } = require("node:timers/promises");
const { runInNewContext } = require("node:vm");

const script = readFileSync(`${__dirname}/../extension/popup.js`, "utf8");

test("a local setting change during popup initialization wins over an older read", async () => {
  const controls = new Map();
  const document = {
    getElementById(id) {
      if (!controls.has(id)) {
        controls.set(id, Object.assign(new EventTarget(), { checked: false, disabled: true }));
      }
      return controls.get(id);
    },
  };
  let onChanged;
  let resolveSettings;
  const defaults = { youtubeShorts: false, youtubeRecommendations: false, redditTrending: false };
  const AFL = {
    defaults,
    api: {
      storage: { onChanged: { addListener: (callback) => { onChanged = callback; } } },
      tabs: { query: async () => [] },
    },
    loadSettings: () => new Promise((resolve) => { resolveSettings = resolve; }),
  };
  runInNewContext(script, { document, AFL });

  onChanged({ youtubeShorts: { newValue: true } }, "local");
  onChanged({ redditTrending: { newValue: true } }, "sync");
  resolveSettings({ ...defaults, youtubeRecommendations: true });
  await nextTurn();

  assert.equal(controls.get("youtubeShorts").disabled, false);
  assert.equal(controls.get("youtubeShorts").checked, true);
  assert.equal(controls.get("youtubeRecommendations").checked, true);
  assert.equal(controls.get("redditTrending").checked, false);
  onChanged({ youtubeShorts: { oldValue: true } }, "local");
  assert.equal(controls.get("youtubeShorts").checked, false);
});
