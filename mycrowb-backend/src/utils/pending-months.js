const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;

function getExpectedMonthsFromJoinDate(joinedDate, currentDate = new Date()) {
  if (!joinedDate) return 0;
  const joined = new Date(joinedDate);
  if (Number.isNaN(joined.getTime())) return 0;

  const diffMs = currentDate.getTime() - joined.getTime();
  if (diffMs < 0) return 0;

  return Math.floor(diffMs / THIRTY_DAYS_IN_MS) + 1;
}

function calculatePendingMonths(joinedDate, verifiedCollectionsCount, currentDate = new Date()) {
  const expectedMonths = getExpectedMonthsFromJoinDate(joinedDate, currentDate);
  return Math.max(0, expectedMonths - Number(verifiedCollectionsCount || 0));
}

module.exports = {
  getExpectedMonthsFromJoinDate,
  calculatePendingMonths
};
