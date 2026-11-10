"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");
const { setImmediate: nextTurn } = require("node:timers/promises");
const { createContext, runInContext } = require("node:vm");

const extension = `${__dirname}/../extension`;
const markup = readFileSync(`${extension}/popup.html`, "utf8");
const scripts = ["settings.js", "clean-link.js", "reddit-feed.js", "popup.js"]
  .map((name) => readFileSync(`${extension}/${name}`, "utf8"));

const youtube = { id: 1, url: "https://www.youtube.com/" };
const reddit = { id: 2, url: "https://www.reddit.com/r/gardening/" };
const youtubeReport = (shorts, home, watch) => ({
  site: "youtube",
  filters: { youtubeShorts: shorts, youtubeHome: home, youtubeWatchRecommendations: watch },
});
const redditReport = (trending) => ({
  site: "reddit",
  filters: { redditTrending: trending },
});

function loadPopup({ tab = youtube, settings = {}, onRead, onWrite, onMessage, onQuery } = {}) {
  let onChanged;
  let onActivated;
  let onUpdated;
  const writes = [];
  const messages = [];
  const controls = new Map();
  for (const [tag, id] of markup.matchAll(/<[^>]*\sid="([^"]+)"[^>]*>/g)) {
    controls.set(id, Object.assign(new EventTarget(), {
      checked: false,
      disabled: /\sdisabled(?=[\s>])/.test(tag),
      hidden: /\shidden(?=[\s>])/.test(tag),
      value: "",
      textContent: "",
      focus() {},
      removeAttribute(name) { delete this[name]; },
    }));
  }
  const get = (id) => controls.get(id);
  const change = (changes, area = "local") => {
    if (area === "local") {
      for (const [key, { newValue }] of Object.entries(changes)) {
        if (newValue === undefined) delete settings[key];
        else settings[key] = newValue;
      }
    }
    onChanged(changes, area);
  };

  const browser = {
    storage: {
      local: {
        get: async (keys) => {
          const snapshot = Object.fromEntries(keys.filter((key) => Object.hasOwn(settings, key))
            .map((key) => [key, settings[key]]));
          return onRead ? onRead(snapshot) : snapshot;
        },
        set: async (values) => {
          writes.push({ ...values });
          await onWrite?.(values);
          change(Object.fromEntries(Object.entries(values).map(([key, newValue]) => [key, { newValue }])));
        },
      },
      onChanged: { addListener(callback) { onChanged = callback; } },
    },
    tabs: {
      query: async () => onQuery ? onQuery() : tab ? [tab] : [],
      sendMessage: async (id, message) => {
        messages.push([id, message]);
        return onMessage?.(id, message);
      },
      onActivated: { addListener(callback) { onActivated = callback; } },
      onUpdated: { addListener(callback) { onUpdated = callback; } },
    },
  };
  const context = createContext({ document: { getElementById: get }, browser, URL });
  for (const script of scripts) runInContext(script, context);

  return {
    get,
    change,
    writes,
    messages,
    toggle(id, checked) {
      assert.equal(get(id).disabled, false);
      get(id).checked = checked;
      get(id).dispatchEvent(new Event("change"));
    },
    activate(activeTab) {
      tab = activeTab;
      onActivated({ tabId: tab.id });
    },
    update(activeTab, changes) {
      tab = activeTab;
      onUpdated(tab.id, changes);
    },
  };
}

test("a local change during popup initialization wins over an older read", async () => {
  let resolveInitial;
  let firstRead = true;
  const popup = loadPopup({
    tab: null,
    settings: { youtubeRecommendations: true },
    onRead(snapshot) {
      if (!firstRead) return snapshot;
      firstRead = false;
      return new Promise((resolve) => { resolveInitial = () => resolve(snapshot); });
    },
  });
  await nextTurn();
  popup.change({ youtubeHome: { newValue: false } });
  popup.change({ youtubeShorts: { newValue: true } });
  popup.change({ redditTrending: { newValue: true } }, "sync");
  resolveInitial();
  await nextTurn();

  assert.equal(popup.get("youtubeShorts").disabled, false);
  assert.equal(popup.get("youtubeShorts").checked, true);
  assert.equal(popup.get("youtubeHome").checked, false);
  assert.equal(popup.get("youtubeWatchRecommendations").checked, true);
  assert.equal(popup.get("redditTrending").checked, false);

  popup.change({ youtubeHome: { oldValue: false } });
  await nextTurn();
  assert.equal(popup.get("youtubeHome").checked, true);
});

test("reports confirmed effects, absent sections, unfamiliar layouts and inapplicable controls separately", async () => {
  let report = youtubeReport("hidden", "absent", "not-applicable");
  const popup = loadPopup({ onMessage: () => report });
  await nextTurn();

  assert.deepEqual(popup.messages, [[youtube.id, "afl:page-status"]]);
  assert.equal(popup.get("page-status-list").hidden, false);
  assert.equal(popup.get("page-redditTrending").hidden, true);
  assert.equal(popup.get("state-youtubeShorts").textContent, "Hidden on this page.");
  assert.equal(popup.get("state-youtubeHome").textContent, "No matching section on this page.");
  assert.equal(popup.get("state-youtubeWatchRecommendations").textContent, "Doesn’t apply on this page.");

  report = youtubeReport("off", "not-applicable", "unrecognized");
  popup.update({ ...youtube, url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ" }, { url: "changed" });
  await nextTurn();
  assert.equal(popup.get("state-youtubeShorts").textContent, "Switch is off.");
  assert.equal(popup.get("state-youtubeWatchRecommendations").textContent, "AFL does not recognise this layout.");

  report = youtubeReport("invalid", "off", "off");
  popup.change({ youtubeHome: { newValue: true } });
  await nextTurn();
  assert.equal(popup.get("page-status-list").hidden, true);
  assert.match(popup.get("page-status-message").textContent, /could not check this tab/i);
});

test("saves Home and watch settings separately and refreshes page status", async () => {
  const settings = { youtubeRecommendations: true };
  const popup = loadPopup({
    settings,
    onMessage: () => youtubeReport("off", settings.youtubeHome === false ? "off" : "hidden", "not-applicable"),
  });
  await nextTurn();

  popup.toggle("youtubeHome", false);
  await nextTurn();
  assert.deepEqual(popup.writes, [{ youtubeHome: false }]);
  assert.equal(popup.get("youtubeWatchRecommendations").checked, true);
  assert.equal(popup.get("state-youtubeHome").textContent, "Switch is off.");

  popup.toggle("youtubeWatchRecommendations", false);
  await nextTurn();
  assert.deepEqual(popup.writes, [{ youtubeHome: false }, { youtubeWatchRecommendations: false }]);
  assert.equal(popup.get("youtubeHome").checked, false);
});

test("ignores a stale page reply after switching tabs and preserves the Reddit New shortcut", async () => {
  let resolveYoutube;
  const popup = loadPopup({
    onMessage(id, message) {
      if (id === youtube.id) return new Promise((resolve) => { resolveYoutube = resolve; });
      return message === "afl:has-reddit-new" ? true : redditReport("hidden");
    },
  });
  await nextTurn();
  popup.activate(reddit);
  await nextTurn();
  resolveYoutube(youtubeReport("hidden", "hidden", "not-applicable"));
  await nextTurn();

  assert.equal(popup.get("page-youtubeShorts").hidden, true);
  assert.equal(popup.get("page-redditTrending").hidden, false);
  assert.equal(popup.get("state-redditTrending").textContent, "Hidden on this page.");
  assert.equal(popup.get("reddit-new-feed").hidden, false);
  assert.equal(popup.get("reddit-new-link").href, "https://www.reddit.com/r/gardening/new/");

  popup.get("use-tab").dispatchEvent(new Event("click"));
  assert.equal(popup.get("original-link").value, reddit.url);
});

test("the latest rapid toggle wins, and a failed write restores the stored setting", async () => {
  let finishFirst;
  const popup = loadPopup({
    onMessage: () => youtubeReport("off", "off", "not-applicable"),
    onWrite(values) {
      if (values.youtubeWatchRecommendations) throw new Error("storage unavailable");
      if (values.youtubeHome) return new Promise((resolve) => { finishFirst = resolve; });
    },
  });
  await nextTurn();
  popup.toggle("youtubeHome", true);
  await nextTurn();
  popup.toggle("youtubeHome", false);
  assert.deepEqual(popup.writes, [{ youtubeHome: true }]);
  finishFirst();
  await nextTurn();
  assert.deepEqual(popup.writes, [{ youtubeHome: true }, { youtubeHome: false }]);
  assert.equal(popup.get("youtubeHome").checked, false);

  popup.toggle("youtubeWatchRecommendations", true);
  await nextTurn();
  assert.equal(popup.get("youtubeWatchRecommendations").checked, false);
  assert.match(popup.get("settings-status").textContent, /couldn’t save/i);
});

test("link cleaning still works when the browser withholds current tab access", async () => {
  const popup = loadPopup({ onQuery: () => { throw new Error("access denied"); } });
  await nextTurn();
  assert.equal(popup.get("use-tab").disabled, true);
  assert.match(popup.get("page-status-message").textContent, /could not check this tab/i);

  popup.get("original-link").value = "https://youtu.be/aqz-KE-bpKQ?si=example&t=30";
  popup.get("cleaner").dispatchEvent(new Event("submit", { cancelable: true }));
  assert.equal(popup.get("cleaned-result").hidden, false);
  assert.equal(popup.get("cleaned-link").value, "https://youtu.be/aqz-KE-bpKQ?t=30");
});
