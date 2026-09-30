import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Claim–Evidence Comparison Navigation visual shell integrity', async () => {
  const html = await readFile(new URL('../src/ui/index.html', import.meta.url), 'utf8');

  // 1. Comparison Navigation Banner exists at the top of Claim-Evidence screen
  assert.ok(html.includes('id="ceCompareNavBanner"'), 'ceCompareNavBanner must exist');
  const banner = html.slice(html.indexOf('id="ceCompareNavBanner"'), html.indexOf('id="ceViewVerify"'));

  // Default state & secondary action
  assert.ok(banner.includes('id="btnCeNavDefault"'), 'btnCeNavDefault must exist');
  assert.ok(banner.includes('현재 사례 · 연결된 논문의 근거 부족'), 'Default state text must match specification');
  assert.ok(banner.includes('id="btnCeNavContrast"'), 'btnCeNavContrast must exist');
  assert.ok(banner.includes('↔ 같은 문장 · 올바른 근거로 비교'), 'Secondary action text must match specification');
  assert.ok(banner.includes('문장은 그대로 두고, 연결된 논문만 실제 근거 source로 변경합니다.'), 'Supporting text must match specification');

  // 2. Separate Comparison View exists with clear header and way back button
  assert.ok(html.includes('id="ceViewCompare"'), 'ceViewCompare panel must exist');
  const compareView = html.slice(html.indexOf('id="ceViewCompare"'), html.indexOf('<!-- ============================== END WORKSPACE CLAIM–EVIDENCE'));

  assert.ok(compareView.includes('정상 대조 · 같은 문장, 올바른 근거 논문'), 'Comparison view header must match specification');
  assert.ok(compareView.includes('id="btnCeBackToDefault"'), 'btnCeBackToDefault must exist');
  assert.ok(compareView.includes('← 현재 사례로 돌아가기'), 'Way back button text must match specification');

  // Ensure no hardcoded verdicts were introduced in the comparison view shell
  assert.equal(/CONSISTENT_WITH_EVIDENCE|POTENTIAL_CLAIM_SHIFT|INSUFFICIENT_EVIDENCE/.test(compareView), false, 'no hardcoded verdicts in comparison view shell');

  // 3. app.js routing and wiring checks
  const app = await readFile(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  assert.ok(app.includes('switchCeCompareMode'), 'switchCeCompareMode function must exist');
  assert.ok(app.includes('currentCeCompareMode'), 'currentCeCompareMode state must exist');
  assert.ok(app.includes('ceCompareNavBanner'), 'ceCompareNavBanner DOM ref must exist');
  assert.ok(app.includes('btnCeNavDefault'), 'btnCeNavDefault DOM ref must exist');
  assert.ok(app.includes('btnCeNavContrast'), 'btnCeNavContrast DOM ref must exist');
  assert.ok(app.includes('ceViewCompare'), 'ceViewCompare DOM ref must exist');
  assert.ok(app.includes('btnCeBackToDefault'), 'btnCeBackToDefault DOM ref must exist');

  // Hash routing
  assert.ok(app.includes("hash === 'ce-compare'"), 'ce-compare hash route must exist');
});
