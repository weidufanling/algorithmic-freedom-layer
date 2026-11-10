"use strict";

(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const defaults = Object.freeze({
    youtubeShorts: false,
    youtubeHome: false,
    youtubeWatchRecommendations: false,
    redditTrending: false,
  });
  const legacyKey = "youtubeRecommendations";
  const keys = [...Object.keys(defaults), legacyKey];

  function resolveSettings(saved) {
    const recommendations = saved[legacyKey] === true;
    return {
      youtubeShorts: saved.youtubeShorts === true,
      youtubeHome: Object.hasOwn(saved, "youtubeHome") ? saved.youtubeHome === true : recommendations,
      youtubeWatchRecommendations: Object.hasOwn(saved, "youtubeWatchRecommendations")
        ? saved.youtubeWatchRecommendations === true
        : recommendations,
      redditTrending: saved.redditTrending === true,
    };
  }

  function updateValue(saved, key, value) {
    if (value === undefined) delete saved[key];
    else saved[key] = value;
  }

  globalThis.AFL = {
    api,
    defaults,
    async loadSettings() {
      return resolveSettings(await api.storage.local.get(keys));
    },
    watchSettings(onChange, onError) {
      let saved;
      let changeNumber = 0;
      let readNumber = 0;
      let appliedRead = 0;
      const recentChanges = new Map();

      api.storage.onChanged.addListener((changes, area) => {
        if (area !== "local") return;
        let changed = false;
        for (const key of keys) {
          if (!Object.hasOwn(changes, key)) continue;
          const value = changes[key].newValue;
          recentChanges.set(key, { number: ++changeNumber, value });
          if (saved) updateValue(saved, key, value);
          changed = true;
        }
        if (saved && changed) onChange(resolveSettings(saved));
      });

      async function refresh() {
        const number = ++readNumber;
        const beforeRead = changeNumber;
        let snapshot;
        try {
          snapshot = await api.storage.local.get(keys);
        } catch (error) {
          if (number >= appliedRead) onError?.(error);
          return;
        }
        if (number < appliedRead) return;
        appliedRead = number;
        saved = { ...snapshot };
        for (const [key, change] of recentChanges) {
          if (change.number > beforeRead) updateValue(saved, key, change.value);
        }
        onChange(resolveSettings(saved));
      }

      void refresh();
      return refresh;
    },
  };
})();
