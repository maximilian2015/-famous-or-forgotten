// Names for the people who are not you. The crew pool in production.js is ten first names
// by eight surnames, which is why a co-star called Mira Ferro turned up opposite a player
// called Mira Vale. This one is wide enough that a forty-year roster of rivals, a dozen
// critics and every co-star you ever meet do not collide with each other or with you.
import { pick } from '../../engine/rng.js';

export const FIRST_F = ['Mara', 'Juno', 'Lena', 'Thea', 'Ada', 'Wren', 'Petra', 'Marisol', 'Ines', 'Sunny',
  'Greta', 'Noor', 'Lottie', 'Zora', 'Dagny', 'Rosalind', 'Ilse', 'Camille', 'Beatriz', 'Yuki',
  'Freya', 'Delphine', 'Halle', 'Imogen', 'Saoirse', 'Vera', 'Odette', 'Priya', 'Simone', 'Tamsin',
  'Anouk', 'Bettina', 'Celeste', 'Dorothea', 'Esme', 'Fenna', 'Giulia', 'Hanne', 'Iris', 'Jocasta'];
export const FIRST_M = ['Idris', 'Kaspar', 'Osric', 'Bo', 'Nils', 'Rafa', 'Cato', 'Emeric', 'Hal', 'Joaquin',
  'Silas', 'Tobias', 'Anselm', 'Bruno', 'Cyrus', 'Dario', 'Elias', 'Florian', 'Gideon', 'Hugo',
  'Ivo', 'Jules', 'Kwame', 'Laszlo', 'Milo', 'Nikolai', 'Otis', 'Piet', 'Quentin', 'Ruben',
  'Soren', 'Tarquin', 'Ulrich', 'Viggo', 'Wendell', 'Xavier', 'Yusuf', 'Zeke', 'Aurelio', 'Benedikt'];
export const LAST = ['Vance', 'Okonjo', 'Brandt', 'Lindqvist', 'Moreau', 'Sato', 'Delacroix', 'Byrne', 'Halloran',
  'Ferreira', 'Novak', 'Castellan', 'Ashworth', 'Rune', 'Duval', 'Kessler', 'Marchetti', 'Ngata', 'Oyelaran',
  'Petrov', 'Quintero', 'Rasmussen', 'Salazar', 'Takahashi', 'Ulloa', 'Voss', 'Whitlock', 'Yilmaz', 'Zimmer',
  'Abernathy', 'Beaumont', 'Corvin', 'Dressler', 'Eckhardt', 'Falk', 'Gallo', 'Hartigan', 'Iversen', 'Jaeger',
  'Kowalczyk', 'Lombardi', 'Mbeki', 'Nakamura', 'Orlov', 'Pemberton', 'Radovan', 'Sorensen', 'Thackeray', 'Varga'];

// Somebody nobody else in this life is called. `taken` is a Set of full names already in use.
export function personName(gender, taken) {
  const first = gender === 'female' ? FIRST_F : FIRST_M;
  for (let i = 0; i < 80; i++) {
    const name = `${pick(first)} ${pick(LAST)}`;
    if (!taken || !taken.has(name)) { if (taken) taken.add(name); return name; }
  }
  return `${pick(first)} ${pick(LAST)}-${pick(LAST)}`;
}

// Everybody whose name is already in a life: family, contacts, the crew you are on set
// with, the roster, the critics. Drawn fresh each time, because it is cheap and it means a
// new name can never shadow an old one.
export function namesInUse(s) {
  const t = new Set([s.name]);
  for (const p of s.family || []) t.add(p.name);
  for (const p of s.people || []) t.add(p.name);
  for (const p of (s.productions && s.productions.length ? s.productions : (s.production ? [s.production] : []))) for (const c of p.crew || []) t.add(c.name);
  for (const a of (s.world && s.world.actors) || []) t.add(a.name);
  for (const c of (s.world && s.world.critics) || []) t.add(c.name);
  return t;
}

export const OUTLETS = ['Southern Night', 'Funtimes', 'Exquisite Cinématique', 'Thrilling Crimes', 'The Ledger', 'Reel Talk',
  'The Harbour Review', 'Matinée', 'Kinomark', 'Late Edition', 'The Stalls', 'Picturehouse Weekly', 'The Gazette', 'Frame by Frame'];

// The people who pay. A studio on the letterhead and the stamp, drawn once per offer.
export const STUDIOS = ['Lumen Pictures', 'Vega Pictures', 'Nord Media', 'Lyra Studios', 'Aurora Films', 'Harbourlight', 'Meridian Pictures', 'Old Bank Films',
  'Pier House Productions', 'Halcyon Studios', 'Tallwater Pictures', 'Kestrel & Sons', 'Northlight', 'Corvin Bros.', 'Saltmarsh Films', 'The Ninth Floor'];
