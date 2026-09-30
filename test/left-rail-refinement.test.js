import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Left Rail Refinement — Korean-First Product Navigation verification', async () => {
  const html = await readFile(new URL('../src/ui/index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/ui/styles.css', import.meta.url), 'utf8');

  // Extract the entire left extension rail block
  assert.ok(html.includes('id="extensionRail"'), 'extensionRail must exist');
  const railBlock = html.slice(
    html.indexOf('id="extensionRail"'),
    html.indexOf('</aside>', html.indexOf('id="extensionRail"'))
  );

  // 1. No "현재 검증" heading
  assert.equal(railBlock.includes('현재 검증'), false, 'Must not contain "현재 검증" heading');

  // 2. No "확장 연구 검증" heading
  assert.equal(railBlock.includes('확장 연구 검증'), false, 'Must not contain "확장 연구 검증" heading');

  // 3. No circle / diamond module markers
  assert.equal(/●|◇|◆/.test(railBlock), false, 'Must not contain circle / diamond markers (●, ◇, ◆)');

  // 4. Rail width approximately 230–250px
  const widthMatch = css.match(/\.extension-rail\s*\{[^}]*width:\s*(\d+)px/);
  assert.ok(widthMatch, 'Extension rail width must be specified in px in CSS');
  const railWidth = parseInt(widthMatch[1], 10);
  assert.ok(railWidth >= 230 && railWidth <= 250, `Rail width (${railWidth}px) must be between 230px and 250px`);

  // 5. All five module titles are Korean-first with exact icons, subtitles, and badges
  const expectedModules = [
    {
      id: 'railBtnCitation',
      icon: '🛡️',
      title: '인용 무결성',
      sub: '실제 KCI 서지 검증',
      badge: '실시간',
    },
    {
      id: 'railBtnClaimEvidence',
      icon: '🔎',
      title: '주장–근거 검증',
      sub: '인용 문장과 공개 근거 대조',
      badge: 'P0',
    },
    {
      id: 'railBtnAgent',
      icon: '🧩',
      title: '검증 에이전트',
      sub: '검증 결과를 다음 AI 작업으로 연결',
      badge: 'Agent P0',
    },
    {
      id: 'railBtnTranslation',
      icon: '🌐',
      title: '번역 충실도',
      sub: '한→영 의미 변화 확인',
      badge: '예정',
    },
    {
      id: 'railBtnAcademicRef',
      icon: '✍️',
      title: '학술 표현 참조',
      sub: '분야별 실제 논문 표현과 비교',
      badge: '파일럿',
    },
  ];

  let lastIndex = -1;
  for (const mod of expectedModules) {
    const idx = railBlock.indexOf(`id="${mod.id}"`);
    assert.ok(idx > -1, `Module button ${mod.id} must exist in rail`);
    assert.ok(idx > lastIndex, `Module ${mod.title} must be in correct vertical sequence`);
    lastIndex = idx;

    const btnHtml = railBlock.slice(idx, railBlock.indexOf('</button>', idx));
    assert.ok(btnHtml.includes(mod.icon), `${mod.title} icon must be ${mod.icon}`);
    assert.ok(btnHtml.includes(mod.title), `${mod.title} title must exist`);
    assert.ok(btnHtml.includes(mod.sub), `${mod.title} subtitle must match: ${mod.sub}`);
    assert.ok(btnHtml.includes(mod.badge), `${mod.title} badge must match: ${mod.badge}`);
  }

  // 6. English terminology is substantially reduced (no English primary titles in rail)
  const forbiddenPrimaryEnglish = [
    'Citation Integrity',
    'Claim–Evidence Alignment',
    'TrustVerify Agent',
    'Translation Fidelity',
    'EXPANSION / P0',
  ];
  for (const eng of forbiddenPrimaryEnglish) {
    const titleRegex = new RegExp(`class="rail-item-title"[^>]*>\\s*${eng}\\s*<`, 'i');
    assert.equal(titleRegex.test(railBlock), false, `Rail must not use ${eng} as primary title`);
  }

  // 7. No ACTIVE badge in the rail
  assert.equal(/ACTIVE/.test(railBlock), false, 'Must not show ACTIVE badge in left rail');

  // 8. Brand subtitle is Korean-first
  assert.ok(html.includes('TrustVerify Research'), 'Brand name must be TrustVerify Research');
  assert.ok(html.includes('연구 검증 시스템') || html.includes('연구 신뢰성 검증 에이전트'), 'Brand subtitle must be Korean-first');
});
