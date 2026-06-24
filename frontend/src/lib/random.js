// Small pure helpers shared by exercises for picking items and distractors.

/** Return a new array with the elements shuffled (Fisher–Yates). */
export function shuffle(array) {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Pick one random element. */
export function pickOne(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/** Pick `n` distinct random elements. */
export function sample(array, n) {
  return shuffle(array).slice(0, n);
}

/**
 * Pick `count` distractor items for a target, preferring the same category for
 * plausibility and topping up from the rest of the pool if needed.
 */
export function pickDistractors(target, pool, count) {
  const others = pool.filter((it) => it.id !== target.id);
  const sameCat = shuffle(others.filter((it) => it.category === target.category));
  const rest = shuffle(others.filter((it) => it.category !== target.category));
  return [...sameCat, ...rest].slice(0, count);
}
