export const moveItem = <T,>(arr: T[], from: number, to: number): T[] => {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const clone = arr.slice();
  const [item] = clone.splice(from, 1);
  clone.splice(to, 0, item);
  return clone;
};

export const formatWordCount = (v: number) => {
  if (v >= 1000000) return `${v / 10000}万字`;
  if (v >= 10000) return `${v / 10000}万字`;
  return `${v}字`;
};
