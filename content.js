// 웹페이지에서 영어 텍스트를 드래그하면 근처에 번역 툴팁을 띄운다.
(() => {
  const MIN_CHARS = 8;
  const MAX_CHARS = 5000;

  let autoTranslate = true;
  let token = 0;
  let host = null;
  let box = null;

  try {
    chrome.storage.sync.get({ autoTranslate: true }, (v) => (autoTranslate = v.autoTranslate));
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.autoTranslate) autoTranslate = changes.autoTranslate.newValue;
    });
  } catch {}

  const CSS = `
    :host { all: initial; }
    .tip {
      position: absolute; z-index: 2147483647; box-sizing: border-box;
      max-width: 420px; min-width: 120px; padding: 10px 12px;
      background: #1f2430; color: #f2f4f8; border-radius: 8px;
      font: 14px/1.55 -apple-system, "Segoe UI", "Malgun Gothic", sans-serif;
      box-shadow: 0 6px 24px rgba(0,0,0,.35); white-space: pre-wrap; word-break: break-word;
    }
    .tip.err { background: #5a1f24; }
    .tip.load { color: #aab2c5; }
  `;

  function ensureBox() {
    if (box) return box;
    host = document.createElement("div");
    host.style.cssText = "all: initial; position: absolute; top: 0; left: 0; z-index: 2147483647;";
    const root = host.attachShadow({ mode: "open" });
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(CSS);
      root.adoptedStyleSheets = [sheet];
    } catch {
      const style = document.createElement("style");
      style.textContent = CSS;
      root.appendChild(style);
    }
    box = document.createElement("div");
    box.className = "tip";
    box.style.display = "none";
    root.appendChild(box);
    document.documentElement.appendChild(host);
    return box;
  }

  function hide() {
    token++;
    if (box) box.style.display = "none";
  }

  function place(rect) {
    const el = ensureBox();
    el.style.display = "block";
    const gap = 8;
    let top = window.scrollY + rect.bottom + gap;
    let left = window.scrollX + rect.left;
    const maxLeft = window.scrollX + document.documentElement.clientWidth - el.offsetWidth - 8;
    left = Math.max(window.scrollX + 8, Math.min(left, maxLeft));
    // 아래 공간이 부족하면 선택 영역 위로
    if (rect.bottom + gap + el.offsetHeight > window.innerHeight && rect.top - gap - el.offsetHeight > 0) {
      top = window.scrollY + rect.top - gap - el.offsetHeight;
    }
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
  }

  function show(rect, text, cls = "") {
    const el = ensureBox();
    el.className = `tip ${cls}`.trim();
    el.textContent = text;
    place(rect);
  }

  function selectionRect() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    return rect.width || rect.height ? rect : null;
  }

  function looksEnglish(text) {
    const letters = (text.match(/[A-Za-z]/g) || []).length;
    const nonSpace = (text.match(/\S/g) || []).length;
    const words = (text.match(/[A-Za-z]{2,}/g) || []).length;
    return nonSpace > 0 && words >= 2 && letters / nonSpace >= 0.5;
  }

  async function translateAndShow(text, rect) {
    const my = ++token;
    show(rect, "번역 중…", "load");
    let reply;
    try {
      reply = await chrome.runtime.sendMessage({ type: "translate", text: text.slice(0, MAX_CHARS) });
    } catch (e) {
      reply = { ok: false, error: "확장 프로그램과 통신하지 못했습니다. 페이지를 새로고침해 주세요." };
    }
    if (my !== token) return; // 그 사이 다른 선택/닫기가 있었음
    if (reply?.ok) show(rect, reply.translated);
    else show(rect, reply?.error || "번역에 실패했습니다.", "err");
  }

  document.addEventListener("mouseup", (e) => {
    if (host && e.composedPath().includes(host)) return;
    if (!autoTranslate) return;
    setTimeout(() => {
      const text = (window.getSelection()?.toString() ?? "").trim();
      if (text.length < MIN_CHARS || !looksEnglish(text)) return;
      const rect = selectionRect();
      if (rect) translateAndShow(text, rect);
    }, 10);
  });

  document.addEventListener("mousedown", (e) => {
    if (host && e.composedPath().includes(host)) return;
    hide();
  });
  document.addEventListener("keydown", (e) => e.key === "Escape" && hide());

  // 우클릭 메뉴에서 온 요청
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type !== "translate-selection") return;
    const rect = selectionRect();
    if (!rect) {
      sendResponse({ shown: false });
      return;
    }
    translateAndShow(msg.text, rect);
    sendResponse({ shown: true });
  });
})();
