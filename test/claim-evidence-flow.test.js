import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createTrustVerifyServer } from '../src/server.js';

// Presentation flow: contrast only after a result, progress steps bound to the real trace request, no LIVE wording.
const html = await readFile(new URL('../src/ui/index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/ui/app.js', import.meta.url), 'utf8');
const fnSource = name => {
  const start = app.indexOf(`function ${name}(`);
  return app.slice(app.lastIndexOf('\n', start) + 1, app.indexOf('\n}\n', start) + 2);
};
const constSource = name => app.match(new RegExp(`const ${name} = [\\s\\S]*?;\\n`))[0];
const escapeHtml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const load = (names, consts, extra = '') => new Function('escapeHtml', 'state', `
  ${consts.map(constSource).join('\n')}
  ${names.map(fnSource).join('\n')}
  ${extra}
  return { ${names.join(', ')} };`);

const { renderCeContrastBlock } = load(['renderCeContrastBlock'], ['FINANCE_D4_DRAFT_SENTENCE', 'FINANCE_D4_CONTRAST_SENTENCE', 'CE_TRACE_STATUS'])(escapeHtml, null);
const { ceTraceStepStates } = load(['ceTraceStepStates'], [])(escapeHtml, null);
const finance = JSON.parse(await readFile(new URL('../artifacts/evaluation/claim-evidence-finance-d4/finance-d4.json', import.meta.url), 'utf8'));
const DRAFT = JSON.parse(app.match(/const FINANCE_D4_DRAFT_SENTENCE = ('[^']*');/)[1].replace(/^'|'$/g, '"'));
const CONTRAST = JSON.parse(app.match(/const FINANCE_D4_CONTRAST_SENTENCE = ('[^']*');/)[1].replace(/^'|'$/g, '"'));

async function trace(draftText, references = finance.bibliography.split('\n')) {
  const liveMustNotRun = { async articleSearch() { throw new Error('no live KCI'); }, async articleDetail() { throw new Error('no live KCI'); } };
  const server = createTrustVerifyServer({ kciAdapter: liveMustNotRun });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/claim-evidence/trace`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: 'FINANCE_D4', evidence_mode: 'FROZEN_EVIDENCE', draft_text: draftText, references }),
    });
    return response.json();
  } finally { server.close(); await once(server, 'close'); }
}
const runOf = data => ({
  marker: data.linking.marker, article_id: data.citation_integrity.article_id, article_title: data.citation_integrity.article_title,
  ci_status: data.citation_integrity.status, ce_status: data.claim_evidence.status,
  shared_count: (data.claim_evidence.grounding.shared_anchors ?? data.claim_evidence.grounding.best_shared_anchors).length,
  citing_anchor_count: data.claim_evidence.grounding.citing_anchor_count,
});

test('first screen has no contrast control; it exists only in the post-result renderer', () => {
  const panel = html.slice(html.indexOf('id="ceViewVerify"'), html.indexOf('id="ceViewExamples"'));
  assert.equal(/btnLoadCeD4Contrast|btnTraceContrastInline|같은 문장 · 올바른 근거로 비교/.test(panel), false);
  assert.ok(fnSource('renderCeTraceResult').includes('${renderCeContrastBlock(data, ce)}'));
});

test('FINANCE_D4 [2] result offers the contrast CTA; [1] result shows the same-sentence note and real responses', async () => {
  const d4 = await trace(DRAFT);
  assert.equal(d4.claim_evidence.status, 'INSUFFICIENT_EVIDENCE');
  const cta = renderCeContrastBlock.call(null, d4, d4.claim_evidence);
  assert.ok(cta.includes('id="btnTraceContrastInline"') && cta.includes('↔ 같은 문장 · 올바른 근거로 비교'));
  assert.ok(cta.includes('인용 문장은 그대로 두고, 연결된 논문만 실제 근거 source로 변경합니다.'));
  assert.equal(/CONSISTENT_WITH_EVIDENCE|ART\d{9}/.test(cta), false, 'no preview of the contrast verdict');

  const contrast = await trace(CONTRAST);
  assert.equal(contrast.claim_evidence.status, 'CONSISTENT_WITH_EVIDENCE');
  const withRuns = runs => load(['renderCeContrastBlock'], ['FINANCE_D4_DRAFT_SENTENCE', 'FINANCE_D4_CONTRAST_SENTENCE', 'CE_TRACE_STATUS'])(escapeHtml, { ceFinanceRuns: runs })
    .renderCeContrastBlock(contrast, contrast.claim_evidence);
  const alone = withRuns({});
  assert.ok(alone.includes('문장은 그대로 유지 · [2] → [1] 근거 source만 변경'));
  assert.equal(alone.includes('btnTraceContrastInline') || alone.includes('ce-side-by-side-contrast'), false, 'no comparison without both responses');
  const both = withRuns({ '[2]': runOf(d4), '[1]': runOf(contrast) });
  for (const value of [d4.citation_integrity.article_id, contrast.citation_integrity.article_id, '1 / 9', '9 / 9', 'INSUFFICIENT_EVIDENCE', 'CONSISTENT_WITH_EVIDENCE']) {
    assert.ok(both.includes(value), value);
  }
  // A custom sentence never gets the preset contrast.
  const custom = await trace('Equity prices respond to monetary policy shocks [2].');
  assert.equal(renderCeContrastBlock(custom, custom.claim_evidence ?? {}), '');
  // No verdict is hardcoded in the contrast renderer.
  assert.equal(/ART\d{9}|'CONSISTENT_WITH_EVIDENCE'/.test(fnSource('renderCeContrastBlock')), false);
});

test('progress steps are derived from the backend response only', async () => {
  const d4 = ceTraceStepStates(await trace(DRAFT));
  assert.deepEqual(d4.marker, ['done', '[2]']);
  assert.deepEqual(d4.reference, ['done', '참고문헌 #2']);
  assert.deepEqual(d4.evidence, ['done', 'ART002510435']);
  assert.deepEqual(d4.grounding, ['done', 'FAIL']);
  assert.deepEqual(d4.result, ['done', 'INSUFFICIENT_EVIDENCE']);

  const contrast = ceTraceStepStates(await trace(CONTRAST));
  assert.deepEqual(contrast.grounding, ['done', 'PASS']);
  assert.deepEqual(contrast.result, ['done', 'CONSISTENT_WITH_EVIDENCE']);

  const outside = ceTraceStepStates(await trace(DRAFT, [finance.bibliography.split('\n')[0], '[2] 홍길동 (2021). 가상의 통화정책 연구. 가상학회지, 1(1), 1-10.']));
  assert.deepEqual(outside.evidence, ['stop', 'NO_FROZEN_EVIDENCE']);
  assert.equal(outside.grounding[0], 'skip');

  const unlinked = ceTraceStepStates(await trace('Equity prices respond to monetary policy shocks.'));
  assert.deepEqual(unlinked.marker, ['stop', 'MARKER_UNRESOLVED']);
  assert.equal(unlinked.reference[0], 'skip');
  assert.equal(unlinked.evidence[0], 'skip');
  assert.equal(unlinked.grounding[0], 'skip');
});

test('loading is bound to the request lifecycle and always ends', () => {
  const body = fnSource('executeCeTrace');
  const order = ['renderCeTraceProgress(progressNote)', "await fetch('/api/claim-evidence/trace'", 'if (!res.ok) throw', 'await revealCeTraceSteps(data)', 'renderCeTraceResult(data)', '} catch (err) {', "setCeTraceStep(key, 'error'", '} finally {', "classList.remove('is-busy')", 'el.btnExecuteCeVerify.disabled = false'];
  let at = -1;
  for (const marker of order) {
    const next = body.indexOf(marker, at + 1);
    assert.ok(next > at, `${marker} in order`);
    at = next;
  }
  // In-flight state shows every step as 진행; nothing is marked 완료 before the response or advanced by a timer.
  const progress = fnSource('renderCeTraceProgress');
  assert.ok(progress.includes('is-run') && !/is-done|setTimeout|setInterval/.test(progress));
  assert.equal((app.match(/revealCeTraceSteps\(/g) ?? []).length, 2, 'defined once, called once (after the response)');
});

test('no LIVE / real-time KCI wording in the Claim–Evidence verify flow', () => {
  const panel = html.slice(html.indexOf('id="ceViewVerify"'), html.indexOf('id="ceViewExamples"'));
  const code = ['renderCeTraceProgress', 'ceTraceStepStates', 'executeCeTrace', 'renderCeTraceResult', 'renderCeContrastBlock'].map(fnSource).join('\n')
    + constSource('CE_TRACE_STEPS') + constSource('CE_STEP_LABELS');
  for (const text of [panel, code]) {
    // Case-sensitive so the aria-live attribute is not mistaken for LIVE wording.
    assert.equal(/\bLIVE\b|\b[Ll]ive KCI|실시간|KCI API|API 검색|API 호출/.test(text.replace(/<!--[\s\S]*?-->/g, '')), false);
  }
  assert.ok(code.includes('검증된 KCI 근거를 확인하고 있습니다...'));
  assert.ok(code.includes('③ 검증된 KCI 근거 불러오기'));
});
