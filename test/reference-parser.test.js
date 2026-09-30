import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MAX_REFERENCE_TEXT_LENGTH, parseReference, parseReferenceList } from '../src/citation/reference-parser.js';

const demoText = await readFile(new URL('./fixtures/batch/demo-bibliography.txt', import.meta.url), 'utf8');

test('demo bibliography is exactly the five H1–H5 references, all READY', async () => {
  const evaluation = JSON.parse(await readFile(new URL('../artifacts/evaluation/kci-adversarial-h1-h5/H1-H5-results.json', import.meta.url), 'utf8'));
  const { rows, truncated } = parseReferenceList(demoText);
  assert.equal(truncated, false);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows.map(row => row.index), [1, 2, 3, 4, 5]);
  assert.ok(rows.every(row => row.parse_status === 'READY' && row.issues.length === 0));
  // Each parsed row must equal the evaluated H1–H5 input, field for field (absent fields stay absent).
  for (const [position, row] of rows.entries()) {
    const parsed = Object.fromEntries(Object.entries({
      title: row.title, authors: row.authors, publication_year: row.publication_year, doi: row.doi,
    }).filter(([, value]) => value !== null));
    assert.deepEqual(parsed, evaluation.items[position].input, `H${position + 1}`);
  }
});

test('text without a recoverable title is UNPARSED, never a KCI status', () => {
  const row = parseReference('just some words', 3);
  assert.equal(row.parse_status, 'UNPARSED');
  assert.equal(row.title, null);
  assert.deepEqual(row.issues, ['TITLE_NOT_FOUND']);
  assert.equal(Object.hasOwn(row, 'status'), false);
});

test('APA author initials are not guessed into names', () => {
  const row = parseReference('Zhang, M., & Shin, S. S. (2024). Some Title Here. Journal, 1(2).');
  assert.equal(row.parse_status, 'NEEDS_REVIEW');
  assert.equal(row.authors, null);
  assert.deepEqual(row.issues, ['AUTHORS_AMBIGUOUS']);
  assert.equal(row.title, 'Some Title Here');
});

test('quoted Korean title with trailing year parses as READY', () => {
  const row = parseReference('최승재, “구조화 금융과 서브프라임 금융위기의 전개에 대한 연구”, 상장협연구, 제58호(2008).');
  assert.equal(row.parse_status, 'READY');
  assert.equal(row.title, '구조화 금융과 서브프라임 금융위기의 전개에 대한 연구');
  assert.deepEqual(row.authors, ['최승재']);
  assert.equal(row.publication_year, '2008');
});

test('unrecognized layouts and ambiguous years are flagged NEEDS_REVIEW', () => {
  const row = parseReference('Kim J. A study of things. Journal of Stuff. 2019;12:1-9. 2020 reprint');
  assert.equal(row.parse_status, 'NEEDS_REVIEW');
  assert.equal(row.publication_year, null);
  assert.deepEqual(row.issues, ['YEAR_AMBIGUOUS', 'TITLE_HEURISTIC']);
});

test('numbered entries spanning several lines are grouped; unnumbered lists split per line', () => {
  const numbered = parseReferenceList('[1] 장만, 신승수 (2024). Computer Vision-based\nBasketball Player Training System. 저널.\n[2] 대운해 (2024). Another Title. 저널.');
  assert.equal(numbered.rows.length, 2);
  assert.equal(numbered.rows[0].title, 'Computer Vision-based Basketball Player Training System');
  const plain = parseReferenceList('홍길동 (2020). First Title. 저널.\n\n김철수 (2021). Second Title. 저널.');
  assert.deepEqual(plain.rows.map(row => row.title), ['First Title', 'Second Title']);
});

test('parser rejects non-string and oversized input', () => {
  assert.throws(() => parseReferenceList(null), TypeError);
  assert.throws(() => parseReferenceList('x'.repeat(MAX_REFERENCE_TEXT_LENGTH + 1)), TypeError);
});
