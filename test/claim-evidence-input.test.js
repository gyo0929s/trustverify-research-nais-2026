import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createTrustVerifyServer } from '../src/server.js';

// Claim–Evidence input UX: user input (sentence + bibliography) is separate from the system resolution shown after a run.
const html = await readFile(new URL('../src/ui/index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/ui/app.js', import.meta.url), 'utf8');
const fnBody = name => {
  const start = app.indexOf(`function ${name}(`);
  return app.slice(start, app.indexOf('\n}\n', start));
};
const panel = html.slice(html.indexOf('id="ceViewVerify"'), html.indexOf('id="ceViewExamples"'));
const inputCard = panel.slice(panel.indexOf('ce-verify-input-card'), panel.indexOf('id="ceReservedResults"'));
const tagOf = id => inputCard.match(new RegExp(`<textarea[^>]*id="${id}"[^>]*>`))?.[0] ?? '';

const FINANCE_REFS = [
  '[1] 김예빈, 조두연 (2023). 텍스트 마이닝에 기반한 통화정책 기조가 한국 주식시장 및 부동산시장에 미치는 영향에 대한 분석. 국제금융연구, 13(1), 5-31. https://doi.org/10.34251/ifadoi.13.1.202305.001',
  '[2] 이보형, 홍우형 (2019). 금융위기 전후 부동산시장과 주식시장의 상호영향에 관한 연구. 신용카드리뷰, 13(3), 14-31. https://doi.org/10.35348/ccr.2019.13.3.002',
];
const SENTENCE = 'The estimation results suggest that equity prices fall in response to a contractionary, hawkish monetary policy shock [2].';

async function trace(references) {
  const liveMustNotRun = { async articleSearch() { throw new Error('no live KCI'); }, async articleDetail() { throw new Error('no live KCI'); } };
  const server = createTrustVerifyServer({ kciAdapter: liveMustNotRun });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/claim-evidence/trace`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: 'FINANCE_D4', evidence_mode: 'FROZEN_EVIDENCE', draft_text: SENTENCE, references }),
    });
    return response.json();
  } finally { server.close(); await once(server, 'close'); }
}

test('input card holds two editable textareas in order: citing sentence, then bibliography, then the CTA', () => {
  for (const id of ['ceVerifyInputText', 'ceVerifyReferences']) {
    const tag = tagOf(id);
    assert.ok(tag, id);
    assert.equal(/\b(readonly|disabled)\b/.test(tag), false, `${id} is editable`);
  }
  assert.ok(inputCard.indexOf('1. 내가 실제로 작성한 인용 문장') < inputCard.indexOf('2. 참고문헌 목록'));
  assert.ok(inputCard.indexOf('2. 참고문헌 목록') < inputCard.indexOf('id="btnExecuteCeVerify"'));
  assert.ok(inputCard.includes('Citing Statement with Marker'));
  assert.ok(inputCard.includes('발표용 통제 인용 문장(영문) · 실제 KCI 공개 초록 기반 검증'));
  assert.ok(inputCard.includes('현재 발표 모드는 검증된 KCI 근거를 재현합니다. 고정 근거에 없는 참고문헌은 자동 판정하지 않습니다.'));
  assert.ok(inputCard.includes('검증 모드: 검증된 KCI 근거 재현'));
  assert.equal(/FROZEN EVALUATION EVIDENCE|\bP0\b|Frozen KCI Evidence|검증된 KCI 근거 재생/.test(inputCard), false, 'mode kept to one small line');
  // Technical mode labels are no longer headline elements of the input card.
  assert.equal(/batch-step-pill|ce-frozen-persistent-banner|ce-integration-badge/.test(inputCard), false);
});

test('before a run the input card shows no KCI record or verdict; the resolution card is hidden', () => {
  assert.equal(/ceSelectedPaper|ART\d{9}|VERIFIED|REF-META-001|KCI ID/.test(inputCard), false);
  const card = panel.match(/<div class="ce-resolution-card" id="ceResolutionCard"[^>]*>/)?.[0] ?? '';
  assert.ok(/\bhidden\b/.test(card), 'resolution card starts hidden');
  const pending = fnBody('showPendingReference');
  assert.ok(pending.includes('el.ceResolutionCard.hidden = true'));
  assert.equal(/ART\d{9}|VERIFIED|REF-META-001|CONSISTENT_WITH_EVIDENCE|INSUFFICIENT_EVIDENCE/.test(pending), false);
  // Editing either input returns to the pending state.
  assert.ok(app.includes("el.ceVerifyReferences?.addEventListener('input', () => showPendingReference("));
  assert.ok(app.includes("el.ceVerifyInputText?.addEventListener('input', () => showPendingReference("));
});

test('the trace sends the bibliography as typed; the record is shown only from the backend response', () => {
  const executor = fnBody('executeCeTrace');
  assert.ok(executor.includes('const references = ceReferenceRows();'));
  assert.ok(/references,\n/.test(executor), 'request body uses the typed rows');
  assert.equal(/CE_TRACE_CONTEXTS\[[^\]]+\][^\n]*\.references/.test(executor), false, 'no silent fallback to preset rows');
  assert.ok(fnBody('loadClaimEvidenceP0').includes("CE_TRACE_CONTEXTS.FINANCE_D4.references.join('\\n')"), 'prefilled from the committed rows');
  const render = fnBody('renderCeTraceResult');
  assert.ok(render.includes('el.ceResolutionCard.hidden = false'));
  assert.ok(render.includes('data.citation_integrity.article_id'));
  assert.ok(render.includes("ci.state === 'NO_FROZEN_EVIDENCE'"));
});

test('prefilled FINANCE_D4 rows give the unchanged backend result', async () => {
  const body = await trace(FINANCE_REFS);
  assert.equal(body.citation_integrity.article_id, 'ART002510435');
  assert.equal(body.citation_integrity.status, 'VERIFIED');
  assert.equal(body.claim_evidence.status, 'INSUFFICIENT_EVIDENCE');
});

test('a reference outside the frozen evidence is reported explicitly, never linked to an existing record', async () => {
  const edited = [FINANCE_REFS[0], '[2] 홍길동 (2021). 가상의 통화정책 연구. 가상학회지, 1(1), 1-10.'];
  const body = await trace(edited);
  assert.equal(body.linking.state, 'RESOLVED');
  assert.equal(body.citation_integrity.state, 'NO_FROZEN_EVIDENCE');
  assert.equal(body.citation_integrity.status, undefined, 'no VERIFIED is produced');
  assert.equal(body.citation_integrity.article_id, undefined, 'no fallback to ART002510435');
  assert.equal(body.claim_evidence.state, 'NOT_RUN');
});
