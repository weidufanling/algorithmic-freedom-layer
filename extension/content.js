(() => {
  const youtube = ["www.youtube.com", "m.youtube.com"].includes(location.hostname);
  const reddit = location.hostname === "www.reddit.com";
  if (!youtube && !reddit) return;

  const keys = youtube ? ["youtubeShorts", "youtubeRecommendations"] : ["redditTrending"];
  const settings = {};
  const changedWhileLoading = new Set();
  let routeTimer;
  let appliedPath;

  function applyFilters() {
    const root = document.documentElement;
    if (!root) return;

    if (reddit) {
      root.toggleAttribute("data-weidu-afl-reddit-trending", settings.redditTrending === true);
      return;
    }

    const path = location.pathname;
    appliedPath = path;
    const home = path === "/";
    const watch = path === "/watch";
    const shorts = settings.youtubeShorts === true;
    const recommendations = settings.youtubeRecommendations === true;
    root.toggleAttribute("data-weidu-afl-youtube-home", recommendations && home);
    root.toggleAttribute("data-weidu-afl-youtube-related", recommendations && watch);
    root.toggleAttribute("data-weidu-afl-shorts-content", shorts && (home || watch || path === "/results"));
    root.toggleAttribute("data-weidu-afl-shorts-navigation", shorts && !/^\/shorts(?:\/|$)/.test(path));

    // Older engines lack a same-document navigation event that all sites use.
    // While a filter is enabled, check only the pathname and only in visible tabs.
    if (!window.navigation && (shorts || recommendations) && routeTimer === undefined) {
      routeTimer = window.setInterval(() => {
        if (!document.hidden && location.pathname !== appliedPath) applyFilters();
      }, 750);
    } else if (!shorts && !recommendations && routeTimer !== undefined) {
      window.clearInterval(routeTimer);
      routeTimer = undefined;
    }
  }

  if (youtube) {
    window.addEventListener("yt-navigate-finish", applyFilters, true);
    window.addEventListener("state-navigateend", applyFilters);
    window.addEventListener("popstate", applyFilters);
    window.navigation?.addEventListener("currententrychange", applyFilters);
  }
  window.addEventListener("pageshow", applyFilters);
  document.addEventListener("DOMContentLoaded", applyFilters, { once: true });

  AFL.api.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;

    for (const key of keys) {
      if (!Object.hasOwn(changes, key)) continue;
      changedWhileLoading.add(key);
      settings[key] = changes[key].newValue === true;
    }
    applyFilters();
  });

  AFL.loadSettings().then((saved) => {
    for (const key of keys) {
      if (!changedWhileLoading.has(key)) settings[key] = saved[key] === true;
    }
    applyFilters();
  }, () => {
    // Leave the page as it is if extension storage cannot be read.
  });
})();
