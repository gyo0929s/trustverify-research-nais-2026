import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Static truthfulness checks for the Claim–Evidence verify presets (no browser needed).
const html = await readFile(new URL('../src/ui/index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/ui/app.js', import.meta.url), 'utf8');
const korean = JSON.parse(await readFile(new URL('../artifacts/evaluation/claim-evidence-korean/korean-cases.json', import.meta.url), 'utf8'));
const k2 = korean.cases.find(item => item.case_id === 'K2');
const fnBody = name => {
  const start = app.indexOf(`function ${name}(`);
  return app.slice(start, app.indexOf('\n}\n', start));
};
const constant = name => JSON.parse(app.match(new RegExp(`const ${name} = ("(?:[^"\\\\]|\\\\.)*");`))[1]);

test('reference card shows no record ID or verdict before verification', () => {
  const card = html.slice(html.indexOf('id="ceSelectedPaperId"') - 200, html.indexOf('id="ceSelectedPaperMeta"'));
  assert.equal(/ART\d{9}|VERIFIED/.test(card), false);
  assert.ok(card.includes('검증 전'));
  const pending = fnBody('showPendingReference');
  assert.equal(/ART\d{9}|VERIFIED|CONSISTENT_WITH_EVIDENCE|POTENTIAL_CLAIM_SHIFT|INSUFFICIENT_EVIDENCE/.test(pending), false);
  assert.ok(pending.includes('검증 대기'));
  const onLoad = fnBody('loadClaimEvidenceP0');
  assert.equal(/article\.record_id|article\.title/.test(onLoad), false, 'no stale P0 article in the card');
  assert.ok(onLoad.includes('showPendingReference'));
});

test('K2 presets use the committed artifact values and the KOREAN_P0 scenario', () => {
  assert.equal(constant('KOREAN_K2_REFERENCE'), k2.reference);
  assert.equal(constant('KOREAN_K2_PERTURBATION_SENTENCE'), k2.perturbation.draft_sentence);
  assert.equal(constant('KOREAN_K2_CONTROL_SENTENCE'), k2.control.draft_sentence);
  assert.ok(app.includes("KOREAN_K2: { scenario: 'KOREAN_P0', references: [KOREAN_K2_REFERENCE] }"));
  assert.ok(html.includes('id="btnLoadCeK2"') && html.includes('통제된 변형'));
  assert.ok(html.includes('id="btnLoadCeK2Control"'));
  // K1 is not a presentation preset (observed NOT_DISCRIMINATING).
  assert.equal(korean.cases.find(item => item.case_id === 'K1').presentation_preset, false);
  assert.equal(/ART001298965|행동경제학 · 과잉 단정/.test(html.slice(html.indexOf('검증 프리셋'), html.indexOf('검증 프리셋') + 3000)), false);
  // D4 stays first and primary.
  const presets = html.slice(html.indexOf('검증 프리셋'), html.indexOf('검증 프리셋') + 3000);
  assert.ok(presets.indexOf('btnLoadCeD4"') < presets.indexOf('btnLoadCeK2"'));
});

test('trace results render the returned status three ways; no hardcoded verdict or rule', () => {
  const render = fnBody('renderCeTraceResult');
  assert.ok(render.includes('CE_TRACE_STATUS[ce.status]'));
  assert.ok(render.includes("data.claim_evidence.state !== 'RUN'"), 'NOT_RUN is handled before any status');
  assert.equal(render.includes("|| 'REF-META-001'"), false, 'no invented rule fallback');
  assert.equal(render.includes("isInsufficient ? '현재 공개 근거만으로 판단 불충분' : '공개 근거 범위에서 정합'"), false);
  assert.ok(render.includes("const isFinanceContrast = data.scenario === 'FINANCE_D4'"));
  assert.ok(app.includes("const CE_SHIFT_TEXT = '실제 KCI 초록 근거와 비교해 표현 강도 변화가 관측되었습니다.'"));
  assert.ok(app.includes("const CE_INSUFFICIENT_TEXT = '현재 확보된 KCI 공개 초록 범위에서 이 문장을 뒷받침하는 충분한 근거를 특정하지 못했습니다.'"));
  const executor = fnBody('executeCeTrace');
  assert.equal(executor.includes("scenario: 'FINANCE_D4'"), false, 'scenario comes from the active preset context');
});

test('Claim–Evidence verify UI carries no accusing wording', () => {
  const panel = html.slice(html.indexOf('id="ceViewVerify"'), html.indexOf('id="ceViewExamples"'));
  const code = ['showPendingReference', 'renderCeTraceResult', 'fillCePreset'].map(fnBody).join('\n');
  for (const text of [panel, code]) assert.equal(/HALLUCINATION|FAKE|WRONG[ _]CLAIM|"FALSE"|환각|허위/.test(text), false);
});
