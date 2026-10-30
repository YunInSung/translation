import { preprocess, MAX_CHARS } from "./lib/preprocess.js";
import { translateText } from "./lib/translate.js";

const READER = chrome.runtime.getURL("pdfjs/web/reader.html");

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get({ autoTranslate: true, usePdfViewer: true }, (v) => {
    chrome.storage.sync.set(v);
  });
});

// 콘텐츠 스크립트·PDF 뷰어에서 오는 번역 요청
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "translate") return;
  run(msg.text).then(sendResponse);
  return true;
});

async function run(rawText) {
  const text = preprocess(rawText).slice(0, MAX_CHARS);
  if (!text) return { ok: false, error: "번역할 텍스트가 없습니다." };
  try {
    const { translated } = await translateText(text);
    return { ok: true, original: text, translated };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

// ---- PDF를 크롬 기본 뷰어 대신 내장 PDF.js 뷰어로 연다 ----

function readerUrl(pdfUrl) {
  const u = new URL(pdfUrl);
  const hash = u.hash; // #page=3 같은 값은 뷰어에 그대로 넘긴다
  u.hash = "";
  return `${READER}?src=${encodeURIComponent(u.href)}${hash}`;
}

async function viewerEnabled() {
  const { usePdfViewer } = await chrome.storage.sync.get({ usePdfViewer: true });
  return usePdfViewer;
}

async function redirect(tabId, pdfUrl) {
  if (!(await viewerEnabled())) return;
  chrome.tabs.update(tabId, { url: readerUrl(pdfUrl) }).catch(() => {});
}

// 주소가 .pdf로 끝나면 로딩 전에 바로 전환 (깜빡임 없음)
chrome.webNavigation.onBeforeNavigate.addListener(
  (d) => d.frameId === 0 && redirect(d.tabId, d.url),
  { url: [{ pathSuffix: ".pdf", schemes: ["http", "https", "file"] }] },
);

// arXiv(/pdf/2301.00001)처럼 확장자가 없는 PDF는 응답 헤더로 판별
chrome.webRequest.onHeadersReceived.addListener(
  (d) => {
    if (d.method !== "GET" || d.tabId < 0) return;
    const header = (name) =>
      d.responseHeaders?.find((h) => h.name.toLowerCase() === name)?.value ?? "";
    const isPdf = /application\/pdf/i.test(header("content-type"));
    const isDownload = /^\s*attachment/i.test(header("content-disposition"));
    if (isPdf && !isDownload) redirect(d.tabId, d.url);
  },
  { urls: ["http://*/*", "https://*/*"], types: ["main_frame"] },
  ["responseHeaders"],
);
