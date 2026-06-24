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
 * Pick `n` distinct elements, weighted so higher-weight items are more likely.
 * Uses the Efraimidis–Spirakis key: key = u^(1/w); pick the n largest keys.
 * This is weighted sampling *without* replacement.
 */
export function weightedSample(array, n, weightOf) {
  if (n <= 0 || array.length === 0) return [];
  const keyed = array.map((item) => {
    const w = weightOf(item);
    const u = Math.random();
    // Guard against w <= 0 (treat as tiny so it's almost never picked).
    const key = w > 0 ? Math.pow(u, 1 / w) : 0;
    return { item, key };
  });
  keyed.sort((a, b) => b.key - a.key);
  return keyed.slice(0, Math.min(n, array.length)).map((k) => k.item);
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
