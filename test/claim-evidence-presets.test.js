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
  // K2 is preserved but lives in the collapsed "다른 검증 예시 보기" section, after the result.
  const more = html.slice(html.indexOf('class="ce-more-examples"'), html.indexOf('id="ceViewExamples"'));
  assert.ok(more.includes('id="btnLoadCeK2"') && more.includes('id="btnLoadCeK2Control"'));
});

test('first screen shows only the representative preset (no contrast) and no internal case labels', () => {
  const panel = html.slice(html.indexOf('id="ceViewVerify"'), html.indexOf('id="ceViewExamples"'));
  const first = panel.slice(0, panel.indexOf('class="ce-more-examples"'));
  assert.deepEqual([...first.matchAll(/id="(btnLoadCe\w+)"/g)].map(m => m[1]), ['btnLoadCeD4']);
  assert.ok(first.includes('대표 사례 실행') && first.includes('실제 KCI 논문이지만 현재 인용문을 뒷받침하는 근거가 부족한 사례'));
  assert.equal(/같은 문장 · 올바른 근거로 비교|btnLoadCeD4Contrast|btnTraceContrastInline/.test(first), false, 'contrast is offered only after a result');
  const visible = first.replace(/<!--[\s\S]*?-->/g, '').replace(/\sid="[^"]*"/g, '');
  assert.equal(/D4|K2|CONTROLLED|PERTURBATION/.test(visible), false);
  const more = panel.slice(panel.indexOf('class="ce-more-examples"'));
  assert.ok(more.includes('<summary class="ce-more-examples-summary">다른 검증 예시 보기</summary>'));
  for (const id of ['btnLoadCeK2', 'btnLoadCeK2Control', 'btnLoadCeExample', 'btnLoadCeInsufficient']) assert.ok(more.includes(`id="${id}"`), id);
  assert.equal(fnBody('renderCeTraceResult').includes("검증된 KCI 근거 재생 (${escapeHtml(data.scenario"), false, 'scenario name only in technical details');
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
