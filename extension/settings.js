"use strict";

globalThis.AFL = {
  api: globalThis.browser ?? globalThis.chrome,
  defaults: Object.freeze({
    youtubeShorts: false,
    youtubeRecommendations: false,
    redditTrending: false,
  }),
  async loadSettings() {
    const saved = await this.api.storage.local.get(Object.keys(this.defaults));
    const settings = { ...this.defaults };
    for (const name of Object.keys(settings)) {
      settings[name] = saved[name] === true;
    }
    return settings;
  },
};
