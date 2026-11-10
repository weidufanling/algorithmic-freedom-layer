"use strict";

const afl = globalThis.AFL;
const byId = (id) => document.getElementById(id);
const settingsStatus = byId("settings-status");
const linkStatus = byId("link-status");
const originalLink = byId("original-link");
const cleanedLink = byId("cleaned-link");
const result = byId("cleaned-result");
const useTab = byId("use-tab");
const pageStatusMessage = byId("page-status-message");
const pageStatusList = byId("page-status-list");
const keys = Object.keys(afl.defaults);
const filtersBySite = new Map([
  ["youtube", ["youtubeShorts", "youtubeHome", "youtubeWatchRecommendations"]],
  ["reddit", ["redditTrending"]],
]);
const statusCopy = new Map([
  ["hidden", "Hidden on this page."],
  ["off", "Switch is off."],
  ["absent", "No matching section on this page."],
  ["unrecognized", "AFL does not recognise this layout."],
  ["not-applicable", "Doesn’t apply on this page."],
]);
const pendingWrites = new Map();
let lastSettings;
let currentTab;
let tabRequest = 0;

function saveChoice(name, control) {
  const requested = control.checked;
  const previous = pendingWrites.get(name) ?? Promise.resolve();
  settingsStatus.textContent = "";

  // Serialize writes for this switch so a later choice is always saved last.
  const saved = previous.then(async () => {
    if (pendingWrites.get(name) !== saved) return;

    let fallback = lastSettings[name];
    try {
      await afl.api.storage.local.set({ [name]: requested });
      fallback = requested;
    } catch {
      if (pendingWrites.get(name) === saved) {
        settingsStatus.textContent = "Couldn’t save that choice. Try again.";
      }
    }
    if (pendingWrites.get(name) !== saved) return;

    // Another popup may have saved a choice while this write was pending.
    const beforeRead = lastSettings;
    const latest = await afl.loadSettings().catch(() => undefined);
    if (pendingWrites.get(name) !== saved) return;
    pendingWrites.delete(name);
    const observed = beforeRead === lastSettings ? latest : lastSettings;
    control.checked = observed?.[name] ?? fallback;
    if (!pendingWrites.size) void refreshCurrentTab();
  });
  pendingWrites.set(name, saved);
}

function initSettings() {
  for (const name of keys) {
    const control = byId(name);
    control.addEventListener("change", () => saveChoice(name, control));
  }

  afl.watchSettings((settings) => {
    const previous = lastSettings;
    lastSettings = settings;
    if (!previous) settingsStatus.textContent = "";
    for (const name of keys) {
      const control = byId(name);
      if (!pendingWrites.has(name)) control.checked = settings[name];
      control.disabled = false;
    }
    if (previous && !pendingWrites.size) void refreshCurrentTab();
  }, () => {
    settingsStatus.textContent = "Couldn’t load your choices. Reopen the extension to try again.";
  });
}

function clearResult() {
  result.hidden = true;
  cleanedLink.value = "";
  linkStatus.textContent = "";
}

function showPageStatus(report, unavailable = "AFL could not check this tab. On YouTube or Reddit, check site access and reload the page.") {
  const activeKeys = filtersBySite.get(report?.site);
  const recognised = activeKeys?.every((key) => statusCopy.has(report.filters?.[key]));
  const message = recognised ? "" : unavailable;
  if (pageStatusMessage.textContent !== message) pageStatusMessage.textContent = message;
  pageStatusMessage.hidden = Boolean(recognised);
  pageStatusList.hidden = !recognised;
  for (const key of keys) {
    const row = byId(`page-${key}`);
    row.hidden = !recognised || !activeKeys.includes(key);
    if (row.hidden) continue;
    const label = byId(`state-${key}`);
    const text = statusCopy.get(report.filters[key]);
    if (label.textContent !== text) label.textContent = text;
  }
}

function showNewFeed(feed) {
  const link = byId("reddit-new-link");
  if (feed) link.href = feed.url;
  else link.removeAttribute("href");
  link.hidden = !feed || feed.current;
  byId("reddit-new-current").hidden = !feed?.current;
  byId("reddit-new-feed").hidden = !feed;
}

async function sendToTab(tab, message) {
  if (tab?.id == null) return;
  try {
    return await afl.api.tabs.sendMessage(tab.id, message);
  } catch {
    // The browser can decline a message to a page that is unavailable.
  }
}

async function refreshCurrentTab() {
  const request = ++tabRequest;
  let tab;
  try {
    [tab] = await afl.api.tabs.query({ active: true, currentWindow: true });
  } catch {
    // Pasting a link works independently of the browser's tab permission.
  }
  if (request !== tabRequest) return;

  currentTab = tab;
  useTab.disabled = !/^https?:\/\//i.test(tab?.url ?? "");
  const feed = useTab.disabled ? null : afl.redditNewFeed(tab.url);
  const [report, hasNewFeed] = await Promise.all([
    sendToTab(tab, "afl:page-status"),
    feed && sendToTab(tab, "afl:has-reddit-new"),
  ]);
  if (request !== tabRequest) return;

  showPageStatus(report);
  showNewFeed(hasNewFeed === true ? feed : null);
}

function refreshAfterNavigation() {
  useTab.disabled = true;
  showNewFeed(null);
  showPageStatus(null, "Checking this tab…");
  void refreshCurrentTab();
}

useTab.addEventListener("click", () => {
  if (useTab.disabled) return;
  clearResult();
  originalLink.value = currentTab.url;
  originalLink.focus();
});

afl.api.tabs?.onActivated?.addListener(refreshAfterNavigation);
afl.api.tabs?.onUpdated?.addListener((tabId, changes) => {
  if (tabId === currentTab?.id && (changes.url || changes.status)) refreshAfterNavigation();
});

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

initSettings();
void refreshCurrentTab();
