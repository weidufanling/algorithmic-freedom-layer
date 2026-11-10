const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");
const { setImmediate: nextTurn } = require("node:timers/promises");
const { runInNewContext } = require("node:vm");

const script = readFileSync(`${__dirname}/../extension/content.js`, "utf8");
const settingsScript = readFileSync(`${__dirname}/../extension/settings.js`, "utf8");
const css = readFileSync(`${__dirname}/../extension/content.css`, "utf8");

function loadContent(hostname, pathname, { navigation = true, querySelectorAll = () => [] } = {}) {
  const attributes = new Set();
  const root = {
    toggleAttribute(name, force) {
      if (force) attributes.add(name);
      else attributes.delete(name);
    },
  };
  const location = { hostname, pathname };
  const document = new EventTarget();
  document.documentElement = root;
  document.querySelectorAll = querySelectorAll;
  const window = new EventTarget();
  window.navigation = navigation ? new EventTarget() : undefined;
  window.getComputedStyle = (element) => element.style;
  let interval;
  window.setInterval = (callback) => { interval = callback; return 1; };
  window.clearInterval = () => { interval = undefined; };

  let onChanged;
  let onMessage;
  let resolveInitial;
  let stored;
  const pendingChanges = {};
  const initial = new Promise((resolve) => { resolveInitial = resolve; });
  const browser = {
    storage: {
      local: { get: () => stored ? Promise.resolve({ ...stored }) : initial },
      onChanged: { addListener: (callback) => { onChanged = callback; } },
    },
    runtime: { onMessage: { addListener: (callback) => { onMessage = callback; } } },
  };
  runInNewContext(`${settingsScript}\n${script}`, { document, window, location, browser });

  function applyChanges(target, changes) {
    for (const [key, change] of Object.entries(changes)) {
      if (change.newValue === undefined) delete target[key];
      else target[key] = change.newValue;
    }
  }

  return {
    attributes,
    change(changes, area = "local") {
      if (area === "local") {
        if (stored) applyChanges(stored, changes);
        else Object.assign(pendingChanges, changes);
      }
      onChanged(changes, area);
    },
    async resolve(settings = {}) {
      stored = { ...settings };
      applyChanges(stored, pendingChanges);
      resolveInitial(settings);
      await nextTurn();
    },
    saveWithoutEvent: (settings) => Object.assign(stored, settings),
    status: () => new Promise((reply) => {
      assert.equal(onMessage("afl:page-status", {}, (value) => reply(JSON.parse(JSON.stringify(value)))), true);
    }),
    navigate(path, event = "yt-navigate-finish") {
      location.pathname = path;
      const target = event === "currententrychange" ? window.navigation : window;
      target.dispatchEvent(new Event(event));
    },
    poll(path, hidden = false) {
      location.pathname = path;
      document.hidden = hidden;
      interval?.();
      return Boolean(interval);
    },
  };
}

test("YouTube defaults to showing content and accepts independent live changes", async () => {
  const page = loadContent("www.youtube.com", "/");
  await page.resolve();
  assert.equal(page.attributes.size, 0);

  page.change({ youtubeShorts: { newValue: true }, redditTrending: { newValue: true } });
  assert.deepEqual([...page.attributes], ["data-weidu-afl-shorts-content", "data-weidu-afl-shorts-navigation"]);

  page.change({ youtubeRecommendations: { newValue: true } });
  assert.equal(page.attributes.has("data-weidu-afl-youtube-home"), true);
  page.change({ youtubeShorts: { oldValue: true } });
  assert.deepEqual([...page.attributes], ["data-weidu-afl-youtube-home"]);
});

test("YouTube filters follow SPA routes and preserve direct Shorts and subscriptions", async () => {
  const page = loadContent("www.youtube.com", "/");
  await page.resolve({ youtubeShorts: true, youtubeRecommendations: true });

  page.navigate("/watch");
  assert.equal(page.attributes.has("data-weidu-afl-youtube-related"), true);
  assert.equal(page.attributes.has("data-weidu-afl-youtube-home"), false);

  page.navigate("/shorts/abc", "currententrychange");
  assert.equal(page.attributes.size, 0);

  page.navigate("/feed/subscriptions", "popstate");
  assert.deepEqual([...page.attributes], ["data-weidu-afl-shorts-navigation"]);

  page.navigate("/results");
  assert.equal(page.attributes.has("data-weidu-afl-shorts-content"), true);
  assert.equal(page.attributes.has("data-weidu-afl-youtube-related"), false);
});

test("YouTube overrides each legacy recommendation setting independently", async () => {
  const page = loadContent("www.youtube.com", "/");
  await page.resolve({ youtubeRecommendations: true, youtubeHome: false });
  assert.equal(page.attributes.size, 0);
  page.navigate("/watch");
  assert.deepEqual([...page.attributes], ["data-weidu-afl-youtube-related"]);

  page.change({ youtubeWatchRecommendations: { newValue: false }, youtubeHome: { newValue: true } });
  assert.equal(page.attributes.size, 0);
  page.navigate("/");
  assert.deepEqual([...page.attributes], ["data-weidu-afl-youtube-home"]);
  page.change({ youtubeHome: { newValue: false }, youtubeWatchRecommendations: { oldValue: false } });
  assert.equal(page.attributes.size, 0);
  page.navigate("/watch");
  assert.deepEqual([...page.attributes], ["data-weidu-afl-youtube-related"]);
});

test("mobile YouTube detects route changes on older engines while filters are enabled", async () => {
  const page = loadContent("m.youtube.com", "/", { navigation: false });
  await page.resolve({ youtubeRecommendations: true });

  assert.equal(page.poll("/watch", true), true);
  assert.equal(page.attributes.has("data-weidu-afl-youtube-home"), true);
  assert.equal(page.poll("/watch"), true);
  assert.deepEqual([...page.attributes], ["data-weidu-afl-youtube-related"]);

  page.navigate("/", "state-navigateend");
  assert.deepEqual([...page.attributes], ["data-weidu-afl-youtube-home"]);
  page.poll("/watch");
  assert.deepEqual([...page.attributes], ["data-weidu-afl-youtube-related"]);

  page.change({ youtubeRecommendations: { newValue: false } });
  assert.equal(page.poll("/"), false);
  assert.equal(page.attributes.size, 0);
});

test("a later local setting wins over an in-flight initial read", async () => {
  const page = loadContent("www.youtube.com", "/");
  page.change({ youtubeShorts: { newValue: false }, youtubeHome: { newValue: false } });
  await page.resolve({ youtubeShorts: true, youtubeHome: true, youtubeRecommendations: true });
  assert.equal(page.attributes.size, 0);
  page.navigate("/watch");
  assert.deepEqual([...page.attributes], ["data-weidu-afl-youtube-related"]);
});

function element({ link = false, hiddenBySite = false, marker = "", display = "none", text = "" } = {}) {
  return {
    closest: () => hiddenBySite,
    matches: () => false,
    querySelector: () => link,
    textContent: text,
    style: { display, getPropertyValue: () => marker },
  };
}

test("page status distinguishes supported empty Home, unrecognized shell, off, and out of scope", async () => {
  let nudge = element();
  const page = loadContent("www.youtube.com", "/", {
    querySelectorAll: (selector) => selector.includes("ytd-feed-nudge-renderer") ? [nudge] : [],
  });
  await page.resolve({ youtubeHome: true });
  assert.deepEqual(await page.status(), {
    site: "youtube",
    filters: { youtubeShorts: "off", youtubeHome: "unrecognized", youtubeWatchRecommendations: "not-applicable" },
  });
  nudge = element({ text: "An actual signed-out message" });
  assert.equal((await page.status()).filters.youtubeHome, "absent");
  page.navigate("/shorts/sample");
  assert.deepEqual((await page.status()).filters, {
    youtubeShorts: "not-applicable", youtubeHome: "not-applicable", youtubeWatchRecommendations: "not-applicable",
  });
});

test("page status verifies this filter's CSS and sees a saved setting before storage event delivery", async () => {
  let related = element({ link: true, marker: "youtubeHome" });
  const page = loadContent("www.youtube.com", "/watch", {
    querySelectorAll: (selector) => selector.includes("ytd-watch-flexy #related") ? [related] : [],
  });
  await page.resolve();
  page.saveWithoutEvent({ youtubeWatchRecommendations: true });
  assert.equal((await page.status()).filters.youtubeWatchRecommendations, "unrecognized");
  assert.ok(page.attributes.has("data-weidu-afl-youtube-related"));

  related = element({ link: true, marker: "youtubeWatchRecommendations", display: "inline" });
  assert.equal((await page.status()).filters.youtubeWatchRecommendations, "unrecognized");
  related = element({ link: true, marker: "youtubeWatchRecommendations" });
  assert.equal((await page.status()).filters.youtubeWatchRecommendations, "hidden");
});

test("Reddit page status checks content evidence and leaves unknown layouts unrecognized", async () => {
  let showPost = false;
  let trending = element({ marker: "redditTrending" });
  const page = loadContent("www.reddit.com", "/", {
    querySelectorAll: (selector) => {
      if (selector.includes("trending-today")) return [trending];
      return showPost && selector.includes("shreddit-post") ? [element()] : [];
    },
  });
  await page.resolve({ redditTrending: true });
  assert.deepEqual(await page.status(), { site: "reddit", filters: { redditTrending: "unrecognized" } });
  showPost = true;
  assert.equal((await page.status()).filters.redditTrending, "absent");
  trending = element({ link: true, marker: "redditTrending" });
  assert.equal((await page.status()).filters.redditTrending, "hidden");
  trending = element({ link: true, marker: "redditTrending", hiddenBySite: true });
  assert.equal((await page.status()).filters.redditTrending, "absent");
});

test("page status samples the same target selectors as the stylesheet", async () => {
  const cssTargets = new Map();
  for (const [, attribute, selector] of css.matchAll(/^html\[(data-weidu-afl-[\w-]+)\] (.+?)[,{]\s*$/gm)) {
    const group = cssTargets.get(attribute) ?? [];
    group.push(selector.trim());
    cssTargets.set(attribute, group);
  }
  const queried = new Set();
  const candidate = element({ link: true, display: "inline" });
  const querySelectorAll = (selector) => {
    queried.add(selector);
    return [candidate];
  };
  const youtube = loadContent("www.youtube.com", "/", { querySelectorAll });
  await youtube.resolve({ youtubeShorts: true, youtubeHome: true, youtubeWatchRecommendations: true });
  await youtube.status();
  youtube.navigate("/watch");
  await youtube.status();
  const reddit = loadContent("www.reddit.com", "/", { querySelectorAll });
  await reddit.resolve({ redditTrending: true });
  await reddit.status();
  assert.deepEqual(queried, new Set([...cssTargets.values()].map((selectors) => selectors.join(", "))));
});

test("Reddit uses only the local trending setting", async () => {
  const page = loadContent("www.reddit.com", "/r/popular/");
  await page.resolve({ youtubeShorts: true, youtubeRecommendations: true });
  page.change({ redditTrending: { newValue: true } }, "sync");
  assert.equal(page.attributes.size, 0);

  page.change({ redditTrending: { newValue: true } });
  assert.deepEqual([...page.attributes], ["data-weidu-afl-reddit-trending"]);
  page.change({ redditTrending: { oldValue: true } });
  assert.equal(page.attributes.size, 0);
});
