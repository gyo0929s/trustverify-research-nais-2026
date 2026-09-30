/**
 * Expression-level marker lexicons for Claim–Evidence Alignment P0.
 * Each dimension classifies a text span into one level using explicit, inspectable patterns.
 * Korean patterns are matched as substrings; English patterns on word boundaries.
 */
const EN = source => new RegExp(`\\b(?:${source})\\b`, 'giu');
const KO = source => new RegExp(`(?:${source})`, 'gu');

export const DIMENSIONS = Object.freeze({
  causality: Object.freeze({
    // Checked in order: an explicit causal limitation outranks causal words it contains.
    levels: [
      ['LIMITED', [
        EN("(?:cannot|can not|does not|do not|did not|not) (?:conclude|establish|imply|prove|infer|show|demonstrate)\\w* (?:a |any )?caus\\w*|not causal\\w*|correlation (?:does not|is not) causation"),
        KO('인과관계를 (?:입증|증명|확인)하는 것은 아니|인과관계로 (?:볼|해석할) 수 없'),
      ]],
      ['CAUSAL', [
        EN('causes?|caused|causing|causal(?:ly)?|leads? to|led to|results? in|resulted in|induces?|induced|drives?|driven by|triggers?|triggered|because of|due to'),
        KO('유발|초래|야기|원인이 된'),
      ]],
      ['ASSOCIATION', [
        EN('associat\\w*|correlat\\w*|relationships?|related|linked|relations?'),
        KO('관련|연관|상관'),
      ]],
    ],
    fallback: 'NONE',
  }),
  modality: Object.freeze({
    levels: [
      ['NECESSITY', [EN('must|always|necessarily|invariably|inevitabl\\w*'), KO('반드시|항상|필연')]],
      ['POSSIBILITY', [EN('can|could|may|might'), KO('수 있')]],
    ],
    fallback: 'NONE',
  }),
  certainty: Object.freeze({
    levels: [
      ['STRONG', [EN('prove[sdn]?|proving|demonstrat\\w*|confirm\\w*|definitely|clearly|certainly|undoubtedly|conclusively'), KO('입증|증명|확실|분명히')]],
      ['HEDGE', [EN('suggest\\w*|likely|possibl\\w*|appears?|appeared|seems?|seemed|potentially|tentativ\\w*'), KO('시사|가능성|추정')]],
    ],
    fallback: 'UNMARKED',
  }),
  negation: Object.freeze({
    levels: [['NEGATED', [EN("not|no|never|neither|nor|none|without|cannot|\\w+n't"), KO('않|없|아니|못')]]],
    fallback: 'AFFIRMED',
  }),
  direction: Object.freeze({
    // Direction is multi-valued: a span may mention both; see directionOf.
    levels: [
      ['UP', [EN('increas\\w*|elevat\\w*|higher|improv\\w*|greater|rais\\w*|enhanc\\w*|rise|rises|rising|grow\\w*'), KO('증가|향상|상승|높아')]],
      ['DOWN', [EN('decreas\\w*|reduc\\w*|lower\\w*|declin\\w*|smaller|less|diminish\\w*|drops?|dropped|falls?|fell'), KO('감소|하락|저하|낮아')]],
    ],
    fallback: 'NONE',
  }),
});

function matchesOf(patterns, text) {
  return patterns.flatMap(pattern => [...text.matchAll(pattern)].map(match => match[0]));
}

/** Returns { level, markers } for a single-valued dimension. */
export function levelOf(dimension, text) {
  const spec = DIMENSIONS[dimension];
  for (const [level, patterns] of spec.levels) {
    const markers = matchesOf(patterns, text);
    if (markers.length) return { level, markers };
  }
  return { level: spec.fallback, markers: [] };
}

/** Direction can hold several values; returns the sorted set of directions with markers. */
export function directionOf(text) {
  const found = { levels: [], markers: [] };
  for (const [level, patterns] of DIMENSIONS.direction.levels) {
    const markers = matchesOf(patterns, text);
    if (markers.length) { found.levels.push(level); found.markers.push(...markers); }
  }
  return found;
}

/** Every marker word in a text, used to keep markers out of grounding anchors. */
export function markerWords(text) {
  const words = new Set();
  for (const spec of Object.values(DIMENSIONS)) {
    for (const [, patterns] of spec.levels) {
      for (const marker of matchesOf(patterns, text)) {
        for (const word of marker.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) words.add(word);
      }
    }
  }
  return words;
}
