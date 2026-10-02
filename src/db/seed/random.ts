/** Deterministic PRNG (mulberry32) so every seed run produces the same dataset. */
export function createRandom(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min;
  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error("pick from empty list");
    return items[Math.floor(next() * items.length)] as T;
  };
  const chance = (probability: number) => next() < probability;
  const weighted = <T>(items: readonly T[], weight: (item: T) => number): T => {
    const total = items.reduce((sum, item) => sum + weight(item), 0);
    let roll = next() * total;
    for (const item of items) {
      roll -= weight(item);
      if (roll <= 0) return item;
    }
    return items[items.length - 1] as T;
  };
  const sample = <T>(items: readonly T[], count: number): T[] => {
    const copy = [...items];
    const result: T[] = [];
    while (copy.length > 0 && result.length < count) {
      result.push(copy.splice(Math.floor(next() * copy.length), 1)[0] as T);
    }
    return result;
  };
  return { next, int, pick, chance, weighted, sample };
}

export type Random = ReturnType<typeof createRandom>;

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}
