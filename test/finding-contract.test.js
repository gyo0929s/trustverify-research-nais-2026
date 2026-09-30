import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const fixtureNames = [
  'verified.json',
  'metadata-drift.json',
  'chimera-review.json',
  'not-found.json',
  'system-failure.json',
];
const fixtures = Object.fromEntries(await Promise.all(fixtureNames.map(async name => [
  name,
  JSON.parse(await readFile(new URL(`./fixtures/findings/${name}`, import.meta.url), 'utf8')),
])));
const findingStatuses = new Set(['VERIFIED', 'METADATA_DRIFT', 'CHIMERA', 'REVIEW_REQUIRED', 'NOT_FOUND_IN_KCI']);
const systemStates = new Set(['KCI_UNAVAILABLE', 'KCI_AUTH_FAILED', 'KCI_INVALID_RESPONSE', 'KCI_PARSE_FAILED']);

function requireKeys(value, keys) {
  for (const key of keys) assert.ok(Object.hasOwn(value, key), `missing ${key}`);
}

test('research finding fixtures use the versioned finding contract', () => {
  for (const name of fixtureNames.slice(0, -1)) {
    const fixture = fixtures[name];
    requireKeys(fixture, ['finding_id', 'track', 'status', 'rule_id', 'rule_version', 'input', 'evidence', 'field_comparisons', 'reason', 'limitations', 'human_review_required']);
    assert.equal(fixture.contract_version, 'trustverify-citation-finding-v1');
    assert.equal(fixture.kind, 'RESEARCH_FINDING');
    assert.equal(fixture.track, 'CITATION_INTEGRITY');
    assert.ok(findingStatuses.has(fixture.status));
    assert.equal(Object.hasOwn(fixture, 'system_state'), false);
    assert.ok(Array.isArray(fixture.evidence));
    assert.ok(Array.isArray(fixture.field_comparisons));
    assert.ok(Array.isArray(fixture.limitations));
    assert.equal(typeof fixture.human_review_required, 'boolean');
    assert.equal(fixture.fixture, true);
  }
});

test('fixture set exercises the requested research statuses', () => {
  assert.deepEqual(
    fixtureNames.slice(0, -1).map(name => fixtures[name].status),
    ['VERIFIED', 'METADATA_DRIFT', 'CHIMERA', 'NOT_FOUND_IN_KCI'],
  );
});

test('system failure is structurally separate from research findings', () => {
  const failure = fixtures['system-failure.json'];
  requireKeys(failure, ['failure_id', 'track', 'system_state', 'operation', 'messages', 'reason', 'retry_recommended', 'research_finding_emitted']);
  assert.equal(failure.contract_version, 'trustverify-system-failure-v1');
  assert.equal(failure.kind, 'SYSTEM_FAILURE');
  assert.ok(systemStates.has(failure.system_state));
  assert.equal(Object.hasOwn(failure, 'status'), false);
  assert.equal(Object.hasOwn(failure, 'finding_id'), false);
  assert.equal(failure.research_finding_emitted, false);
});

test('schemas use disjoint discriminators and system schema defines no citation status', async () => {
  const findingSchema = JSON.parse(await readFile(new URL('../schemas/citation-finding.schema.json', import.meta.url), 'utf8'));
  const failureSchema = JSON.parse(await readFile(new URL('../schemas/system-failure.schema.json', import.meta.url), 'utf8'));
  assert.equal(findingSchema.properties.kind.const, 'RESEARCH_FINDING');
  assert.equal(failureSchema.properties.kind.const, 'SYSTEM_FAILURE');
  assert.equal(Object.hasOwn(failureSchema.properties, 'status'), false);
  assert.deepEqual(findingSchema.properties.status.enum, [...findingStatuses]);
  assert.deepEqual(failureSchema.properties.system_state.enum, [...systemStates]);
});
