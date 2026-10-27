// node tools/story-proto/page.mjs <stories.json> <out.html>
// The story audit as a page: the findings, the proposed model, and the twenty films with the
// premise each has today beside the story the prototype tells. Built from run.mjs output.
import fs from 'node:fs';
const [,, src, out] = process.argv;
const { rows, seq } = JSON.parse(fs.readFileSync(src, 'utf8'));
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const TIER = { lead: 'главная роль', tentpole: 'главная роль, блокбастер', supporting: 'второй план' };
const card = (r) => `<article class="film">
  <header><h3>${esc(r.title)}</h3><p class="meta">${esc(r.genre)} · ${esc(r.scale)} · ${TIER[r.tier] || esc(r.tier)} · ${esc(r.year)}</p></header>
  <div class="old"><span class="lab">Сейчас</span>${esc(r.old)}</div>
  <div class="page">
    <p class="log">${esc(r.story.logline)}</p>
    <p class="syn">${esc(r.story.synopsis)}</p>
    <details><summary>Поворот: скрыт от игрока</summary><p>${esc(r.story.twist)}</p></details>
  </div>
  <p class="foot"><b>Твоя роль:</b> ${esc(r.story.part)}${r.story.matched.length ? ` · <b>из названия:</b> ${esc(r.story.matched.join(', '))}` : ' · <b>в названии ничего не нашлось</b>, сюжет по жанру'} · <b>постеру:</b> ${esc(r.story.motif || '—')}, ${esc(r.story.place || '—')}</p>
</article>`;
const seqCard = (q) => `<article class="film seq">
  <header><h3>${esc(q.first)} → ${esc(q.second)}</h3></header>
  <div class="old"><span class="lab">Сейчас, часть 1</span>${esc(q.oldFirst)}</div>
  <div class="old"><span class="lab">Сейчас, часть 2</span>${esc(q.oldSecond)}</div>
  <div class="page"><p class="syn"><b>Часть 1.</b> ${esc(q.story1.synopsis)}</p><details><summary>Поворот части 1</summary><p>${esc(q.story1.twist)}</p></details></div>
  <div class="page"><p class="syn"><b>Часть 2.</b> ${esc(q.story2.synopsis)}</p><details><summary>Поворот части 2</summary><p>${esc(q.story2.twist)}</p></details></div>
</article>`;
const html = `<title>Генератор сюжетов: аудит</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Inter:wght@400;600;700;800&family=Playfair+Display:wght@700&display=swap">
<style>
/* The game's own look: a dark room, and every story on a page of a script. Deliberately one theme. */
:root { color-scheme: dark; --bg: #0b0a11; --panel: #17141f; --line: rgba(232,176,75,.18); --brass: #e8b04b; --text: #f4efe4; --muted: #968c7d;
  --paper: #fff7e7; --ink: #302d26; --pmuted: #6f6453; --accent: #8b432f; --bad: #e5566f; --good: #6fc98d;
  --f-d: 'Playfair Display', Georgia, serif; --f-b: 'Inter', system-ui, sans-serif; --f-t: 'Courier Prime', 'Courier New', monospace; }
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--text); font: 15px/1.55 var(--f-b); }
.wrap { max-width: 1060px; margin: 0 auto; padding-block: 28px 70px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
h1, h2, h3 { font-family: var(--f-d); margin: 0; text-wrap: balance; }
h1 { font-size: clamp(28px, 5vw, 42px); line-height: 1.1; } h2 { font-size: 24px; margin: 44px 0 12px; } h3 { font-size: 18px; }
p { margin: 0 0 10px; max-width: 70ch; }
.kick { font: 700 11px/1 var(--f-t); letter-spacing: .16em; text-transform: uppercase; color: var(--brass); margin-bottom: 10px; }
.lede { font-size: 17px; margin-top: 12px; }
.muted { color: var(--muted); }
code { font-family: var(--f-t); color: #f2c265; background: rgba(232,176,75,.08); padding: 1px 5px; border-radius: 4px; font-size: .92em; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px; }
.box { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; min-width: 0; }
.box h3 { font: 800 14px var(--f-b); margin-bottom: 6px; color: var(--brass); }
.box p, .box li { font-size: 14px; color: #ddd4c4; }
.box ul { margin: 6px 0 0; padding-left: 18px; }
.num { font: 700 26px var(--f-d); color: var(--text); }
.films { display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); gap: 14px; }
.film { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 14px; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.film .meta { font-size: 12px; color: var(--muted); margin: 2px 0 0; }
.old { font-size: 12.5px; color: var(--muted); border-left: 2px solid var(--bad); padding: 2px 0 2px 10px; }
.lab { display: block; font: 700 10px var(--f-b); letter-spacing: .12em; text-transform: uppercase; color: var(--bad); margin-bottom: 2px; }
.page { background: var(--paper); color: var(--ink); border-radius: 8px; padding: 12px 13px; font-family: var(--f-t); }
.page .log { font-weight: 700; font-size: 14px; line-height: 1.45; margin-bottom: 8px; }
.page .syn { font-size: 13px; line-height: 1.5; margin: 0 0 8px; }
.page details { border-top: 1px dashed #e2d4b5; padding-top: 6px; font-size: 12.5px; }
.page summary { cursor: pointer; color: var(--accent); font-weight: 700; }
.page summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.page details p { margin: 6px 0 0; }
.foot { font-size: 12px; color: var(--muted); margin: 0; }
.foot b { color: #cdbfa3; font-weight: 600; }
ol { max-width: 72ch; padding-left: 20px; } ol li { margin-bottom: 7px; }
</style>
<div class="wrap">
  <div class="kick">Famous or Forgotten · аудит, без изменений в игре</div>
  <h1>Генератор сюжетов</h1>
  <p class="lede">ChatGPT прав: сейчас у фильма нет истории, есть три случайные фразы. Ниже то, что нашлось в коде, модель, которая это исправляет, и двадцать настоящих фильмов из твоего сохранения: их нынешняя завязка рядом с историей из прототипа.</p>

  <h2>Что нашлось в коде</h2>
  <div class="grid">
    <div class="box"><h3>1. Название, жанр и завязка не знают друг о друге</h3><p>Сначала выбирается жанр. Потом название из слов, похожих на жанр (<code>world/titles.js</code>). Через месяц к предложению отдельно приклеивается завязка (<code>career/story.js makePremise</code>) и отдельно твоя роль (<code>career/script.js makeCharacter</code>). Никто из них не читает другого. Поэтому «Midnight Talker» и больница с детективом.</p></div>
    <div class="box"><h3>2. Три части завязки выбираются независимо</h3><p>Место, событие, «поворот». Каждая часть тянется из своей таблицы отдельно, связи между ними нет. Поворот может говорить о «погибшем», которого никто не упоминал.</p></div>
    <div class="box"><h3>3. Жанр учитывается слабо</h3><p>Каждая часть с вероятностью 88% берётся из таблицы жанра, иначе из общей. В итоге у <span class="num">≈30%</span> завязок хотя бы одна часть не от этого жанра. У комедий, романтики и мюзиклов криминальная фраза попадается в 5–6% случаев. Это замер на 2000 завязках каждого жанра.</p></div>
    <div class="box"><h3>4. Героя с целью нет. Поворот показан игроку</h3><p>Есть персонаж: имя и «кто он», например «a detective two years off the pension». Но он выбирается отдельно от сюжета, и у него нет цели. Конфликта в данных нет. Третья фраза завязки, по сути поворот, печатается прямо на предложении и в фильмографии. Это спойлер.</p></div>
    <div class="box"><h3>5. Кто читает завязку</h3><ul><li>Её показывают на карточке предложения, в комнате контракта, в первый день съёмок и в фильмографии.</li><li>Сцены на площадке её <b>не</b> читают: берут только имя персонажа. Комментарий в коде утверждает обратное.</li><li>Критики и постеры её не читают.</li><li>Продолжение с 26 сентября копирует завязку слово в слово: часть 2 рассказывает то же, что часть 1. В твоём сохранении наоборот: части вообще не связаны (примеры ниже).</li></ul></div>
  </div>

  <h2>Модель: история как форма, а не три фразы</h2>
  <div class="grid">
    <div class="box"><h3>Форма сюжета</h3><p>У каждого жанра несколько настоящих сюжетов: «последний эфир», «ложь, которую надо продержать выходные», «группа, которая не разговаривает со времён последнего тура». Внутри формы каждый вариант героя, места, события и препятствия написан так, чтобы подходить к любому другому. Поверхность меняется свободно, смысл не ломается.</p></div>
    <div class="box"><h3>Причины и следствия</h3><p><b>Герой</b> (кто и чего хочет) → <b>событие</b> (что ломает его жизнь) → <b>препятствие</b> (что мешает) → <b>поворот</b>. Поворот принадлежит событию, поэтому он всегда про то, что история уже показала. Игрок видит логлайн и синопсис. Поворот хранится отдельно и не печатается ни на предложении, ни на постере, ни в рецензии.</p></div>
    <div class="box"><h3>Название и сюжет связаны</h3><p>У нового фильма название может вырасти из истории. У старого фильма слова названия выбирают форму и варианты: «Midnight Talker» находит ночного радиоведущего, «Protocol 79» — клинику сна, «Unit 99» — заводской оркестр. Всё посеяно по названию: у фильма всегда одна история.</p></div>
    <div class="box"><h3>Не вторая система</h3><p>Это замена <code>makePremise</code>, а не новая система рядом. Поле <code>premise</code> остаётся: теперь это логлайн, и все экраны, которые его показывают, продолжают работать. Рядом ложится объект <code>story</code>. Роль игрока (<code>character.what</code>) берётся из истории: главная роль — это герой, второй план — один из людей этой формы. У старых сохранений есть только <code>premise</code>, и всё работает как сейчас.</p></div>
  </div>

  <h2>Двадцать фильмов Alex Moon</h2>
  <p class="muted">Красным — завязка, которая у фильма в сохранении сейчас. На странице сценария — что расскажет прототип для того же названия и жанра. Поворот спрятан, как он будет спрятан от игрока.</p>
  <div class="films">${rows.map(card).join('\n')}</div>

  <h2>Продолжения, которые помнят первую часть</h2>
  <p class="muted">Поворот первой части становится тем, что теперь знают все. Герой тот же, прошло столько лет, сколько между фильмами в твоей карьере. Новое событие берётся из той же формы, но никогда не повторяет первое.</p>
  <div class="films">${seq.map(seqCard).join('\n')}</div>

  <h2>Честно о прототипе</h2>
  <div class="grid">
    <div class="box"><h3>Мало форм</h3><p>В прототипе 18 форм, по 2–3 на жанр, и в каждом слоте 2–4 варианта. Это от 117 до 648 историй на жанр: меньше, чем у старого генератора, зато связных. Для игры нужно примерно 8 форм на жанр и 5–6 вариантов в слоте, это тысячи историй на жанр. Повторы уже видны и в двадцати примерах: квартира над магазином дважды, учитель с неотправленными письмами дважды.</p></div>
    <div class="box"><h3>Английский текст</h3><p>Сюжеты написаны по-английски, как весь текст игры. Это главная работа реализации: писать формы руками и вычитывать каждую комбинацию. Генератор отвечает за то, чтобы ничего не сломалось, а не за то, чтобы было красиво.</p></div>
  </div>

  <h2>Что это даст остальной игре</h2>
  <ol>
    <li><b>Постеры.</b> План постера читает <code>story.motif</code>, <code>story.place</code> и героя, а не угадывает по словам завязки. У «Midnight Talker» на постере окажется телефон и эфир, а не два случайных лица.</li>
    <li><b>Сцены на съёмках.</b> «Out of order» сейчас про «письмо» из своей таблицы. С историей «она уже знает» означает «уже знает про звонок отца». Вопрос «Why does she do it» задаётся про цель героя. Дни на площадке становятся сценами именно этого фильма.</li>
    <li><b>Рецензии.</b> Критик может написать, о чём фильм («комедия про последний эфир ночного радиоведущего») и как сработал поворот, не раскрывая его.</li>
    <li><b>Продолжения.</b> Часть 2 строится из части 1, как в примерах выше, вместо копии слово в слово.</li>
    <li><b>Память роли.</b> Герой, его цель и чем для него кончилась часть 1 — основа Role Memory. Если ты ушёл из франшизы, продолжения без тебя уже записываются (<code>career/continuation.js</code>). Тогда часть 2 знает, что персонажа сыграл другой актёр или что его убрали из истории.</li>
  </ol>

  <h2>Как встроить, когда решишь</h2>
  <ol>
    <li>Объект <code>story</code> на предложении, проекте и фильме создаётся при первом обращении, как <code>marketOf(s)</code>. Старые фильмы остаются со своей завязкой.</li>
    <li><code>makePremise</code> и <code>makeCharacter</code> читают историю. <code>premise</code> становится логлайном, поворот печатать перестаём.</li>
    <li>Сиквелы: <code>franchise.js</code> вместо копии завязки вызывает продолжение из части 1.</li>
    <li>Потом по одному: постеры, сцены на площадке, рецензии, память роли.</li>
    <li>Тесты: у каждой формы проверяются все комбинации (без висящих местоимений, без дважды «wants out», без больницы на пирсе). Та же история для того же названия. Старое сохранение загружается.</li>
  </ol>
</div>`;
fs.writeFileSync(out, html);
console.log('page', out, html.length);
