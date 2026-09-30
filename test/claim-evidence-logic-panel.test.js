import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { GROUNDING } from '../src/claim-evidence/contract.js';
import { createTrustVerifyServer } from '../src/server.js';

// Two-stage verification logic panel: rendered from the backend grounding, never recomputed in the browser.
const app = await readFile(new URL('../src/ui/app.js', import.meta.url), 'utf8');
const finance = JSON.parse(await readFile(new URL('../artifacts/evaluation/claim-evidence-finance-d4/finance-d4.json', import.meta.url), 'utf8'));
const fnSource = name => {
  const start = app.indexOf(`function ${name}(`);
  return app.slice(start, app.indexOf('\n}\n', start) + 2);
};
// Load the real UI function with a minimal escapeHtml, so the test exercises the shipped rendering code.
const escapeHtml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const renderCeLogicPanel = new Function('escapeHtml', `${fnSource('renderCeLogicPanel')}; return renderCeLogicPanel;`)(escapeHtml);
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

async function trace(marker) {
  const liveMustNotRun = { async articleSearch() { throw new Error('no live KCI'); }, async articleDetail() { throw new Error('no live KCI'); } };
  const server = createTrustVerifyServer({ kciAdapter: liveMustNotRun });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/claim-evidence/trace`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: 'FINANCE_D4', evidence_mode: 'FROZEN_EVIDENCE', draft_text: `${finance.cases[0].citing_claim.replace(/\.$/u, '')} ${marker}.`, references: finance.bibliography.split('\n') }),
    });
    return response.json();
  } finally { server.close(); await once(server, 'close'); }
}

test('trace response exposes the engine grounding unchanged', async () => {
  const unrelated = await trace('[2]');
  assert.equal(unrelated.claim_evidence.status, 'INSUFFICIENT_EVIDENCE');
  assert.equal(unrelated.claim_evidence.insufficiency_reason, 'CLAIM_NOT_GROUNDED_IN_ABSTRACT');
  assert.deepEqual(unrelated.claim_evidence.grounding, finance.cases[0].claim_evidence.grounding);
  const source = await trace('[1]');
  assert.equal(source.claim_evidence.status, 'CONSISTENT_WITH_EVIDENCE');
  assert.deepEqual(source.claim_evidence.grounding, finance.cases[1].claim_evidence.grounding);
  assert.deepEqual({ ...GROUNDING }, { MIN_SHARED_ANCHORS: 3, MIN_COVERAGE: 0.6 });
});

test('FIN-D4 [2]: Stage 1 FAIL with backend counts, Stage 2 not run', async () => {
  const { claim_evidence: ce, linking } = await trace('[2]');
  const html = renderCeLogicPanel({ ...ce, _marker: linking.marker });
  assert.ok(html.includes('ce-logic-stage is-fail'));
  assert.ok(html.includes('ce-logic-stage is-muted'), 'Stage 2 is muted');
  const shown = text(html);
  assert.ok(shown.includes(`공유 내용어 ${ce.grounding.best_shared_anchors.length} / ${ce.grounding.citing_anchor_count}`));
  assert.ok(shown.includes('1 / 9'));
  assert.ok(shown.includes('FAIL') && shown.includes('미실행'));
  assert.ok(shown.includes('근거 문장 미확정 → 표현 변화 판정 미실행'));
  assert.ok(shown.includes('근거가 고정되지 않으면 표현 의미를 추측하지 않습니다.'));
  assert.equal(/인용 핵심어 커버리지 \d+%/.test(shown), false, 'no coverage is invented when the engine did not return one');
  assert.ok(shown.includes('근거를 찾기 전에 의미를 판단하지 않습니다.'));
  assert.ok(shown.includes('이번 결과 아님'), 'expression examples are labeled as general rule examples');
});

test('FIN-D4-CONTRAST [1]: Stage 1 PASS (9/9, 100%) and Stage 2 PASS', async () => {
  const { claim_evidence: ce, linking } = await trace('[1]');
  const html = renderCeLogicPanel({ ...ce, _marker: linking.marker });
  assert.equal((html.match(/ce-logic-stage is-pass/g) ?? []).length, 2);
  assert.equal(html.includes('is-muted') || html.includes('is-fail'), false);
  const shown = text(html);
  assert.ok(shown.includes(`공유 내용어 ${ce.grounding.shared_anchors.length} / ${ce.grounding.citing_anchor_count}`));
  assert.ok(shown.includes('9 / 9') && shown.includes('100%'));
  assert.ok(shown.includes(`초록 문장 #${ce.evidence_span.sentence_index}`));
  assert.ok(shown.includes('확신 · 방향 · 인과 · 양태 변화 없음'));
  assert.ok(shown.includes('CONSISTENT_WITH_EVIDENCE'));
});

test('the panel never recomputes grounding or hardcodes counts', () => {
  const body = fnSource('renderCeLogicPanel');
  assert.equal(/>=|<=|MIN_SHARED_ANCHORS\s*[<>]|coverage\s*[<>]/.test(body), false, 'no threshold comparisons in the UI');
  assert.equal(/1 \/ 9|9 \/ 9|'100%'|anchorsOf|splitSentences|normalize\(/.test(body), false);
  for (const field of ['g.grounded', 'g.shared_anchors', 'g.best_shared_anchors', 'g.citing_anchor_count', 'g.coverage', 'g.thresholds', 'ce.status']) {
    assert.ok(body.includes(field), field);
  }
  // Only the two requested expression examples are shown.
  assert.ok(body.includes('suggest → prove') && body.includes('may → definitely'));
  assert.equal(/association → cause/.test(body), false);
});
