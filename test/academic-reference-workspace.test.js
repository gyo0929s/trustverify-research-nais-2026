import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Academic Expression & Agent Vision workspace UI shell integrity', async () => {
  const html = await readFile(new URL('../src/ui/index.html', import.meta.url), 'utf8');

  // 1. Left rail configuration: reused existing item, correct subtitle, PILOT badge
  assert.ok(html.includes('id="railBtnAcademicRef"'));
  const railArBlock = html.slice(html.indexOf('id="railBtnAcademicRef"'), html.indexOf('</button>', html.indexOf('id="railBtnAcademicRef"')));
  assert.ok(railArBlock.includes('학술 표현 참조'));
  assert.ok(railArBlock.includes('분야별 실제 논문 표현과 비교'));
  assert.ok(railArBlock.includes('badge-pilot'));
  assert.ok(railArBlock.includes('파일럿'));

  // 2. Module-aware top navigation for Academic Reference
  assert.ok(html.includes('id="topnavAcademicRef"'));
  const topnavAr = html.slice(html.indexOf('id="topnavAcademicRef"'), html.indexOf('</nav>', html.indexOf('id="topnavAcademicRef"')));
  assert.ok(topnavAr.includes('id="navTabArReference"'));
  assert.ok(topnavAr.includes('표현 참조'));
  assert.ok(topnavAr.includes('id="navTabArHandoff"'));
  assert.ok(topnavAr.includes('검증 결과 활용'));
  assert.ok(topnavAr.includes('id="navTabArVision"'));
  assert.ok(topnavAr.includes('방법 · 비전'));

  // 3. Workspace structure and views
  assert.ok(html.includes('id="workspaceAcademicRef"'));
  const wsAr = html.slice(html.indexOf('id="workspaceAcademicRef"'), html.indexOf('<!-- ============================== END WORKSPACE 3', html.indexOf('id="workspaceAcademicRef"')));

  // Tab 1: 표현 참조
  assert.ok(wsAr.includes('id="arViewReference"'));
  assert.ok(wsAr.includes('내 연구 문장이 실제 분야 논문의 표현 관행과 어떻게 다른지 참고합니다.'));
  assert.ok(wsAr.includes('DATA NOT CONNECTED'));
  assert.ok(wsAr.includes('id="arInputSentence"'));
  assert.ok(wsAr.includes('분석할 영문 학술 문장'));
  assert.ok(wsAr.includes('Finance / Accounting'));
  assert.ok(wsAr.includes('Reference corpus qualification pending'));
  assert.ok(wsAr.includes('Hedging · 신중한 표현'));
  assert.ok(wsAr.includes('Causal Language · 인과 표현'));
  assert.ok(wsAr.includes('Citation Proximity · 인용 근접도'));
  assert.ok(wsAr.includes('Assertion Strength · 주장 강도'));
  assert.ok(wsAr.includes('Reference corpus 연결 예정'));

  // Ensure unsupported quantitative claims were removed
  assert.equal(wsAr.includes('1,840'), false);
  assert.equal(wsAr.includes('< 0.2%'), false);
  assert.equal(/20편\s*기반|20개\s*논문/.test(wsAr), false);

  // Tab 2: 검증 결과 활용
  assert.ok(wsAr.includes('id="arViewHandoff"'));
  assert.ok(wsAr.includes('TrustVerify 검증 결과를 다른 생성형 AI가 근거를 유지하도록 사용할 수 있는 형태로 전달합니다.'));
  assert.ok(wsAr.includes('DESIGN PREVIEW'));
  assert.ok(wsAr.includes('NO SOLAR LIVE'));
  assert.ok(wsAr.includes('TrustVerify Finding'));
  assert.ok(wsAr.includes('Evidence Contract'));
  assert.ok(wsAr.includes('Grounded Prompt'));
  assert.ok(wsAr.includes('External AI / Solar'));
  assert.ok(wsAr.includes('Human Review'));
  assert.ok(wsAr.includes('검증 결과가 아직 연결되지 않았습니다.'));
  assert.ok(wsAr.includes('근거 보존 프롬프트'));
  assert.ok(wsAr.includes('### 1. SOURCE RECORD'));
  assert.ok(wsAr.includes('### 2. VERIFIED EVIDENCE'));
  assert.ok(wsAr.includes('### 3. CURRENT FINDING'));
  assert.ok(wsAr.includes('### 4. DO NOT CHANGE'));
  assert.ok(wsAr.includes('### 5. REVIEW REQUIRED'));
  assert.ok(wsAr.includes('### 6. TASK FOR GENERATION MODEL'));
  assert.ok(wsAr.includes('TrustVerify의 에이전트 역할은 판정을 생성하는 것이 아니라 근거를 찾고, 연결하고, 검증 단계를 오케스트레이션하는 것입니다.'));
  assert.ok(wsAr.includes('Canonical verdict는 결정론 규칙이 담당합니다.'));

  // Tab 3: 방법 · 비전
  assert.ok(wsAr.includes('id="arViewVision"'));
  assert.ok(wsAr.includes('AI가 생성하고, TrustVerify가 검증하고, 생성 보조 모델이 검증 결과에 묶여 수정안을 제안하며, 최종 판단은 연구자가 내립니다.'));
  assert.ok(wsAr.includes('생성하는 에이전트가 넘쳐나는 시대에, TrustVerify는 그 산출물을 실제 근거에 묶어 검증하는 에이전트입니다.'));
  assert.ok(wsAr.includes('AI GENERATE'));
  assert.ok(wsAr.includes('TRUSTVERIFY VERIFY'));
  assert.ok(wsAr.includes('GROUNDED ASSIST'));
  assert.ok(wsAr.includes('AGENT ORCHESTRATION'));
  assert.ok(wsAr.includes('CANONICAL VERDICT'));
  assert.ok(wsAr.includes('GENERATION ASSISTANT'));

  // 4. app.js routing and wiring checks
  const app = await readFile(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  assert.ok(app.includes('switchArView'));
  assert.ok(app.includes('navTabArReference'));
  assert.ok(app.includes('navTabArHandoff'));
  assert.ok(app.includes('navTabArVision'));
  assert.ok(app.includes('arViewReference'));
  assert.ok(app.includes('arViewHandoff'));
  assert.ok(app.includes('arViewVision'));
  assert.ok(app.includes('currentArView'));

  // Module switching shows topnavAcademicRef only when isAcademicRef is true
  assert.ok(app.includes('el.topnavAcademicRef.hidden = !isAcademicRef'));
});
