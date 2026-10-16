/** Counterpoint's deterministic, immutable rules. Nodes are row * 4 + column.
 * A bead occupies the N or W incoming track of its next junction.
 */
export const ROWS = 3;
export const COLS = 4;
export const COLORS = Object.freeze(['amber', 'blue']);
export const opponent = color => color === 'amber' ? 'blue' : 'amber';

export function stateKey(state) {
  const positions = COLORS.map(color => state.beads
    .filter(bead => bead.color === color)
    .map(bead => bead.node * 2 + (bead.entry === 'W' ? 1 : 0))
    .sort((a, b) => a - b).join(','));
  return `${state.switches.map(value => value ? 1 : 0).join('')}:${positions.join(':')}:${state.turn}`;
}

export function createGame() {
  const state = {
    switches: Array(12).fill(false),
    beads: COLORS.flatMap((color, index) => Array.from({ length: 3 }, (_, row) => ({
      id: `${index ? 'b' : 'a'}${row}`, color, node: row * 4 + (index ? 3 : 1), entry: 'N',
    }))),
    turn: 'amber', beat: 0, winner: null, repetitions: {},
  };
  state.repetitions[stateKey(state)] = 1;
  return state;
}

export function legalMoves(state) {
  if (state.winner !== null) return [];
  const occupied = Array.from({ length: 12 }, () => new Set());
  for (const bead of state.beads) occupied[bead.node].add(bead.color);
  return occupied.flatMap((colors, node) =>
    !colors.size || colors.has(state.turn) ? [node] : []);
}

/** Move every bead one junction. Preserve turn, beat, switches, winner and
 * repetition history; applyMove is the public operation for a complete turn.
 */
export function advance(state) {
  return {
    ...state,
    beads: state.beads.map(bead => {
      const exitsEast = (bead.entry === 'W') !== state.switches[bead.node];
      return {
        ...bead,
        node: exitsEast ? Math.floor(bead.node / 4) * 4 + (bead.node + 1) % 4 : (bead.node + 4) % 12,
        entry: exitsEast ? 'W' : 'N',
      };
    }),
  };
}

export function goalCount(state, color) {
  const column = color === 'amber' ? 0 : 2;
  return state.beads.filter(bead => bead.color === color && bead.entry === 'W' && bead.node % 4 === column).length;
}

export function applyMove(state, node) {
  if (!Number.isInteger(node) || !legalMoves(state).includes(node)) {
    throw new Error(state.winner !== null ? 'This game has ended.' : 'That junction is protected by your opponent.');
  }
  const switches = [...state.switches];
  switches[node] = !switches[node];
  const next = advance({ ...state, switches });
  next.turn = opponent(state.turn);
  next.beat = state.beat + 1;
  next.repetitions = { ...state.repetitions };
  const amberWins = goalCount(next, 'amber') === 3;
  const blueWins = goalCount(next, 'blue') === 3;
  next.winner = amberWins && blueWins ? 'draw' : amberWins ? 'amber' : blueWins ? 'blue' : null;
  const key = stateKey(next);
  next.repetitions[key] = (next.repetitions[key] || 0) + 1;
  if (!next.winner && next.repetitions[key] >= 3) next.winner = 'draw';
  return next;
}

/** Return a boolean, accepting only coherent JSON game snapshots. */
export function validateSavedGame(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.switches)
    || value.switches.length !== 12 || value.switches.some(v => typeof v !== 'boolean')
    || !Array.isArray(value.beads) || value.beads.length !== 6
    || !COLORS.includes(value.turn) || !Number.isSafeInteger(value.beat) || value.beat < 0
    || ![null, 'amber', 'blue', 'draw'].includes(value.winner)
    || !value.repetitions || typeof value.repetitions !== 'object' || Array.isArray(value.repetitions)) return false;
  const ids = new Set();
  const spaces = new Set();
  for (const bead of value.beads) {
    if (!bead || !COLORS.includes(bead.color) || !Number.isInteger(bead.node)
      || bead.node < 0 || bead.node >= 12 || !['N', 'W'].includes(bead.entry)
      || !new RegExp(`^${bead.color === 'amber' ? 'a' : 'b'}[0-2]$`).test(bead.id)) return false;
    ids.add(bead.id);
    spaces.add(`${bead.node}:${bead.entry}`);
  }
  if (ids.size !== 6 || spaces.size !== 6 || COLORS.some(c => value.beads.filter(b => b.color === c).length !== 3)) return false;
  const entries = Object.entries(value.repetitions);
  if (!entries.length || entries.length > value.beat + 1 || entries.some(([key, count]) =>
    !/^[01]{12}:(?:\d{1,2},){2}\d{1,2}:(?:\d{1,2},){2}\d{1,2}:(amber|blue)$/.test(key)
    || !Number.isInteger(count) || count < 1 || count > 3)) return false;
  if (value.turn !== (value.beat % 2 ? 'blue' : 'amber')
    || entries.reduce((sum, [, count]) => sum + count, 0) !== value.beat + 1
    || !value.repetitions[stateKey(value)]) return false;
  const amberWins = goalCount(value, 'amber') === 3;
  const blueWins = goalCount(value, 'blue') === 3;
  if (value.winner === 'amber') return amberWins && !blueWins;
  if (value.winner === 'blue') return blueWins && !amberWins;
  if (value.winner === 'draw') return (amberWins && blueWins) || value.repetitions[stateKey(value)] >= 3;
  return !amberWins && !blueWins && value.repetitions[stateKey(value)] < 3;
}
