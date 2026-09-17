import { db, transaction } from './db';
import { AppError, demoMode } from './core';
// Real providers must implement verified webhooks, query and refund before being enabled.
export interface PaymentAdapter {
  create(order: { id: string; amount: number }): Promise<{ checkoutUrl: string }>;
  verify(rawBody: string, headers: Headers): Promise<{ orderId: string; amount: number; transactionId: string }>;
  query(orderId: string): Promise<{ paid: boolean; amount: number; transactionId: string }>;
  refund(orderId: string, amount: number, idempotencyKey: string): Promise<{ reference: string }>;
}
export async function confirmTestPayment(userId: string, id: string) {
  if (!demoMode()) throw new AppError('真实支付尚未开通', 503);
  return transaction(async tx => {
    const p = await tx.payment.findUnique({ where: { id } });
    if (!p || p.userId !== userId || p.provider !== 'TEST') throw new AppError('订单不存在', 404);
    if (p.status === 'PAID' || p.status === 'REFUNDED') return p;
    if (p.status !== 'PENDING') throw new AppError('订单状态不允许确认');
    await tx.wallet.update({ where: { userId }, data: { available: { increment: p.amount } } });
    await tx.ledger.create({ data: { userId, eventKey: `payment:${id}`, kind: 'TEST_TOPUP', availableDelta: p.amount, frozenDelta: 0, reference: id } });
    return tx.payment.update({ where: { id }, data: { status: 'PAID', transactionId: `test-${id}` } });
  });
}
export async function requestRefund(userId: string, paymentId: string) {
  return transaction(async tx => {
    const p = await tx.payment.findUnique({ where: { id: paymentId } }); if (!p || p.userId !== userId || p.status !== 'PAID') throw new AppError('该充值订单不可退款');
    const previous = await tx.refund.findUnique({ where: { paymentId } }); if (previous) return previous;
    const amount = p.amount - p.refunded;
    const w = await tx.wallet.updateMany({ where: { userId, available: { gte: amount } }, data: { available: { decrement: amount }, frozen: { increment: amount } } });
    if (!w.count) throw new AppError('可用余额不足以退还该笔充值');
    const r = await tx.refund.create({ data: { userId, paymentId, amount } });
    await tx.ledger.create({ data: { userId, eventKey: `refund-hold:${r.id}`, kind: 'REFUND_HOLD', availableDelta: -amount, frozenDelta: amount, reference: r.id } }); return r;
  });
}
export async function reviewRefund(actorId: string, id: string, approve: boolean) {
  return transaction(async tx => {
    const r = await tx.refund.findUniqueOrThrow({ where: { id } }); if (r.status !== 'REVIEW') return r;
    const p = await tx.payment.findUniqueOrThrow({ where: { id: r.paymentId } });
    if (approve && (p.provider !== 'TEST' || !demoMode())) throw new AppError('原路退款适配器尚未开通', 503);
    await tx.wallet.update({ where: { userId: r.userId }, data: { frozen: { decrement: r.amount }, available: { increment: approve ? 0 : r.amount } } });
    await tx.ledger.create({ data: { userId: r.userId, eventKey: `refund-settle:${id}`, kind: approve ? 'TEST_REFUND' : 'REFUND_RELEASE', availableDelta: approve ? 0 : r.amount, frozenDelta: -r.amount, reference: id } });
    if (approve) await tx.payment.update({ where: { id: r.paymentId }, data: { refunded: { increment: r.amount }, status: 'REFUNDED' } });
    await tx.audit.create({ data: { actorId, action: approve ? 'REFUND_APPROVED' : 'REFUND_REJECTED', reference: id } });
    return tx.refund.update({ where: { id }, data: { status: approve ? 'REFUNDED' : 'REJECTED' } });
  });
}
