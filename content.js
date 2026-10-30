// 영어 텍스트를 드래그하면 선택 영역 근처에 번역 툴팁을 띄운다.
// 웹페이지(content script)와 내장 PDF 뷰어(pdfjs/web/reader.html) 양쪽에서 쓴다.
(() => {
  const MIN_CHARS = 8;
  const MAX_CHARS = 5000;

  let autoTranslate = true;
  let token = 0;
  let host = null;
  let box = null;
  let body = null;

  try {
    chrome.storage.sync.get({ autoTranslate: true }, (v) => (autoTranslate = v.autoTranslate));
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.autoTranslate) autoTranslate = changes.autoTranslate.newValue;
    });
  } catch {}

  const CSS = `
    :host { all: initial; }
    .tip {
      position: fixed; z-index: 2147483647; box-sizing: border-box;
      max-width: 420px; min-width: 140px; padding: 10px 30px 10px 12px;
      background: #1f2430; color: #f2f4f8; border-radius: 8px;
      font: 14px/1.55 -apple-system, "Segoe UI", "Malgun Gothic", sans-serif;
      box-shadow: 0 6px 24px rgba(0,0,0,.35);
    }
    .tip.err { background: #5a1f24; }
    .tip.load .body { color: #aab2c5; }
    .body { white-space: pre-wrap; word-break: break-word; user-select: text; }
    .close {
      position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; padding: 0;
      border: 0; border-radius: 4px; background: transparent; color: #aab2c5;
      font: 16px/22px sans-serif; cursor: pointer;
    }
    .close:hover { background: rgba(255,255,255,.15); color: #fff; }
  `;

  function ensureBox() {
    if (box) return box;
    host = document.createElement("div");
    host.style.cssText = "all: initial; position: fixed; top: 0; left: 0; z-index: 2147483647;";
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

    const close = document.createElement("button");
    close.className = "close";
    close.type = "button";
    close.title = "닫기";
    close.textContent = "×";
    close.addEventListener("click", hide);

    body = document.createElement("div");
    body.className = "body";
    box.append(close, body);
    root.appendChild(box);
    document.documentElement.appendChild(host);
    return box;
  }

  function hide() {
    token++;
    if (box) box.style.display = "none";
  }

  function isVisible() {
    return box && box.style.display !== "none";
  }

  function place(rect) {
    const el = ensureBox();
    el.style.display = "block";
    const gap = 8;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    let left = Math.max(8, Math.min(rect.left, vw - el.offsetWidth - 8));
    let top = rect.bottom + gap;
    // 아래 공간이 부족하면 선택 영역 위로
    if (top + el.offsetHeight > vh && rect.top - gap - el.offsetHeight > 0) {
      top = rect.top - gap - el.offsetHeight;
    }
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.visibility = rect.bottom < 0 || rect.top > vh ? "hidden" : "visible";
  }

  function show(rect, text, cls = "") {
    const el = ensureBox();
    el.className = `tip ${cls}`.trim();
    body.textContent = text;
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
    } catch {
      reply = { ok: false, error: "확장 프로그램과 통신하지 못했습니다. 페이지를 새로고침해 주세요." };
    }
    if (my !== token) return; // 그 사이 다른 선택/닫기가 있었음
    if (reply?.ok) show(rect, reply.translated);
    else show(rect, reply?.error || "번역에 실패했습니다.", "err");
  }

  const inTooltip = (e) => host && e.composedPath().includes(host);

  document.addEventListener("mouseup", (e) => {
    if (inTooltip(e) || !autoTranslate) return;
    setTimeout(() => {
      const text = (window.getSelection()?.toString() ?? "").trim();
      if (text.length < MIN_CHARS || !looksEnglish(text)) return;
      const rect = selectionRect();
      if (rect) translateAndShow(text, rect);
    }, 10);
  });

  // 창 바깥을 누르면 닫는다 (뷰어가 이벤트를 가로채도 받도록 capture)
  document.addEventListener("mousedown", (e) => !inTooltip(e) && hide(), true);
  document.addEventListener("keydown", (e) => e.key === "Escape" && hide());

  // 스크롤하면 선택 영역을 따라간다. 선택이 사라졌으면 닫는다.
  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (!isVisible() || ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const rect = selectionRect();
        if (rect) place(rect);
        else hide();
      });
    },
    true,
  );
})();
