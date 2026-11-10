(() => {
  const youtube = ["www.youtube.com", "m.youtube.com"].includes(location.hostname);
  const reddit = location.hostname === "www.reddit.com";
  if (!youtube && !reddit) return;

  const isHome = (path) => path === "/";
  const isWatch = (path) => path === "/watch";
  const isSearch = (path) => path === "/results";
  const isShorts = (path) => /^\/shorts(?:\/|$)/.test(path);
  const isShownBySite = (element) => !element.closest('[hidden], [aria-hidden="true"]');
  const feedLink = 'a:is([href^="/watch?"], [href^="/shorts/"], [href^="/live/"], [href^="/post/"])';
  const hasFeedLink = (element) => Boolean(element.querySelector(feedLink));
  const hasText = (element) => Boolean(element.textContent.trim());
  const explicitShorts = [
    ":is(ytd-rich-shelf-renderer, ytm-rich-shelf-renderer)[is-shorts]",
    "ytm-rich-item-renderer.is-shorts",
    ":is(ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2)",
  ];
  const explicitShortsSelector = explicitShorts.join(", ");
  const homeGrids = [
    `ytd-browse[page-subtype="home"] ytd-rich-grid-renderer:has(${feedLink})`,
    `ytm-rich-grid-renderer:has(${feedLink})`,
  ];

  // Keep the selectors in step with content.css. The tests compare the two sets.
  const filters = youtube ? {
    youtubeShorts: [
      {
        attribute: "data-weidu-afl-shorts-content",
        applies: (path) => isHome(path) || isWatch(path) || isSearch(path),
        selectors: [
          ...explicitShorts,
          ':is(ytd-reel-shelf-renderer, ytm-reel-shelf-renderer, grid-shelf-view-model):has(ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2, a[href^="/shorts/"]):not(:has(a[href]:not([href="/shorts"], [href^="/shorts/"], [href^="/shorts?"]), mini-game-card-view-model))',
          ':is(ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, yt-lockup-view-model, ytm-rich-item-renderer, ytm-video-with-context-renderer, ytm-compact-video-renderer):has(a[href^="/shorts/"], ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2):not(:has(a[href^="/watch"], a[href^="/live/"]))',
        ],
        hasEvidence: (element) => Boolean(element.querySelector('a[href^="/shorts/"]'))
          || (element.matches(explicitShortsSelector) && hasText(element)),
      },
      {
        attribute: "data-weidu-afl-shorts-navigation",
        applies: (path) => !isShorts(path),
        selectors: [
          ':is(ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer, ytm-pivot-bar-item-renderer):has(> a:is([href="/shorts"], [href^="/shorts/"], [href^="/shorts?"]))',
          "ytm-pivot-bar-item-renderer:has(> :is(.pivot-bar-item-tab.shorts, .pivot-shorts))",
        ],
        hasEvidence: (element) => Boolean(element.querySelector('a[href], [role="tab"], button')) || hasText(element),
      },
    ],
    youtubeHome: [{
      attribute: "data-weidu-afl-youtube-home",
      applies: isHome,
      selectors: homeGrids,
      hasEvidence: () => true,
    }],
    youtubeWatchRecommendations: [{
      attribute: "data-weidu-afl-youtube-related",
      applies: isWatch,
      selectors: ["ytd-watch-flexy #related", 'ytm-item-section-renderer[section-identifier="related-items"]'],
      hasEvidence: hasFeedLink,
    }],
  } : {
    redditTrending: [{
      attribute: "data-weidu-afl-reddit-trending",
      applies: () => true,
      selectors: [
        "trending-today",
        "#reddit-trending-searches-partial-container",
        '#search-dropdown-results-container [id$="_trending_query"]',
        '#search-dropdown-results-container a:is([href^="/search?"], [href^="/search/?"]):is([href*="?source=trending&"], [href*="&source=trending&"], [href$="?source=trending"], [href$="&source=trending"])',
        '#search-dropdown-results-container > div:has(svg[icon-name="trend"]):not(:has(a, button, input))',
      ],
      hasEvidence: (element) => element.matches("a[href]")
        || Boolean(element.querySelector("a[href]"))
        || Boolean(element.shadowRoot?.querySelector("a[href]"))
        || (element.matches('#search-dropdown-results-container [id$="_trending_query"], #search-dropdown-results-container > div') && hasText(element)),
    }],
  };
  const entries = Object.entries(filters);
  let settings = {};
  let routeTimer;
  let appliedPath;

  function applyFilters() {
    const root = document.documentElement;
    if (!root) return;
    const path = location.pathname;
    appliedPath = path;
    for (const [key, parts] of entries) {
      for (const { attribute, applies } of parts) {
        root.toggleAttribute(attribute, settings[key] === true && applies(path));
      }
    }

    // Older engines lack a same-document navigation event that all sites use.
    // While a YouTube filter is enabled, check only the pathname in visible tabs.
    if (!youtube || window.navigation) return;
    const anyEnabled = entries.some(([key]) => settings[key] === true);
    if (anyEnabled && routeTimer === undefined) {
      routeTimer = window.setInterval(() => {
        if (!document.hidden && location.pathname !== appliedPath) applyFilters();
      }, 750);
    } else if (!anyEnabled && routeTimer !== undefined) {
      window.clearInterval(routeTimer);
      routeTimer = undefined;
    }
  }

  function hasLayoutEvidence(selectors, hasEvidence = () => true) {
    for (const element of document.querySelectorAll(selectors)) {
      if (isShownBySite(element) && hasEvidence(element)) return true;
    }
    return false;
  }

  function isKnownLayout(path) {
    if (reddit) {
      return hasLayoutEvidence('shreddit-post[post-id][permalink], shreddit-comment[thingid], #search-dropdown-results-container a[href]');
    }
    if (isHome(path)) {
      return hasLayoutEvidence(homeGrids.join(", "))
        || hasLayoutEvidence('ytd-browse[page-subtype="home"] :is(ytd-feed-nudge-renderer, ytd-message-renderer)', hasText);
    }
    if (isWatch(path)) {
      return hasLayoutEvidence('#movie_player video, ytd-watch-metadata h1, ytm-watch #player video',
        (element) => element.matches("video") || hasText(element));
    }
    if (isSearch(path)) {
      return hasLayoutEvidence("ytd-search :is(ytd-video-renderer, yt-lockup-view-model), ytm-video-with-context-renderer", hasFeedLink);
    }
    return hasLayoutEvidence(':is(ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer, ytm-pivot-bar-item-renderer) > a[href="/feed/subscriptions"]');
  }

  function filterStatus(key, parts, path) {
    const applicable = parts.filter(({ applies }) => applies(path));
    if (applicable.length === 0) return "not-applicable";
    if (settings[key] === false) return "off";
    if (settings[key] !== true) return "unrecognized";

    let found = false;
    for (const { selectors, hasEvidence } of applicable) {
      for (const element of document.querySelectorAll(selectors.join(", "))) {
        if (!isShownBySite(element) || !hasEvidence(element)) continue;
        found = true;
        const style = window.getComputedStyle(element);
        if (style.display === "none" && style.getPropertyValue("--weidu-afl-hidden").trim() === key) return "hidden";
      }
    }
    return !found && isKnownLayout(path) ? "absent" : "unrecognized";
  }

  if (youtube) {
    window.addEventListener("yt-navigate-finish", applyFilters, true);
    window.addEventListener("state-navigateend", applyFilters);
    window.addEventListener("popstate", applyFilters);
    window.navigation?.addEventListener("currententrychange", applyFilters);
  }
  window.addEventListener("pageshow", applyFilters);
  document.addEventListener("DOMContentLoaded", applyFilters, { once: true });

  const refreshSettings = AFL.watchSettings((updated) => {
    settings = updated;
    applyFilters();
  });

  AFL.api.runtime.onMessage.addListener((message, _sender, reply) => {
    if (message !== "afl:page-status") return;
    void refreshSettings().then(() => {
      applyFilters();
      const path = location.pathname;
      const statuses = {};
      for (const [key, parts] of entries) {
        try {
          statuses[key] = filterStatus(key, parts, path);
        } catch {
          // Older selector engines can reject part of a selector list.
          statuses[key] = "unrecognized";
        }
      }
      reply({ site: youtube ? "youtube" : "reddit", filters: statuses });
    });
    return true;
  });
})();
