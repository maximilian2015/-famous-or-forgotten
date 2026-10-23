# Story generator — Comedy (prototype, branch story-audit, commit 0ee6b5a)

Not in the game yet. Players see the synopsis; the twist is hidden (never on posters, offers or reviews).

## Numbers

- 8 comedy shapes (was 3): last show, the lie, double-booked, serious person, road trip, small heist, impostor, the will.
- 1867 valid combinations; an automatic checker writes out every one (he and she) and finds 0 grammar or logic errors.
- Parts declare what they need: a coach party only arrives at a hotel, a father's ashes are only driven by his children, a DNA test only happens to a supposed heir.
- Memory: each film knows the player's last stories. 40 simulated careers of 12 comedies each: a repeated hero in 40 of 40 without memory, 4 of 40 with it; the same shape twice in a row 76 times without memory, 0 with it.

## Real comedies from the save: old premise and new story

### Paper Cousin

- **Old:** A night bus across a border, a debt somebody finally came to collect, and it is your character who started it.
- **New:** A tour guide who tells everybody she is a world traveller and has never once left town has to keep it up across Christmas in a cottage with eleven relatives and one bathroom. Then somebody starts filming everything for the family group chat, and the lie keeps getting promoted.
- **Hidden twist:** The person filming has been lying for longer.

### Wild Roommate

- **Old:** An island with one ferry a day, a diagnosis kept from the family, and the person who knows is the one being asked.
- **New:** A pensioner and the delivery driver who crashed into her garden have to get a prize-winning cake across the country before Sunday. Then the car is stolen at the first service station, with everything in it, and neither of them will admit they are lost.
- **Hidden twist:** The thief is the one person who knows the way.

### The River of Cousins

- **Old:** A hospital on the last week before it closes, a debt somebody finally came to collect, and the detective is the dead man’s brother.
- **New:** An undertaker’s child running the business for one week has one job: a Saturday that has to go perfectly. Then two families arrive for what each believes is its own reunion, and the caterer has taken a side.
- **Hidden twist:** They are the same family, split by a will nobody read to the end.

### Blue Roommate

- **Old:** A night bus across a border, a disappearance everyone agreed to forget, and it is your character who started it.
- **New:** Four siblings who have not been in one room since the divorce must run the terrible seaside hotel they have been left, together, for one summer, to inherit it. Then a coach party of forty arrives with a booking nobody remembers taking, and nobody agrees on anything, including what day it is.
- **Hidden twist:** The person who left it to them booked it, a year ago, for the week they would have to be there.

### Idiots and Idiots

- **Old:** A night bus across a border, a letter that arrives forty years late, and the two of them have not spoken in twenty years.
- **New:** A high-court judge is sentenced to coach the worst amateur football team in the north. Then the man he once sent to prison turns up in the front row, and nobody back at the office can ever find out.
- **Hidden twist:** He is not there for revenge. He is there because he changed his life, and wants to say so.

### Midnight Talker

- **Old:** A hospital on the last week before it closes, a photograph that should not exist, and the detective is the dead man’s brother.
- **New:** The host of a midnight phone-in has one night left on air, and the pier is being demolished on Monday. Then a caller rings in claiming to be his long-lost father — and everybody still in the building decides to help, live on air.
- **Hidden twist:** Three callers claim it before midnight, and one of them is telling the truth.

## One simulated career: 12 comedies in a row

1. **Accidental Attempt** — The two most law-abiding men in the parish have one weekend to rob their own branch before it is sold. Then the plan is accidentally posted on the parish noticeboard, and nobody in the gang can run, climb or whisper.
   *Twist:* Half the village has signed up to help.
2. **Splat** — Four siblings who have not been in one room since the divorce must run the terrible seaside hotel they have been left, together, for one summer, to inherit it. Then a coach party of forty arrives with a booking nobody remembers taking, and the hotel has one star and it is falling off.
   *Twist:* The person who left it to them booked it, a year ago, for the week they would have to be there.
3. **Everybody's Leaving** — A funeral director who has never laughed at work has to spend a week as the entertainer at a children’s holiday camp. Then the man whose funeral he arranged last spring turns up to watch, alive, and the rival camp cheats openly and wins everything.
   *Twist:* He faked it to get away from his family, and they are sitting three rows behind him.
4. **Deus Ex** — A junior accountant who has told his family he runs the company has to keep it up over one wedding weekend. Then the one person who knows the truth arrives a day early, and a seven-year-old has started asking reasonable questions.
   *Twist:* Everybody at the table is lying about something; his lie is just the smallest.
5. **Music Above Your Eyes** — A shy librarian is mistaken for a royal on a cruise ship with no way off. Then someone falls in love with the person he is pretending to be, and every lie needs two more to hold it up.
   *Twist:* They knew all along, and fell in love with who he really is.
6. **Tender Roommate** — A pensioner and the delivery driver who crashed into her garden are stuck in one hire car on the way to a wedding nobody wants to attend. Then they find a letter in the glovebox that was never meant for either of them, and neither of them will admit they are lost.
   *Twist:* The letter explains why the trip was arranged at all, and who arranged it.
7. **Whoops** — Two neighbours at war over a hedge have to win the village baking contest as a team, or the money goes to the cat. Then the cat turns out to have a lawyer of its own, and nobody agrees on anything, including what day it is.
   *Twist:* The cat’s lawyer is the person who wrote the will, and is not dead.
8. **Quiet Lottery** — Six pensioners from the church choir plan to steal the trophy the next village cheated them out of. Then a real gang turns up the same night with the same idea, and nobody in the gang can run, climb or whisper.
   *Twist:* The real gang are their own grandchildren, who thought of it first.
9. **Nothing Beneath Your Bed** — A high-court judge loses a bet and has to host the village talent show. Then the man he once sent to prison turns up to watch, and the local paper has sent a reporter who will not leave.
   *Twist:* He is not there for revenge. He is there because he changed his life, and wants to say so.
10. **Kismet** — An out-of-work actor is mistaken for a famous surgeon at a medical conference. Then he is asked to give the keynote speech in an hour, and every lie needs two more to hold it up.
   *Twist:* The real one is in the audience, and enjoying every minute.
11. **Perfect Machine** — A tour guide who tells everybody he is a world traveller and has never once left town has to keep it up for the four days of a school reunion. Then the lie gets a toast of its own at dinner, and a seven-year-old has started asking reasonable questions.
   *Twist:* The person proposing the toast is in on it, and wants something for keeping quiet.
12. **Ordinary Honeymoon** — A man who has never driven further than the supermarket, and his teenage daughter have to get a prize-winning cake across the country before Sunday. Then the satnav only speaks Finnish and nobody knows how to change it, and the police are now very slightly involved.
   *Twist:* The Finnish was set on purpose, years ago, by the person they are driving to see.

## Still weak

- Three shapes have only 3–4 heroes, so a very long comedy career runs out of them. More heroes per shape fixes it; no code change needed.
- Drama, Romance, Horror, Thriller, Crime and Sci-Fi still have 2–3 shapes each, and the checker flags 30–96 combinations in each of them. They are next.
