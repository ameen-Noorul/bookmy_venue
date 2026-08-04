// This function is deliberately "pure": give it the same inputs, it always
// gives the same output, and it never touches a database, a file, or the
// network. That's what makes something easy to test — you don't need to set
// up a fake database or a fake server just to check "is the math right?"

const PLATFORM_FEE_PERCENT = 0.1;

function calculateBookingAmounts(pricePerDay, eventDate, eventEndDate) {
  // +1 because a booking from day 1 to day 1 (same day) is still 1 day, not
  // 0 — without the +1 a same-day event would incorrectly cost nothing.
  const days = Math.round((eventEndDate - eventDate) / (1000 * 60 * 60 * 24)) + 1;

  const totalAmount = pricePerDay * days;
  const platformFee = totalAmount * PLATFORM_FEE_PERCENT;
  const ownerAmount = totalAmount - platformFee;

  return { days, totalAmount, platformFee, ownerAmount };
}

module.exports = { calculateBookingAmounts, PLATFORM_FEE_PERCENT };