import test from "node:test";
import assert from "node:assert/strict";
import { preprocess, looksEnglish } from "../lib/preprocess.js";

test("하이픈으로 끊긴 단어를 이어 붙인다", () => {
  assert.equal(preprocess("an algo-\nrithm for sorting"), "an algorithm for sorting");
  assert.equal(preprocess("an algo-\n  rithm"), "an algorithm");
});

test("대문자로 이어지는 하이픈은 유지한다", () => {
  assert.equal(preprocess("the Deep-\nMind team"), "the Deep- Mind team");
});

test("줄바꿈과 연속 공백을 한 칸으로 합친다", () => {
  assert.equal(preprocess("first line\nsecond   line\r\nthird"), "first line second line third");
});

test("합자와 soft hyphen을 정리한다", () => {
  assert.equal(preprocess("efﬁcient ﬂow oﬃce"), "efficient flow office");
  assert.equal(preprocess("trans­lation"), "translation");
});

test("looksEnglish", () => {
  assert.equal(looksEnglish("Attention is all you need"), true);
  assert.equal(looksEnglish("주의가 필요한 전부입니다"), false);
  assert.equal(looksEnglish("x = 1 + 2 = 3"), false);
});
