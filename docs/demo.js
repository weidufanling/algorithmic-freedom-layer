"use strict";

const byId = (id) => document.getElementById(id);
const switches = document.querySelectorAll("[data-hides]");
const shorts = byId("sample-shorts");
const recommendations = byId("sample-recommendations");
const trending = byId("sample-trending");
const youtubeStatuses = [
  "Both shelves are visible.",
  "The Shorts shelf is hidden.",
  "The recommended videos are hidden.",
  "Both shelves are hidden.",
];

function updateSample(control) {
  byId(control.dataset.hides).hidden = control.checked;
  const youtubeState = Number(shorts.hidden) + 2 * Number(recommendations.hidden);
  const youtubeStatus = youtubeStatuses[youtubeState];
  const redditStatus = trending.hidden ? "The trending shelf is hidden." : "The trending shelf is visible.";
  if (byId("youtube-status").textContent !== youtubeStatus) byId("youtube-status").textContent = youtubeStatus;
  if (byId("reddit-status").textContent !== redditStatus) byId("reddit-status").textContent = redditStatus;
}

for (const control of switches) {
  control.checked = false;
  control.disabled = false;
  control.addEventListener("change", () => updateSample(control));
}

const original = byId("original-link");
const cleaned = byId("cleaned-link");
const result = byId("cleaned-result");
const linkStatus = byId("link-status");
const example = byId("example-link");
const submit = byId("clean-submit");

function clearResult() {
  cleaned.value = "";
  result.hidden = true;
  linkStatus.textContent = "";
}

function showResult() {
  clearResult();
  const { url, reason, removed } = globalThis.AFL.cleanLink(original.value);
  if (reason === "invalid") {
    linkStatus.textContent = "Enter a full link beginning with https:// or http://.";
    original.focus();
    return;
  }

  cleaned.value = url;
  result.hidden = false;
  if (removed.length) {
    linkStatus.textContent = `Removed ${removed.join(", ")} from the link.`;
  } else if (reason === "protected") {
    linkStatus.textContent = "Kept this link as entered because it may rely on its existing fields.";
  } else {
    linkStatus.textContent = "No supported tracking fields found. Kept the link as entered.";
  }
}

byId("cleaner").addEventListener("submit", (event) => {
  event.preventDefault();
  showResult();
});
original.addEventListener("input", clearResult);
example.addEventListener("click", () => {
  original.value = "https://youtu.be/aqz-KE-bpKQ?si=example&utm_source=share&t=30";
  showResult();
});
byId("copy-link").addEventListener("click", async () => {
  const url = cleaned.value;
  try {
    await navigator.clipboard.writeText(url);
    if (cleaned.value === url) linkStatus.textContent = "Link copied.";
  } catch {
    if (cleaned.value !== url) return;
    cleaned.focus();
    cleaned.select();
    linkStatus.textContent = "Automatic copy is unavailable here. Copy the selected link yourself.";
  }
});

if (typeof globalThis.AFL?.cleanLink === "function") {
  original.disabled = false;
  example.disabled = false;
  submit.disabled = false;
} else {
  linkStatus.textContent = "The link cleaner could not load. Reload this page to try again.";
}

for (const key of ["download", "source", "feedback"]) {
  const configured = globalThis.AFLReleaseLinks?.[key];
  if (!configured) continue;

  let url;
  try {
    url = new URL(configured);
  } catch {
    continue;
  }
  if (url.protocol !== "https:" || url.username || url.password) continue;

  const link = byId(`${key}-link`);
  link.href = url.href;
  link.hidden = false;
  byId(`${key}-pending`).hidden = true;
}
