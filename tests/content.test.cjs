const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");
const { runInNewContext } = require("node:vm");

const script = readFileSync(`${__dirname}/../extension/content.js`, "utf8");

function loadContent(hostname, pathname, { navigation = true } = {}) {
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
  const window = new EventTarget();
  window.navigation = navigation ? new EventTarget() : undefined;
  let interval;
  window.setInterval = (callback) => { interval = callback; return 1; };
  window.clearInterval = () => { interval = undefined; };

  let onChanged;
  let resolveSettings;
  const AFL = {
    api: { storage: { onChanged: { addListener: (callback) => { onChanged = callback; } } } },
    loadSettings: () => new Promise((resolve) => { resolveSettings = resolve; }),
  };
  runInNewContext(script, { document, window, location, AFL });

  return {
    attributes,
    change: (changes, area = "local") => onChanged(changes, area),
    async resolve(settings = {}) {
      resolveSettings(settings);
      await Promise.resolve();
    },
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
  page.change({ youtubeShorts: { newValue: false } });
  await page.resolve({ youtubeShorts: true, youtubeRecommendations: true });
  assert.deepEqual([...page.attributes], ["data-weidu-afl-youtube-home"]);
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
