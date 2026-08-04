const { calculateBookingAmounts } = require('../src/utils/pricing');

describe('calculateBookingAmounts', () => {
  test('calculates a one-day booking correctly', () => {
    const sameDate = new Date('2026-09-11T00:00:00Z');
    const result = calculateBookingAmounts(15000, sameDate, sameDate);

    expect(result.days).toBe(1);
    expect(result.totalAmount).toBe(15000);
    expect(result.platformFee).toBe(1500);
    expect(result.ownerAmount).toBe(13500);
  });

  test('calculates a multi-day booking correctly', () => {
    const start = new Date('2026-09-11T00:00:00Z');
    const end = new Date('2026-09-13T00:00:00Z');
    const result = calculateBookingAmounts(1000, start, end);

    expect(result.days).toBe(3);
    expect(result.totalAmount).toBe(3000);
    expect(result.platformFee).toBe(300);
    expect(result.ownerAmount).toBe(2700);
  });
});