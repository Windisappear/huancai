export class AppError extends Error { constructor(message: string, public status = 400) { super(message); } }
export const demoMode = () => process.env.DEMO_MODE === 'true';
export const lightweightMode = () => {
  if (process.env.LIGHTWEIGHT_TEST !== 'true') return false;
  if (!demoMode()) throw new Error('LIGHTWEIGHT_TEST 仅限 DEMO_MODE 本机测试');
  return true;
};
export const expiry = (now = new Date()) => new Date(now.getTime() + 72 * 3600_000);
export const isAccessible = (asset: { expiresAt: Date; deletedAt: Date | null }, now = new Date()) => !asset.deletedAt && asset.expiresAt > now;
export function settlement(count: number, unitCents: number, delivered: number) {
  if (![count, unitCents, delivered].every(Number.isSafeInteger) || count < 1 || unitCents < 1 || delivered < 0 || delivered > count) throw new AppError('无效结算参数');
  return { frozen: count * unitCents, charge: delivered * unitCents, release: (count - delivered) * unitCents };
}
export const money = (cents: number) => (cents / 100).toFixed(2);
