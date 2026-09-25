(() => {
  const originalSetupGame = setupGame;
  const fullGameKey = 'skat-trainer-lernrunde-v1';
  const suit = { C: '♣', S: '♠', H: '♥', D: '♦' };
  const colour = card => card.s === 'H' || card.s === 'D' ? 'red' : 'black';
  const label = card => `${suit[card.s]} ${card.r}`;
  const eyes = { A: 11, '10': 10, K: 4, Q: 3, J: 2, '9': 0, '8': 0, '7': 0 };
  const rank = { A: 7, '10': 6, K: 5, Q: 4, '9': 3, '8': 2, '7': 1 };
  const jackRank = { C: 4, S: 3, H: 2, D: 1 };

  function freshGame() {
    return {
      hands: [
        [{ s: 'C', r: 'J' }, { s: 'S', r: 'J' }, { s: 'D', r: 'A' }, { s: 'D', r: 'K' }, { s: 'H', r: 'A' }, { s: 'H', r: '10' }, { s: 'C', r: 'A' }, { s: 'C', r: '10' }, { s: 'S', r: 'A' }, { s: 'S', r: '9' }],
        [{ s: 'S', r: 'K' }, { s: 'S', r: '10' }, { s: 'H', r: 'K' }, { s: 'H', r: '8' }, { s: 'D', r: '10' }, { s: 'D', r: '8' }, { s: 'C', r: 'K' }, { s: 'C', r: '9' }, { s: 'C', r: '8' }, { s: 'D', r: 'Q' }],
        [{ s: 'C', r: 'Q' }, { s: 'C', r: '7' }, { s: 'S', r: 'Q' }, { s: 'S', r: '8' }, { s: 'S', r: '7' }, { s: 'H', r: 'J' }, { s: 'H', r: 'Q' }, { s: 'H', r: '9' }, { s: 'D', r: 'J' }, { s: 'D', r: '9' }]
      ],
      leader: 0, turn: 0, trick: [], trickNo: 1, points: [0, 0, 0], message: 'Der Alleinspieler spielt aus.', history: [], started: false, done: false
    };
  }
  function saveFullGame(state) { localStorage.setItem(fullGameKey, JSON.stringify(state)); }
  function loadFullGame() {
    try { return JSON.parse(localStorage.getItem(fullGameKey)) || freshGame(); }
    catch { return freshGame(); }
  }
  function trump(card) { return card.r === 'J' || card.s === 'C'; }
  function effectiveSuit(card) { return trump(card) ? 'T' : card.s; }
  function cardPower(card, lead) {
    if (card.r === 'J') return 200 + jackRank[card.s];
    if (card.s === 'C') return 100 + rank[card.r];
    if (card.s === lead) return 10 + rank[card.r];
    return 0;
  }
  function legalCards(state, player) {
    const cards = state.hands[player];
    if (!state.trick.length) return cards;
    const needed = effectiveSuit(state.trick[0].card);
    const matching = cards.filter(card => effectiveSuit(card) === needed);
    return matching.length ? matching : cards;
  }
  function winner(state) {
    const lead = effectiveSuit(state.trick[0].card);
    return state.trick.reduce((best, play) => cardPower(play.card, lead) > cardPower(best.card, lead) ? play : best).player;
  }
  function takeTrick(state) {
    const wonBy = winner(state);
    const trickEyes = state.trick.reduce((sum, play) => sum + eyes[play.card.r], 0);
    state.points[wonBy] += trickEyes;
    const names = ['Der Alleinspieler', 'Du', 'Der andere Gegenspieler'];
    state.history.unshift(`Stich ${state.trickNo}: ${names[wonBy]} gewinnt ${trickEyes} Augen.`);
    state.message = `${names[wonBy]} gewinnt den Stich mit ${label(state.trick.find(play => play.player === wonBy).card)}.`;
    state.trick = [];
    state.leader = wonBy;
    state.turn = wonBy;
    state.trickNo += 1;
    if (state.trickNo === 11) {
      state.done = true;
      const solo = state.points[0];
      state.message = solo >= 61 ? `Spielende: Der Alleinspieler gewinnt mit ${solo} Augen.` : `Spielende: Die Gegenspieler gewinnen, der Alleinspieler hat nur ${solo} Augen.`;
      if (!data.done.includes(9)) data.done.push(9);
      save();
    }
  }
  function play(state, player, card) {
    const index = state.hands[player].findIndex(c => c.s === card.s && c.r === card.r);
    state.hands[player].splice(index, 1);
    state.trick.push({ player, card });
    if (state.trick.length === 3) takeTrick(state);
    else state.turn = (player + 1) % 3;
  }
  function chooseComputerCard(state, player) {
    if (!state.started && player === 0) return state.hands[0].find(card => card.s === 'S' && card.r === '9');
    const lead = state.trick.length ? effectiveSuit(state.trick[0].card) : null;
    return [...legalCards(state, player)].sort((a, b) => cardPower(a, lead) - cardPower(b, lead))[0];
  }
  function advanceComputers(state) {
    if (!state.started) { state.started = true; play(state, 0, chooseComputerCard(state, 0)); }
    while (!state.done && state.turn !== 1) play(state, state.turn, chooseComputerCard(state, state.turn));
  }
  function cardMarkup(card, extra = '') { return `<div class="playing-card ${colour(card)} ${extra}">${suit[card.s]}<b>${card.r}</b></div>`; }
  function fullGameMarkup() {
    return `<p>Hier geht eure gemeinsame Übung als ganze Lernpartie weiter. Du bist Gegenspieler; Kreuz ist Trumpf. Die Computer spielen regelkonform und absichtlich einfach, damit du dich auf das Bedienen und die Stiche konzentrieren kannst.</p><div class="game-table"><b>Lernpartie · Kreuz-Spiel</b><p id="fullStatus"></p><div class="trick" id="fullTrick"></div></div><div class="callout" id="fullScore"></div><h3>Deine Hand</h3><div class="hand" id="fullHand"></div><div class="feedback" id="fullFeedback"></div><div id="fullHistory" class="small"></div><div class="actions"><button class="btn secondary" id="restartFull">Partie von vorn beginnen</button></div>`;
  }
  function renderFullGame() {
    const state = loadFullGame();
    advanceComputers(state);
    saveFullGame(state);
    const status = document.querySelector('#fullStatus');
    const trick = document.querySelector('#fullTrick');
    const score = document.querySelector('#fullScore');
    const handEl = document.querySelector('#fullHand');
    const feedback = document.querySelector('#fullFeedback');
    const history = document.querySelector('#fullHistory');
    if (!status) return;
    const names = ['Alleinspieler', 'Du', 'Gegenspieler'];
    status.textContent = state.done ? state.message : `Stich ${state.trickNo} von 10 · ${state.turn === 1 ? 'Du bist dran.' : `${names[state.turn]} spielt.`}`;
    trick.innerHTML = state.trick.map(play => `${cardMarkup(play.card)}<span class="small">${names[play.player]}</span>`).join('') || '<p>Noch keine Karte liegt aus.</p>';
    score.innerHTML = `<b>Augen bisher:</b> Alleinspieler ${state.points[0]} · Gegenspieler ${state.points[1] + state.points[2]}<br><span class="small">Der Skat enthält ♥7 und ♦7 (0 Augen).</span>`;
    feedback.textContent = state.done ? state.message : state.message;
    history.innerHTML = state.history.slice(0, 3).join('<br>');
    const legal = state.done ? [] : legalCards(state, 1);
    handEl.innerHTML = state.hands[1].map((card, index) => `<button data-card="${index}" ${state.turn !== 1 || state.done ? 'disabled' : ''}>${label(card)}</button>`).join('');
    handEl.querySelectorAll('button').forEach(button => button.onclick = () => {
      const card = state.hands[1][+button.dataset.card];
      if (!legal.some(c => c.s === card.s && c.r === card.r)) {
        feedback.textContent = `Du musst ${effectiveSuit(state.trick[0].card) === 'T' ? 'Trumpf' : suit[effectiveSuit(state.trick[0].card)]} bedienen.`;
        return;
      }
      play(state, 1, card);
      state.message = `Du legst ${label(card)}. Das war regelkonform.`;
      advanceComputers(state);
      saveFullGame(state);
      renderFullGame();
    });
    document.querySelector('#restartFull').onclick = () => { localStorage.removeItem(fullGameKey); renderFullGame(); };
  }

  topics.push({ title: 'Ganze Lernpartie', body: fullGameMarkup(), practice: true, fullgame: true });
  document.querySelector('.sheetgrid article:nth-child(3)').innerHTML = `<h3>Spielwert & Reizen</h3><p><b>Grundwerte:</b> ♦ Karo = 9 · ♥ Herz = 10 · ♠ Pik = 11 · ♣ Kreuz = 12 · Grand = 24.</p><p>Das sind keine Kartenaugen. Beim Reizen gilt: Grundwert × Spielstufe.</p><p><b>Spielstufe:</b> „mit/ohne Spitzen“ + 1 für Spiel. Hand, Schneider und Schwarz können sie weiter erhöhen.</p><table><tr><th>Spielstufe</th><th>♦</th><th>♥</th><th>♠</th><th>♣</th><th>Grand</th></tr><tr><td>2</td><td>18</td><td>20</td><td>22</td><td>24</td><td>48</td></tr><tr><td>3</td><td>27</td><td>30</td><td>33</td><td>36</td><td>72</td></tr><tr><td>4</td><td>36</td><td>40</td><td>44</td><td>48</td><td>96</td></tr></table><p>Reizfolge beginnt: 18, 20, 22, 23, 24, 27, 30, 33, 35, 36, 40, 44, 45, 46, 48, 50, 54, 55, 59, 60.</p>`;
  setupGame = function () {
    if (topics[data.active].fullgame) renderFullGame();
    else originalSetupGame();
  };
  render();
})();
