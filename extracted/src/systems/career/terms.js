// The extras agreed in the television room must survive the same boundaries as
// the fee. The audit found all of them stopped at the offer: 300/300 shares and
// producing credits, and 178/178 promised directing episodes. This preserves the
// agreement; it does not invent a TV revenue model or pay a fee for the title.
const TV_TERMS = ['tvPoints', 'producing', 'directOne', 'guaranteed', 'billing'];
export function tvTermsOf(source, keys = TV_TERMS) {
  const terms = {};
  for (const key of keys) if (source && source[key] !== undefined) terms[key] = source[key];
  return terms;
}
// Inside one season every term survives every boundary (tvTermsOf). Into the NEXT season's offer
// only what a show keeps paying or crediting goes: a share of it and the producing credit. A
// guarantee, first billing and an episode to direct are agreed for one season and argued for
// again; carrying them across gave the next season terms nobody had negotiated.
const CARRIED = ['tvPoints', 'producing'];
export function carriedToNextSeason(source) { return tvTermsOf(source, CARRIED); }
