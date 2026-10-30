// PDF에서 복사한 텍스트를 번역하기 좋게 정리한다.

const LIGATURES = {
  "ﬀ": "ff",
  "ﬁ": "fi",
  "ﬂ": "fl",
  "ﬃ": "ffi",
  "ﬄ": "ffl",
};

export const MAX_CHARS = 5000;

export function preprocess(raw) {
  let text = String(raw ?? "");

  text = text.replace(/[ﬀ-ﬄ]/g, (c) => LIGATURES[c]);
  text = text.replace(/­/g, ""); // soft hyphen
  text = text.replace(/[  -​ ]/g, " ");
  text = text.replace(/\r\n?/g, "\n");

  // 줄 끝에서 끊긴 단어: "algo-\nrithm" -> "algorithm"
  text = text.replace(/([A-Za-z])[-‐‑]\s*\n\s*([a-z])/g, "$1$2");

  // 나머지 줄바꿈과 연속 공백은 한 칸으로
  text = text.replace(/\s*\n\s*/g, " ");
  text = text.replace(/[ \t]{2,}/g, " ");

  return text.trim();
}

// 영어 문장인지 대략 판별한다 (한국어·수식만 있는 선택은 건너뛰기 위함).
export function looksEnglish(text) {
  const letters = (text.match(/[A-Za-z]/g) ?? []).length;
  const nonSpace = (text.match(/\S/g) ?? []).length;
  const words = (text.match(/[A-Za-z]{2,}/g) ?? []).length;
  return nonSpace > 0 && words >= 2 && letters / nonSpace >= 0.5;
}
