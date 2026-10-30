const auto = document.getElementById("auto");
const pdf = document.getElementById("pdf");
chrome.storage.sync.get({ autoTranslate: true, usePdfViewer: true }, (v) => {
  auto.checked = v.autoTranslate;
  pdf.checked = v.usePdfViewer;
});
auto.addEventListener("change", () => chrome.storage.sync.set({ autoTranslate: auto.checked }));
pdf.addEventListener("change", () => chrome.storage.sync.set({ usePdfViewer: pdf.checked }));
