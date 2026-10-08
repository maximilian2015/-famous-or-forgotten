// The extras agreed in the television room must survive the same boundaries as
// the fee. The audit found all of them stopped at the offer: 300/300 shares and
// producing credits, and 178/178 promised directing episodes. This preserves the
// agreement; it does not invent a TV revenue model or pay a fee for the title.
const TV_TERMS = ['tvPoints', 'producing', 'directOne', 'guaranteed', 'billing'];
export function tvTermsOf(source) {
  const terms = {};
  for (const key of TV_TERMS) if (source && source[key] !== undefined) terms[key] = source[key];
  return terms;
}
