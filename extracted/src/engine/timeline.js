const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export function addTimeline(s, text, bad = false) {
  s.timeline = s.timeline || [];
  s.timeline.unshift({ text, when: `${MON[s.month]} ${s.year}`, bad });
  if (s.timeline.length > 200) s.timeline.length = 200;
}
