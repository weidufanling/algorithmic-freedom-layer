const test = require("node:test");
const assert = require("node:assert/strict");

require("../extension/clean-link.js");
const { cleanLink } = globalThis.AFL;
const video = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

test("keeps video, playlist, timestamp, and fragment data in place", () => {
  const url = video + "&si=abcdef&list=PL123&t=45&index=2&start=3&utm_source=chat#t=2m";
  assert.deepEqual(cleanLink(url), {
    url: video + "&list=PL123&t=45&index=2&start=3#t=2m",
    reason: "cleaned",
    removed: ["si", "utm_source"],
  });
});

test("cleans known video routes on the desktop, mobile, and short YouTube domains", () => {
  for (const url of [
    "https://youtu.be/dQw4w9WgXcQ",
    "https://m.youtube.com/shorts/dQw4w9WgXcQ",
    "https://youtube.com/live/dQw4w9WgXcQ/",
  ]) {
    assert.deepEqual(cleanLink(" " + url + "?si=x#clip "), {
      url: url + "#clip",
      reason: "cleaned",
      removed: ["si"],
    });
  }
});

test("cleans campaign parameters from direct Reddit posts and comments", () => {
  for (const url of [
    "https://www.reddit.com/r/example/comments/ab12cd/title/ef34gh/",
    "https://old.reddit.com/comments/ab12cd/",
    "https://reddit.com/user/example/comments/ab12cd/title/",
  ]) {
    assert.deepEqual(cleanLink(url + "?utm_medium=web3x&context=3&utm_source=share&si=keep"), {
      url: url + "?context=3&si=keep",
      reason: "cleaned",
      removed: ["utm_medium", "utm_source"],
    });
  }
});

test("preserves encoded or uppercase names and the exact bytes of remaining pairs", () => {
  const kept = "&pp=a%2fb+c&%75tm_source=keep&UTM_SOURCE=keep&&pp=a%2Fb%20c&flag&si&uTm_id=1";
  const fragment = "#anchor?utm_source=stay";
  assert.deepEqual(cleanLink(video + "&utm_source=a" + kept + "&utm_source=b" + fragment), {
    url: video + kept + fragment,
    reason: "cleaned",
    removed: ["utm_source", "utm_source"],
  });
});

test("leaves links with signature, token, redirect, and ambiguous query markers untouched", () => {
  for (const query of [
    "X-Amz-Signature=123", "X-Goog-Algorithm=123", "key-pair-id=123", "sig=123",
    "access_token=123", "sso=123", "redirect_uri=https%3A%2F%2Fexample.org",
    "code=123", "next=%2Fother", "%73ignature=123", "broken%XX=value", "a=1;b=2",
  ]) {
    const url = video + "&utm_source=chat&" + query;
    assert.deepEqual(cleanLink(url), { url, reason: "protected", removed: [] });
  }
});

test("leaves out-of-scope links and ambiguous video IDs untouched", () => {
  for (const base of [
    "https://example.org/article",
    "https://bit.ly/example",
    "https://www.reddit.com/r/example/s/shareToken",
    "https://redd.it/ab12cd",
    "https://www.reddit.com/redirect",
    "https://www.youtube.com/redirect",
    "https://www.youtube.com/playlist?list=PL123",
    "https://www.youtube.com/watch?v=invalid",
    video + "&v=abcdefghijk",
    video + "&%76=abcdefghijk",
    "https://www.youtube.com.example.org/watch?v=dQw4w9WgXcQ",
    "https://login.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com:8443/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/example/%2e%2e/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/opaque",
  ]) {
    const url = base + (base.includes("?") ? "&" : "?") + "si=x&utm_source=chat";
    assert.deepEqual(cleanLink(url), { url, reason: "unchanged", removed: [] });
  }
});

test("leaves credential-bearing URLs unchanged even when their hosts appear familiar", () => {
  for (const authority of ["alice:secret@www.youtube.com", "www.youtube.com@evil.example", "@www.youtube.com"]) {
    const url = `https://${authority}/watch?v=dQw4w9WgXcQ&si=x`;
    assert.deepEqual(cleanLink(url), { url, reason: "protected", removed: [] });
  }
});

test("rejects non-HTTP and malformed input", () => {
  for (const input of [
    null, "", "www.youtube.com/watch?v=dQw4w9WgXcQ", "//www.youtube.com/watch",
    "javascript:alert(1)", "ftp://example.org/file", "file:///tmp/x",
    "https:///www.youtube.com/watch", "https://youtube.com:65536/watch",
    "https://www.you\ttube.com/watch", "https://youtube.com/watch here",
    "https://youtube.com\\watch",
  ]) {
    assert.deepEqual(cleanLink(input), { url: "", reason: "invalid", removed: [] });
  }
});

test("running the cleaner again keeps the result identical", () => {
  const { url } = cleanLink(video + "&si=share&utm_content=message&t=4#part");
  assert.deepEqual(cleanLink(url), { url, reason: "unchanged", removed: [] });
});
