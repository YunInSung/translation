import test from "node:test";
import assert from "node:assert/strict";
import { splitChunks, translateText } from "../lib/translate.js";

test("짧은 텍스트는 한 덩어리", () => {
  assert.deepEqual(splitChunks("Hello world."), ["Hello world."]);
});

test("긴 텍스트는 문장 경계에서 나눈다", () => {
  const sentence = "This is a sentence. ";
  const chunks = splitChunks(sentence.repeat(30).trim(), 100);
  assert.ok(chunks.length > 1);
  for (const c of chunks) {
    assert.ok(c.length <= 100);
    assert.ok(c.endsWith("."));
  }
  assert.equal(chunks.join(" "), sentence.repeat(30).trim());
});

test("구글 응답을 이어 붙인다", async () => {
  const fake = async (url, init) => {
    assert.match(url, /tl=ko/);
    assert.equal(init.method, "POST");
    return {
      ok: true,
      json: async () => [[["안녕 ", "Hello "], ["세계", "world"]], null, "en"],
    };
  };
  const r = await translateText("Hello world", { fetchImpl: fake });
  assert.deepEqual(r, { translated: "안녕 세계", detected: "en" });
});

test("HTTP 오류는 예외", async () => {
  const fake = async () => ({ ok: false, status: 429 });
  await assert.rejects(() => translateText("Hello", { fetchImpl: fake }), /429/);
});
