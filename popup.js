const auto = document.getElementById("auto");
chrome.storage.sync.get({ autoTranslate: true }, (v) => (auto.checked = v.autoTranslate));
auto.addEventListener("change", () => chrome.storage.sync.set({ autoTranslate: auto.checked }));
