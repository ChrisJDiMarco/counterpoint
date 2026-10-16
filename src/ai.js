import { applyMove, legalMoves, stateKey } from './engine.js';

const LIMITS = {
  easy: { milliseconds: 90, depth: 2 },
  normal: { milliseconds: 480, depth: 5 },
  hard: { milliseconds: 1150, depth: 6 },
};
const TIMEOUT = Symbol('search deadline');
const now = () => globalThis.performance?.now() ?? Date.now();

/** Forecast the unedited machine. Reward synchronized arrivals and short routes,
 * rather than assuming that occupying a bell permanently scores a point.
 * Minimax then tests those forecasts against legal edits by both players.
 */
function evaluate(state, color) {
  const positions = state.beads.map(bead => bead.node * 2 + (bead.entry === 'W' ? 1 : 0));
  const sides = state.beads.map(bead => bead.color === color ? 0 : 1);
  const targets = [color === 'amber' ? 0 : 2, color === 'amber' ? 2 : 0];
  const firstArrivals = Array(6).fill(17);
  const bestSchedule = [0, 0];
  const immediate = [0, 0];
  for (let beat = 0; beat <= 16; beat++) {
    const counts = [0, 0];
    for (let i = 0; i < positions.length; i++) {
      const node = positions[i] >> 1;
      if ((positions[i] & 1) && node % 4 === targets[sides[i]]) {
        counts[sides[i]]++;
        if (firstArrivals[i] === 17) firstArrivals[i] = beat;
      }
    }
    for (let side = 0; side < 2; side++) {
      if (beat === 0) immediate[side] = [0, 5, 22, 200][counts[side]];
      bestSchedule[side] = Math.max(bestSchedule[side], [0, 3, 20, 110][counts[side]] / (1 + beat * 0.23));
    }
    for (let i = 0; i < positions.length; i++) {
      const node = positions[i] >> 1;
      const east = Boolean(positions[i] & 1) !== state.switches[node];
      positions[i] = east ? (Math.floor(node / 4) * 4 + (node + 1) % 4) * 2 + 1 : ((node + 4) % 12) * 2;
    }
  }
  const travel = [0, 0];
  for (let i = 0; i < firstArrivals.length; i++) travel[sides[i]] += firstArrivals[i];
  return immediate[0] - immediate[1] + bestSchedule[0] - bestSchedule[1] + (travel[1] - travel[0]) * 0.75;
}

/** Bounded iterative-deepening adversarial search. Run in ai-worker.js so
 * rendering and camera controls remain responsive even on harder settings.
 */
export function chooseMove(state, { difficulty = 'normal' } = {}) {
  const moves = legalMoves(state);
  if (!moves.length) return null;
  if (moves.length === 1) return moves[0];
  const rootColor = state.turn;
  const limits = LIMITS[difficulty] || LIMITS.normal;
  const deadline = now() + limits.milliseconds;
  const staticScores = new Map();
  let nodes = 0;
  let bestMove = moves[0];
  const score = position => {
    if (position.winner) return position.winner === 'draw' ? 0
      : position.winner === rootColor ? 100000 : -100000;
    const key = stateKey(position);
    if (!staticScores.has(key)) staticScores.set(key, evaluate(position, rootColor));
    return staticScores.get(key);
  };
  const ordered = (position, preferred) => legalMoves(position)
    .map(move => {
      const child = applyMove(position, move);
      return { move, child, value: score(child) };
    }).sort((a, b) => {
      if (a.move === preferred) return -1;
      if (b.move === preferred) return 1;
      return position.turn === rootColor ? b.value - a.value : a.value - b.value;
    });
  const search = (position, depth, alpha, beta, ply) => {
    if ((nodes++ & 31) === 0 && now() > deadline) throw TIMEOUT;
    if (position.winner) {
      const value = score(position);
      return value > 0 ? value - ply : value < 0 ? value + ply : 0;
    }
    if (depth === 0) return score(position);
    const maximizing = position.turn === rootColor;
    let value = maximizing ? -Infinity : Infinity;
    for (const candidate of ordered(position)) {
      const next = search(candidate.child, depth - 1, alpha, beta, ply + 1);
      value = maximizing ? Math.max(value, next) : Math.min(value, next);
      if (maximizing) alpha = Math.max(alpha, value);
      else beta = Math.min(beta, value);
      if (beta <= alpha) break;
    }
    return value;
  };

  // Always return an immediate win, including wins occurring on the mover's beat.
  const firstCandidates = ordered(state);
  for (const candidate of firstCandidates) if (candidate.child.winner === rootColor) return candidate.move;
  bestMove = firstCandidates[0].move;
  for (let depth = 1; depth <= limits.depth; depth++) {
    let iterationBest = bestMove;
    let iterationScore = -Infinity;
    try {
      for (const candidate of ordered(state, bestMove)) {
        const value = search(candidate.child, depth - 1, iterationScore, Infinity, 1);
        if (value > iterationScore) {
          iterationScore = value;
          iterationBest = candidate.move;
        }
      }
      bestMove = iterationBest;
      if (iterationScore > 99000) break;
    } catch (error) {
      if (error !== TIMEOUT) throw error;
      break; // Keep the last fully searched depth; partial depth is biased.
    }
    if (now() >= deadline) break;
  }
  return bestMove;
}
