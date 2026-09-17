const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export function addTimeline(s, text, bad = false) {
  s.timeline = s.timeline || [];
  s.timeline.unshift({ text, when: `${MON[s.month]} ${s.year}`, bad });
  if (s.timeline.length > 200) s.timeline.length = 200;
}

// A big moment on screen. If one is already up, this one waits in the queue — two things
// in one month (a show going out and a casting ringing back) used to leave only the second.
export function showMoment(s, m) {
  if (s.bigMoment) (s.moments = s.moments || []).push(m);
  else s.bigMoment = m;
  return s;
}
