import { chooseMove } from './ai.js';

self.onmessage = ({ data }) => {
  const { id, state, difficulty } = data;
  try {
    self.postMessage({ id, move: chooseMove(state, { difficulty }) });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
