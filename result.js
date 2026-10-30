const text = new URLSearchParams(location.search).get("text") ?? "";
const translatedEl = document.getElementById("translated");
document.getElementById("original").textContent = text;

chrome.runtime.sendMessage({ type: "translate", text }).then((reply) => {
  if (reply?.ok) {
    translatedEl.textContent = reply.translated;
  } else {
    translatedEl.textContent = reply?.error || "번역에 실패했습니다.";
    translatedEl.classList.add("err");
  }
});

document.getElementById("copy").addEventListener("click", () => {
  navigator.clipboard.writeText(translatedEl.textContent);
});
