import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('TrustVerify Agent P0 workspace UI shell integrity', async () => {
  const html = await readFile(new URL('../src/ui/index.html', import.meta.url), 'utf8');

  // 1. Left rail configuration: distinct item between Claim–Evidence and Translation
  assert.ok(html.includes('id="railBtnAgent"'), 'railBtnAgent must exist');
  const ceIndex = html.indexOf('id="railBtnClaimEvidence"');
  const agentIndex = html.indexOf('id="railBtnAgent"');
  const tfIndex = html.indexOf('id="railBtnTranslation"');
  const arIndex = html.indexOf('id="railBtnAcademicRef"');

  assert.ok(ceIndex < agentIndex, 'Agent P0 must be placed after Claim–Evidence');
  assert.ok(agentIndex < tfIndex, 'Agent P0 must be placed before Translation Fidelity');
  assert.ok(tfIndex < arIndex, 'Academic Expression must be preserved as its own module');

  const railAgentBlock = html.slice(agentIndex, html.indexOf('</button>', agentIndex));
  assert.ok(railAgentBlock.includes('◆'), 'Agent P0 icon must be ◆');
  assert.ok(railAgentBlock.includes('TrustVerify Agent'), 'Agent title must be TrustVerify Agent');
  assert.ok(railAgentBlock.includes('검증 결과 → 근거 계약 → PromptPackage'), 'Agent subtitle must match specification');
  assert.ok(railAgentBlock.includes('badge-agent-p0'), 'Badge class badge-agent-p0 must be present');
  assert.ok(railAgentBlock.includes('AGENT P0'), 'Badge text AGENT P0 must be present');

  // 2. Module-aware top navigation for TrustVerify Agent P0
  assert.ok(html.includes('id="topnavAgent"'), 'topnavAgent must exist');
  const topnavAgent = html.slice(html.indexOf('id="topnavAgent"'), html.indexOf('</nav>', html.indexOf('id="topnavAgent"')));
  assert.ok(topnavAgent.includes('id="navTabAgentContract"'), 'navTabAgentContract must exist');
  assert.ok(topnavAgent.includes('Evidence Contract'), 'Evidence Contract tab text must exist');
  assert.ok(topnavAgent.includes('id="navTabAgentPrompt"'), 'navTabAgentPrompt must exist');
  assert.ok(topnavAgent.includes('PromptPackage'), 'PromptPackage tab text must exist');
  assert.ok(topnavAgent.includes('id="navTabAgentReverify"'), 'navTabAgentReverify must exist');
  assert.ok(topnavAgent.includes('Reverify 구조'), 'Reverify tab text must exist');

  // 3. Workspace structure and core messaging
  assert.ok(html.includes('id="workspaceAgentP0"'), 'workspaceAgentP0 must exist');
  const wsAgent = html.slice(html.indexOf('id="workspaceAgentP0"'), html.indexOf('<!-- ============================== END WORKSPACE AGENT P0', html.indexOf('id="workspaceAgentP0"')));

  // Header & Core Statement
  assert.ok(wsAgent.includes('TrustVerify Agent P0'), 'Header title must be TrustVerify Agent P0');
  assert.ok(wsAgent.includes('검증 결과를 근거 보존형 AI 입력으로 변환'), 'Header subtitle must match specification');
  assert.ok(wsAgent.includes('검증 에이전트는 진실을 생성하지 않습니다. 검증된 근거와 제한 조건을 다음 생성 단계에 전달합니다.'), 'Core statement must match specification exactly');

  // 7-step flow
  assert.ok(wsAgent.includes('Finding'), 'Step 1 Finding must exist');
  assert.ok(wsAgent.includes('Evidence Contract'), 'Step 2 Evidence Contract must exist');
  assert.ok(wsAgent.includes('Deterministic PromptPackage'), 'Step 3 Deterministic PromptPackage must exist');
  assert.ok(wsAgent.includes('Solar / External AI'), 'Step 4 Solar / External AI must exist');
  assert.ok(wsAgent.includes('Proposed Revision'), 'Step 5 Proposed Revision must exist');
  assert.ok(wsAgent.includes('TrustVerify Reverify'), 'Step 6 TrustVerify Reverify must exist');
  assert.ok(wsAgent.includes('Human Review'), 'Step 7 Human Review must exist');

  // Crucial Reverify Emphasis
  assert.ok(wsAgent.includes('생성 모델의 수정안도 다시 TrustVerify 검증 루프를 통과합니다.'), 'Reverify invariant must be emphasized');

  // Explicit Current vs Future Boundary
  assert.ok(wsAgent.includes('CURRENT IMPLEMENTATION'), 'CURRENT IMPLEMENTATION section must exist');
  assert.ok(wsAgent.includes('FUTURE EXPANSION'), 'FUTURE EXPANSION section must exist');

  // Panels for tabs
  assert.ok(wsAgent.includes('id="agentViewContract"'), 'agentViewContract panel must exist');
  assert.ok(wsAgent.includes('id="agentViewPrompt"'), 'agentViewPrompt panel must exist');
  assert.ok(wsAgent.includes('id="agentViewReverify"'), 'agentViewReverify panel must exist');

  // 4. app.js routing and wiring checks
  const app = await readFile(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  assert.ok(app.includes('switchAgentView'), 'switchAgentView function must exist');
  assert.ok(app.includes('currentAgentView'), 'state.currentAgentView must exist');
  assert.ok(app.includes('railBtnAgent'), 'railBtnAgent DOM ref must exist');
  assert.ok(app.includes('workspaceAgentP0'), 'workspaceAgentP0 DOM ref must exist');
  assert.ok(app.includes('topnavAgent'), 'topnavAgent DOM ref must exist');
  assert.ok(app.includes('navTabAgentContract'), 'navTabAgentContract DOM ref must exist');
  assert.ok(app.includes('navTabAgentPrompt'), 'navTabAgentPrompt DOM ref must exist');
  assert.ok(app.includes('navTabAgentReverify'), 'navTabAgentReverify DOM ref must exist');
  assert.ok(app.includes('agentViewContract'), 'agentViewContract DOM ref must exist');
  assert.ok(app.includes('agentViewPrompt'), 'agentViewPrompt DOM ref must exist');
  assert.ok(app.includes('agentViewReverify'), 'agentViewReverify DOM ref must exist');

  // Hash routing supports agent
  assert.ok(app.includes("hash.startsWith('agent')"), 'hash routing must handle agent routes');
});
