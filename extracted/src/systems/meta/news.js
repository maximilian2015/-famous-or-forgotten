// Both of these used to live here, and hotGenre was a calendar: it walked the genre list one
// per month, forever, so a player could count the months and know which date to open on. It is
// a real market now - see meta/market.js - and every screen that already asked this question
// gets the new answer without changing a line, because the signature is the same.
//
// The old press reply (respondToPress, its own pressUnread and its own hasHit) lived here too,
// read by nothing: the News app reads meta/press.js, and hasHit is career/access.js.
export { GENRES, hotGenre } from './market.js';
