// Small seeded PRNG (mulberry32) so generated test cases are reproducible.

export function createRandom(seed: number): { int: (min: number, max: number) => number } {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Inclusive integer range.
  return { int: (min, max) => min + Math.floor(next() * (max - min + 1)) };
}
