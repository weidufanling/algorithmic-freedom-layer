(() => {
  "use strict";

  const AFL = globalThis.AFL ??= {};
  const youtubeHosts = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);
  const redditHosts = new Set(["reddit.com", "www.reddit.com", "old.reddit.com"]);
  const campaignKeys = new Set([
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "utm_id", "utm_source_platform", "utm_creative_format", "utm_marketing_tactic",
  ]);
  const protectedKeys = new Set([
    "code", "state", "exp", "expires", "expiry", "jwt", "key-pair-id", "policy",
    "api_key", "apikey", "accesskey", "authkey", "oauth", "sso", "samlrequest", "samlresponse",
    "next", "continue", "dest", "destination", "url", "u", "target", "to", "return", "returnto",
    "returnurl", "redirecturi", "redirecturl", "redirectto", "redirect", "relaystate",
  ]);
  const videoId = /^[A-Za-z0-9_-]{11}$/;
  const youtubeVideoPath = /^\/(?:shorts|live)\/[A-Za-z0-9_-]{11}\/?$/;
  const youtubeShortPath = /^\/[A-Za-z0-9_-]{11}\/?$/;
  const redditPostPath = /^\/(?:(?:r|user)\/[A-Za-z0-9_-]+\/)?comments\/[a-z0-9]+(?:\/[A-Za-z0-9_-]+(?:\/[a-z0-9]+)?)?\/?$/;

  function siteForDirectLink(url) {
    const { hostname, pathname, searchParams } = url;
    if (hostname === "youtu.be" && youtubeShortPath.test(pathname)) return "youtube";
    if (youtubeHosts.has(hostname)) {
      if (youtubeVideoPath.test(pathname)) return "youtube";
      const ids = searchParams.getAll("v");
      if (pathname === "/watch" && ids.length === 1 && videoId.test(ids[0])) return "youtube";
    }
    if (redditHosts.has(hostname) && redditPostPath.test(pathname)) return "reddit";
    return null;
  }

  function isProtectedKey(name) {
    const key = name.toLowerCase();
    return protectedKeys.has(key)
      || /^(?:x-amz-|x-goog-|oauth[_-])/.test(key)
      || /(?:^|[-_])(?:sig|signature|token|auth|authorization|credential|hmac|redirect|return)(?:$|[-_])/.test(key);
  }

  function result(url, reason, removed = []) {
    return { url, reason, removed };
  }

  AFL.cleanLink = function cleanLink(input) {
    if (typeof input !== "string") return result("", "invalid");
    const original = input.trim();
    const address = /^https?:\/\/([^/?#]+)([^?#]*)/i.exec(original);
    // Reject ambiguous syntax such as a missing authority, whitespace or backslashes.
    if (!address || /[\u0000-\u0020\u007f\\]/u.test(original)) return result("", "invalid");

    let parsed;
    try {
      parsed = new URL(original);
    } catch {
      return result("", "invalid");
    }

    if (address[1].includes("@")) return result(original, "protected");
    if (address[1].toLowerCase() !== parsed.hostname || parsed.pathname !== (address[2] || "/")) {
      return result(original, "unchanged");
    }
    const site = siteForDirectLink(parsed);
    if (!site) return result(original, "unchanged");

    const hashIndex = original.indexOf("#");
    const beforeHash = hashIndex < 0 ? original : original.slice(0, hashIndex);
    const fragment = hashIndex < 0 ? "" : original.slice(hashIndex);
    const queryIndex = beforeHash.indexOf("?");
    if (queryIndex < 0) return result(original, "unchanged");
    const query = beforeHash.slice(queryIndex + 1);
    // Some servers interpret a literal semicolon as a second query separator.
    if (query.includes(";")) return result(original, "protected");

    const retained = [];
    const removed = [];
    for (const pair of query.split("&")) {
      const equalsIndex = pair.indexOf("=");
      const key = equalsIndex < 0 ? pair : pair.slice(0, equalsIndex);
      try {
        if (isProtectedKey(decodeURIComponent(key.replace(/\+/g, " ")).trim())) {
          return result(original, "protected");
        }
      } catch {
        return result(original, "protected");
      }
      // Match only literal, case-sensitive names. Keep all other pairs byte for byte.
      if (equalsIndex >= 0 && (campaignKeys.has(key) || (site === "youtube" && key === "si"))) {
        removed.push(key);
      } else {
        retained.push(pair);
      }
    }

    if (!removed.length) return result(original, "unchanged");
    const cleanedQuery = retained.length ? `?${retained.join("&")}` : "";
    return result(beforeHash.slice(0, queryIndex) + cleanedQuery + fragment, "cleaned", removed);
  };
})();
