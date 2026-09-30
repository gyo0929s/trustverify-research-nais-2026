import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('UI Regression: All 5 workspaces are independent top-level modules in presentation container', async () => {
  const html = await readFile(new URL('../src/ui/index.html', import.meta.url), 'utf8');

  // Verify all 5 workspaces exist
  const workspaceIds = [
    'workspaceCitation',
    'workspaceClaimEvidence',
    'workspaceAgentP0',
    'workspaceTranslation',
    'workspaceAcademicRef',
  ];

  for (const id of workspaceIds) {
    assert.ok(html.includes(`id="${id}"`), `Workspace #${id} must exist in index.html`);
  }

  // Verify direct child / nesting integrity: none of the workspaces may be nested inside another
  const mainStart = html.indexOf('<main class="presentation-container">');
  const mainEnd = html.indexOf('</main>');
  assert.ok(mainStart > -1 && mainEnd > mainStart, 'main.presentation-container must exist');

  const mainSlice = html.slice(mainStart, mainEnd + '</main>'.length);

  // Parse HTML tag stack to ensure no unclosed tags trap subsequent workspaces
  const stack = [];
  const tagRegex = /<\/?([a-zA-Z0-9]+)(\s[^>]*)?>/g;
  let match;
  let mismatches = 0;

  while ((match = tagRegex.exec(mainSlice)) !== null) {
    const full = match[0];
    const tagName = match[1].toLowerCase();
    if (['input', 'img', 'br', 'hr', 'meta', 'link'].includes(tagName)) continue;
    if (full.endsWith('/>')) continue;

    if (full.startsWith('</')) {
      if (stack.length === 0) {
        mismatches++;
      } else {
        const top = stack.pop();
        if (top.tagName !== tagName) {
          mismatches++;
        }
      }
    } else {
      stack.push({ tagName, full });
    }
  }

  assert.equal(mismatches, 0, 'No HTML tag mismatches allowed inside presentation container');
  assert.equal(stack.length, 0, 'No unclosed tags allowed inside presentation container (cannot trap sibling workspaces)');
});

test('UI Regression: switchWorkspaceModule toggles workspaces, topnavs, and rail active states accurately', async () => {
  const app = await readFile(new URL('../src/ui/app.js', import.meta.url), 'utf8');

  // Extract switchWorkspaceModule source
  assert.ok(app.includes('function switchWorkspaceModule('), 'switchWorkspaceModule must exist');

  // Mock DOM elements and state for switchWorkspaceModule
  const mockEl = {
    railBtnCitation: { classList: new Set(), toggle(c, v) { v ? this.add(c) : this.delete(c); } },
    railBtnClaimEvidence: { classList: new Set(), toggle(c, v) { v ? this.add(c) : this.delete(c); } },
    railBtnAgent: { classList: new Set(), toggle(c, v) { v ? this.add(c) : this.delete(c); } },
    railBtnTranslation: { classList: new Set(), toggle(c, v) { v ? this.add(c) : this.delete(c); } },
    railBtnAcademicRef: { classList: new Set(), toggle(c, v) { v ? this.add(c) : this.delete(c); } },

    workspaceCitation: { hidden: false },
    workspaceClaimEvidence: { hidden: true },
    workspaceAgentP0: { hidden: true },
    workspaceTranslation: { hidden: true },
    workspaceAcademicRef: { hidden: true },

    topnavCitation: { hidden: false },
    topnavClaimEvidence: { hidden: true },
    topnavAgent: { hidden: true },
    topnavAcademicRef: { hidden: true },
    topnavExpansion: { hidden: true },
    topnavModuleName: { textContent: '' },
  };

  for (const btn of Object.values(mockEl)) {
    if (btn.classList) {
      btn.classList.toggle = (c, v) => (v ? btn.classList.add(c) : btn.classList.delete(c));
    }
  }

  // Create isolated function runner for switchWorkspaceModule
  const fnSource = app.slice(
    app.indexOf('function switchWorkspaceModule('),
    app.indexOf('\n}\n', app.indexOf('function switchWorkspaceModule(')) + 2
  );

  const runner = new Function(
    'state',
    'el',
    'window',
    'switchCitationView',
    'switchCeView',
    'switchAgentView',
    'switchArView',
    `${fnSource}
    return switchWorkspaceModule;`
  );

  const state = { currentModule: 'citation' };
  const mockWindow = { scrollTo() {} };
  const noop = () => {};

  const switchWorkspaceModule = runner(
    state,
    mockEl,
    mockWindow,
    noop,
    noop,
    noop,
    noop
  );

  // Test 1: Switch to TrustVerify Agent
  switchWorkspaceModule('agent-p0', 'contract');
  assert.equal(mockEl.workspaceAgentP0.hidden, false, 'workspaceAgentP0 must be visible');
  assert.equal(mockEl.workspaceCitation.hidden, true, 'workspaceCitation must be hidden');
  assert.equal(mockEl.workspaceClaimEvidence.hidden, true, 'workspaceClaimEvidence must be hidden');
  assert.equal(mockEl.workspaceTranslation.hidden, true, 'workspaceTranslation must be hidden');
  assert.equal(mockEl.workspaceAcademicRef.hidden, true, 'workspaceAcademicRef must be hidden');
  assert.equal(mockEl.topnavAgent.hidden, false, 'topnavAgent must be visible');

  // Test 2: Switch to Translation Fidelity
  switchWorkspaceModule('translation');
  assert.equal(mockEl.workspaceTranslation.hidden, false, 'workspaceTranslation must be visible');
  assert.equal(mockEl.workspaceAgentP0.hidden, true, 'workspaceAgentP0 must be hidden');
  assert.equal(mockEl.workspaceCitation.hidden, true, 'workspaceCitation must be hidden');
  assert.equal(mockEl.topnavExpansion.hidden, false, 'topnavExpansion must be visible');

  // Test 3: Switch to Academic Expression
  switchWorkspaceModule('academic-reference', 'reference');
  assert.equal(mockEl.workspaceAcademicRef.hidden, false, 'workspaceAcademicRef must be visible');
  assert.equal(mockEl.workspaceTranslation.hidden, true, 'workspaceTranslation must be hidden');
  assert.equal(mockEl.topnavAcademicRef.hidden, false, 'topnavAcademicRef must be visible');

  // Test 4: Switch back to Citation Integrity
  switchWorkspaceModule('citation', 'batch');
  assert.equal(mockEl.workspaceCitation.hidden, false, 'workspaceCitation must be visible');
  assert.equal(mockEl.workspaceAcademicRef.hidden, true, 'workspaceAcademicRef must be hidden');
  assert.equal(mockEl.topnavCitation.hidden, false, 'topnavCitation must be visible');

  // Test 5: Switch to Claim–Evidence
  switchWorkspaceModule('claim-evidence', 'verify');
  assert.equal(mockEl.workspaceClaimEvidence.hidden, false, 'workspaceClaimEvidence must be visible');
  assert.equal(mockEl.workspaceCitation.hidden, true, 'workspaceCitation must be hidden');
  assert.equal(mockEl.topnavClaimEvidence.hidden, false, 'topnavClaimEvidence must be visible');
});

test('UI Regression: Hash routing routes correctly and fallback prevents blank screens', async () => {
  const app = await readFile(new URL('../src/ui/app.js', import.meta.url), 'utf8');

  // Verify hash routing handles all module prefixes
  assert.ok(app.includes("hash.startsWith('agent')"), 'agent hash routes supported');
  assert.ok(app.includes("hash === 'translation'"), 'translation hash routes supported');
  assert.ok(app.includes("hash.startsWith('academic-reference')"), 'academic-reference hash routes supported');
  assert.ok(app.includes("hash === 'ce-verify'"), 'ce-verify hash routes supported');
  assert.ok(app.includes("hash === 'batch'"), 'batch hash routes supported');

  // Verify fallback exists for unexpected hashes
  const hashRoutingBlock = app.slice(
    app.indexOf('function handleHashRouting('),
    app.indexOf('\n}\n', app.indexOf('function handleHashRouting(')) + 2
  );
  assert.ok(
    hashRoutingBlock.includes("switchWorkspaceModule('citation', 'batch')"),
    'Fallback to citation batch must exist so unknown hashes never render blank page'
  );
});
