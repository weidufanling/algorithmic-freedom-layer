"use strict";

globalThis.AFL.redditNewFeed = function redditNewFeed(tabUrl) {
  let url;
  try {
    url = new URL(tabUrl);
  } catch {
    return null;
  }
  if (url.origin !== "https://www.reddit.com" || url.username || url.password) {
    return null;
  }
  const community = /^\/r\/([a-z0-9_]{2,21})(?:\/(best|hot|new|top|rising|controversial))?\/?$/i.exec(url.pathname);
  if (!community || /^(all|popular)$/i.test(community[1])) {
    return null;
  }
  return {
    url: `https://www.reddit.com/r/${community[1]}/new/`,
    current: community[2]?.toLowerCase() === "new",
  };
};
