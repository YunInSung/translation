import { preprocess, MAX_CHARS } from "./lib/preprocess.js";
import { translateText } from "./lib/translate.js";

const MENU_ID = "translate-selection";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "한국어로 번역",
    contexts: ["selection"],
  });
  chrome.storage.sync.get({ autoTranslate: true }, (v) => {
    chrome.storage.sync.set(v);
  });
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

// 콘텐츠 스크립트(드래그 번역)에서 오는 요청
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "translate") return;
  run(msg.text).then(sendResponse);
  return true;
});

// 우클릭 메뉴: 일반 페이지는 툴팁, 크롬 PDF 뷰어 등 스크립트가 안 도는 곳은 팝업 창
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText) return;

  if (tab?.id != null) {
    try {
      const reply = await chrome.tabs.sendMessage(
        tab.id,
        { type: "translate-selection", text: info.selectionText },
        { frameId: info.frameId ?? 0 },
      );
      if (reply?.shown) return;
    } catch {
      // 콘텐츠 스크립트가 없는 페이지 (PDF 뷰어, chrome:// 등)
    }
  }
  openResultWindow(info.selectionText);
});

function openResultWindow(rawText) {
  const text = preprocess(rawText).slice(0, MAX_CHARS);
  const url = chrome.runtime.getURL("result.html") + "?text=" + encodeURIComponent(text);
  chrome.windows.create({ url, type: "popup", width: 480, height: 440 });
}
