// 구글 번역 비공식 엔드포인트(키 불필요, 무료).
const ENDPOINT = "https://translate.googleapis.com/translate_a/single";
const CHUNK_SIZE = 3000;

export const TARGET_LANG = "ko";

// 문장 경계를 우선해서 CHUNK_SIZE 이하로 나눈다.
export function splitChunks(text, size = CHUNK_SIZE) {
  const chunks = [];
  let rest = text;
  while (rest.length > size) {
    let cut = rest.lastIndexOf(". ", size);
    if (cut < size / 2) cut = rest.lastIndexOf(" ", size);
    if (cut < size / 2) cut = size;
    else cut += 1;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

async function translateChunk(text, target, fetchImpl) {
  const url = `${ENDPOINT}?client=gtx&sl=auto&tl=${target}&dt=t`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ q: text }).toString(),
  });
  if (!res.ok) throw new Error(`번역 요청 실패 (HTTP ${res.status})`);
  const data = await res.json();
  const segments = Array.isArray(data?.[0]) ? data[0] : [];
  return {
    translated: segments.map((s) => s?.[0] ?? "").join(""),
    detected: typeof data?.[2] === "string" ? data[2] : "",
  };
}

export async function translateText(text, { target = TARGET_LANG, fetchImpl = fetch } = {}) {
  const out = [];
  let detected = "";
  for (const chunk of splitChunks(text)) {
    const r = await translateChunk(chunk, target, fetchImpl);
    out.push(r.translated);
    detected ||= r.detected;
  }
  return { translated: out.join(" "), detected };
}
