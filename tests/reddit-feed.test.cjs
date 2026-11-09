"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

globalThis.AFL = {};
require("../extension/reddit-feed.js");
const { redditNewFeed } = globalThis.AFL;

test("offers Reddit's own New sort on a community listing", () => {
  for (const path of ["/r/firefox", "/r/firefox/", "/r/firefox/hot/", "/r/firefox/top/?t=year"]) {
    assert.deepEqual(redditNewFeed("https://www.reddit.com" + path), {
      url: "https://www.reddit.com/r/firefox/new/",
      current: false,
    });
  }
});

test("recognizes an open community New feed", () => {
  assert.deepEqual(redditNewFeed("https://www.reddit.com/r/firefox/new/?x=1"), {
    url: "https://www.reddit.com/r/firefox/new/",
    current: true,
  });
});

test("does not invent a feed for comments, special feeds or lookalike hosts", () => {
  for (const url of [
    "https://www.reddit.com/",
    "https://www.reddit.com/r/all/",
    "https://www.reddit.com/r/popular/",
    "https://www.reddit.com/r/firefox/comments/abc123/title/",
    "https://www.reddit.com/r/firefox/about/",
    "https://www.reddit.com/r/firefox/s/abc123",
    "https://www.reddit.com.example.org/r/firefox/",
    "https://www.reddit.com@evil.test/r/firefox/",
    "https://name:pw@www.reddit.com/r/firefox/",
    "https://old.reddit.com/r/firefox/",
    "http://www.reddit.com/r/firefox/",
    "not a URL",
  ]) {
    assert.equal(redditNewFeed(url), null, url);
  }
});
