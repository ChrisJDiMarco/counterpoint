import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, legalMoves, advance, applyMove, goalCount, stateKey, validateSavedGame } from '../src/engine.js';
import { chooseMove } from '../src/ai.js';

function freezeDeep(value) {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(freezeDeep);
  }
  return value;
}
function setup(beads, turn = 'amber') {
  const state = { ...createGame(), beads, turn, repetitions: {} };
  state.repetitions[stateKey(state)] = 1;
  return state;
}
const bead = (color, index, node, entry = 'N') => ({ id: `${color === 'amber' ? 'a' : 'b'}${index}`, color, node, entry });
const vertical = (color, column, entry = 'N') => Array.from({ length: 3 }, (_, row) => bead(color, row, row * 4 + column, entry));

test('opening is symmetric, complete, and valid', () => {
  const state = createGame();
  assert.deepEqual(state.beads.filter(b => b.color === 'amber').map(b => b.node), [1, 5, 9]);
  assert.deepEqual(state.beads.filter(b => b.color === 'blue').map(b => b.node), [3, 7, 11]);
  assert.deepEqual(legalMoves(state), [0, 1, 2, 4, 5, 6, 8, 9, 10]);
  assert.equal(validateSavedGame(state), true);
  assert.notEqual(createGame().switches, state.switches);
});

test('both switch states route both incoming tracks and wrap each board edge', () => {
  for (const [turned, entry, expectedNode, expectedEntry] of [
    [false, 'N', 3, 'N'], [false, 'W', 8, 'W'],
    [true, 'N', 8, 'W'], [true, 'W', 3, 'N'],
  ]) {
    const state = { ...createGame(), beads: [bead('amber', 0, 11, entry)] };
    state.switches[11] = turned;
    const next = advance(freezeDeep(state));
    assert.equal(next.beads[0].node, expectedNode);
    assert.equal(next.beads[0].entry, expectedEntry);
    assert.equal(next.beat, state.beat);
    assert.equal(next.turn, state.turn);
  }
});

test('protection permits empty, friendly, and contested junctions only', () => {
  const state = setup([
    bead('amber', 0, 0), bead('amber', 1, 1), bead('amber', 2, 1, 'W'),
    bead('blue', 0, 0, 'W'), bead('blue', 1, 2), bead('blue', 2, 6),
  ]);
  assert.ok(legalMoves(state).includes(0));
  assert.ok(legalMoves(state).includes(1));
  assert.ok(legalMoves(state).includes(3));
  assert.ok(!legalMoves(state).includes(2));
  assert.throws(() => applyMove(state, 2), /protected/);
  for (const invalid of [-1, 12, 1.5, '1', NaN]) assert.throws(() => applyMove(state, invalid));
});

test('turn changes one switch and simultaneously advances all six without mutating input', () => {
  const state = freezeDeep(createGame());
  const before = JSON.stringify(state);
  const next = applyMove(state, 1);
  assert.equal(JSON.stringify(state), before);
  assert.equal(next.switches.filter(Boolean).length, 1);
  assert.equal(next.turn, 'blue');
  assert.equal(next.beat, 1);
  assert.deepEqual(next.beads[0], bead('amber', 0, 2, 'W'));
  assert.deepEqual(next.beads[1], bead('amber', 1, 9));
  assert.deepEqual(next.beads[5], bead('blue', 2, 3));
  assert.notEqual(next.repetitions, state.repetitions);
  assert.equal(validateSavedGame(next), true);
});

test('mixed arrivals exchange exits without collision', () => {
  const state = setup([
    bead('amber', 0, 0), bead('blue', 0, 0, 'W'),
    bead('amber', 1, 5), bead('amber', 2, 9), bead('blue', 1, 7), bead('blue', 2, 11),
  ]);
  const next = applyMove(state, 0);
  assert.deepEqual(next.beads[0], bead('amber', 0, 1, 'W'));
  assert.deepEqual(next.beads[1], bead('blue', 0, 4, 'N'));
});

test('victory checks both colors regardless of whose turn advances the machine', () => {
  const state = setup([...vertical('amber', 3, 'W'), ...vertical('blue', 1)], 'blue');
  const next = applyMove(state, 0);
  assert.equal(next.winner, 'amber');
  assert.equal(goalCount(next, 'amber'), 3);
  assert.deepEqual(legalMoves(next), []);
  assert.throws(() => applyMove(next, 0), /ended/);
});

test('simultaneous completion is a draw', () => {
  const next = applyMove(setup([...vertical('amber', 3, 'W'), ...vertical('blue', 1, 'W')]), 0);
  assert.equal(next.winner, 'draw');
  assert.equal(goalCount(next, 'amber'), 3);
  assert.equal(goalCount(next, 'blue'), 3);
});

test('bells do not retain lights on later beats', () => {
  const state = setup([...vertical('amber', 0, 'W'), ...vertical('blue', 3)]);
  assert.equal(goalCount(state, 'amber'), 3);
  assert.equal(goalCount(advance(state), 'amber'), 0);
});

test('threefold repetition includes player and switches, excludes irrelevant bead IDs', () => {
  let state = createGame();
  const initialKey = stateKey(state);
  assert.notEqual(stateKey({ ...state, turn: 'blue' }), initialKey);
  const reordered = { ...state, beads: [...state.beads].reverse() };
  assert.equal(stateKey(reordered), initialKey);
  state = applyMove(state, 0);
  state = applyMove(state, 0);
  assert.equal(stateKey(state), initialKey);
  assert.equal(state.repetitions[initialKey], 2);
  assert.equal(state.winner, null);
  state = applyMove(applyMove(state, 0), 0);
  assert.equal(state.winner, 'draw');
  assert.equal(state.repetitions[initialKey], 3);
  assert.equal(validateSavedGame(state), true);
});

test('saved-game validation rejects malformed and incoherent snapshots', () => {
  assert.equal(validateSavedGame(null), false);
  const mutations = [
    s => s.switches.pop(), s => s.switches[0] = 1, s => s.beads[0].node = 12,
    s => s.beads[0].entry = 'E', s => s.beads[0].id = 'b0',
    s => s.beads[0] = { ...s.beads[1] }, s => s.beat = -1,
    s => s.winner = 'amber', s => s.repetitions = {}, s => s.turn = 'red',
  ];
  for (const mutate of mutations) {
    const state = createGame(); mutate(state);
    assert.equal(validateSavedGame(state), false);
  }
});

test('random legal games preserve space occupancy, population, and immutable state', () => {
  let seed = 381;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let trial = 0; trial < 12; trial++) {
    let state = createGame();
    for (let step = 0; step < 120 && !state.winner; step++) {
      const options = legalMoves(state);
      assert.ok(options.length > 0);
      state = applyMove(freezeDeep(state), options[Math.floor(random() * options.length)]);
      assert.equal(validateSavedGame(state), true);
      assert.equal(new Set(state.beads.map(b => `${b.node}:${b.entry}`)).size, 6);
      assert.equal(state.beads.filter(b => b.color === 'amber').length, 3);
    }
  }
});

test('AI returns legal moves across difficulty levels without editing input', () => {
  const state = freezeDeep(applyMove(createGame(), 1));
  const before = JSON.stringify(state);
  for (const difficulty of ['easy', 'normal', 'hard']) {
    assert.ok(legalMoves(state).includes(chooseMove(state, { difficulty })));
  }
  assert.equal(JSON.stringify(state), before);
});

test('AI takes an immediate win and intercepts a preventable opponent win', () => {
  const winning = setup([...vertical('amber', 3, 'W'), ...vertical('blue', 1)]);
  assert.equal(applyMove(winning, chooseMove(winning)).winner, 'amber');
  const defense = setup([
    bead('amber', 0, 1), bead('amber', 1, 0), bead('amber', 2, 4),
    ...vertical('blue', 1, 'W'),
  ]);
  for (const difficulty of ['easy', 'normal', 'hard']) {
    assert.equal(chooseMove(defense, { difficulty }), 1);
    assert.notEqual(applyMove(defense, chooseMove(defense, { difficulty })).winner, 'blue');
  }
  assert.equal(chooseMove({ ...winning, winner: 'amber' }), null);
});

test('a complete legal route from the actual opening reaches a real victory', () => {
  const route = [1, 3, 2, 10, 6, 0];
  let state = createGame();
  for (const move of route) {
    assert.equal(state.winner, null);
    state = applyMove(state, move);
  }
  assert.equal(state.winner, 'amber');
  assert.equal(goalCount(state, 'amber'), 3);
  assert.equal(validateSavedGame(state), true);
});
