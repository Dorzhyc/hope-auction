export function ceilTo100(x: number): number {
  return Math.ceil(x / 100) * 100;
}

export function computeMinBid(currentPrice: number): number {
  return ceilTo100(currentPrice * 1.10);
}
