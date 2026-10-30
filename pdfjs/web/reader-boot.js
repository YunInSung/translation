// PDF.js 기본 샘플 문서가 열리지 않도록 defaultUrl을 비운다. 실제 로딩은 reader.js가 한다.
document.addEventListener("webviewerloaded", (e) => {
  e.detail.source.PDFViewerApplicationOptions.set("defaultUrl", "");
});
