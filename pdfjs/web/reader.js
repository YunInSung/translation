// reader.html?src=<PDF 주소> : 확장 권한으로 PDF를 내려받아 PDF.js 뷰어에서 연다.
// (뷰어는 다른 출처의 파일 URL을 직접 열지 못하고, 로그인이 필요한 PDF는 쿠키가 있어야 한다.)
const src = new URLSearchParams(location.search).get("src");

function showError(message) {
  const el = document.createElement("div");
  el.style.cssText =
    "position:fixed;top:48px;left:50%;transform:translateX(-50%);z-index:99999;" +
    "padding:10px 14px;background:#5a1f24;color:#fff;border-radius:8px;" +
    "font:14px/1.5 sans-serif;max-width:80vw;word-break:break-all";
  el.textContent = message;
  document.body.appendChild(el);
}

async function main() {
  if (!src) return showError("PDF 주소(src)가 없습니다.");
  const app = window.PDFViewerApplication;
  await app.initializedPromise;

  let res;
  try {
    res = await fetch(src, { credentials: "include" });
  } catch (e) {
    return showError(`PDF를 내려받지 못했습니다: ${src}`);
  }
  if (!res.ok) return showError(`PDF를 내려받지 못했습니다 (HTTP ${res.status}): ${src}`);

  const data = new Uint8Array(await res.arrayBuffer());
  const name = decodeURIComponent(new URL(src).pathname.split("/").pop() || "document");
  await app.open({ data, originalUrl: src });
  document.title = name;
}

main().catch((e) => showError(String(e?.message || e)));
