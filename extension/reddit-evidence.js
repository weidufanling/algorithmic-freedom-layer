"use strict";

(() => {
  if (location.origin !== "https://www.reddit.com") return;

  const afl = globalThis.AFL;
  afl.api.runtime.onMessage.addListener((message, _sender, reply) => {
    if (message !== "afl:has-reddit-new") return;

    const feed = afl.redditNewFeed(location.href);
    const visibleSortLink = feed && Array.from(document.links).some((link) =>
      link.href === feed.url || link.href + "/" === feed.url
    );
    reply(Boolean(visibleSortLink));
  });
})();
