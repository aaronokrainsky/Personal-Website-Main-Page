const viewCount = document.querySelector("#view-count");
const storageKey = "aaron-okrainsky-site-local-views";

if (viewCount) {
  const currentViews = Number.parseInt(localStorage.getItem(storageKey) || "0", 10);
  const nextViews = Number.isFinite(currentViews) ? currentViews + 1 : 1;

  localStorage.setItem(storageKey, String(nextViews));
  viewCount.textContent = nextViews.toLocaleString();
}
