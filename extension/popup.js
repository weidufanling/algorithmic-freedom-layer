"use strict";

const afl = globalThis.AFL;
const byId = (id) => document.getElementById(id);
const settingsStatus = byId("settings-status");
const linkStatus = byId("link-status");
const originalLink = byId("original-link");
const cleanedLink = byId("cleaned-link");
const result = byId("cleaned-result");

async function initSettings() {
  const updated = new Set();
  try {
    afl.api.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      for (const name of Object.keys(afl.defaults)) {
        if (!Object.hasOwn(changes, name)) continue;
        updated.add(name);
        byId(name).checked = changes[name].newValue === true;
      }
    });
    const settings = await afl.loadSettings();
    for (const [name, value] of Object.entries(settings)) {
      const control = byId(name);
      if (!updated.has(name)) control.checked = value;
      control.disabled = false;
      control.addEventListener("change", async () => {
        const requested = control.checked;
        settingsStatus.textContent = "";
        try {
          await afl.api.storage.local.set({ [name]: requested });
        } catch {
          if (control.checked === requested) {
            try {
              control.checked = (await afl.loadSettings())[name];
            } catch {
              control.checked = !requested;
            }
          }
          settingsStatus.textContent = "Couldn’t save that choice. Try again.";
        }
      });
    }
  } catch {
    settingsStatus.textContent = "Couldn’t load your choices. Reopen the extension to try again.";
  }
}

function clearResult() {
  result.hidden = true;
  cleanedLink.value = "";
  linkStatus.textContent = "";
}

async function initCurrentTab() {
  const useTab = byId("use-tab");
  try {
    const [tab] = await afl.api.tabs.query({ active: true, currentWindow: true });
    if (!/^https?:\/\//i.test(tab?.url ?? "")) return;

    useTab.disabled = false;
    useTab.addEventListener("click", () => {
      clearResult();
      originalLink.value = tab.url;
      originalLink.focus();
    });
    const feed = afl.redditNewFeed(tab.url);
    if (feed && tab.id != null && await afl.api.tabs.sendMessage(tab.id, "afl:has-reddit-new")) {
      const link = byId("reddit-new-link");
      link.href = feed.url;
      link.hidden = feed.current;
      byId("reddit-new-current").hidden = !feed.current;
      byId("reddit-new-feed").hidden = false;
    }
  } catch {
    // Pasting a link works independently of the browser's tab permission.
  }
}

originalLink.addEventListener("input", clearResult);

byId("cleaner").addEventListener("submit", (event) => {
  event.preventDefault();
  clearResult();
  const cleaned = afl.cleanLink(originalLink.value);
  if (cleaned.reason === "invalid") {
    linkStatus.textContent = "Enter a full link beginning with https:// or http://.";
    originalLink.focus();
    return;
  }
  cleanedLink.value = cleaned.url;
  result.hidden = false;
  if (cleaned.removed.length) {
    linkStatus.textContent = "Removed " + cleaned.removed.join(", ") + " from the link.";
  } else if (cleaned.reason === "protected") {
    linkStatus.textContent = "Kept this link as entered because it may rely on its existing fields.";
  } else {
    linkStatus.textContent = "No supported tracking fields found. Kept the link as entered.";
  }
});

byId("copy-link").addEventListener("click", async () => {
  const url = cleanedLink.value;
  try {
    await navigator.clipboard.writeText(url);
    if (cleanedLink.value === url) linkStatus.textContent = "Link copied.";
  } catch {
    if (cleanedLink.value !== url) return;
    cleanedLink.focus();
    cleanedLink.select();
    linkStatus.textContent = "Automatic copy isn’t available here. Copy the selected link yourself.";
  }
});

void initSettings();
void initCurrentTab();
