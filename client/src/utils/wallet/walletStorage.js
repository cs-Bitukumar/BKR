/** Client-side wallet state is a display-only view; all balances and changes
 * come from the authenticated server API. No local balance mutations exist. */
export function formatCoins(amount) {
  const value = Number(amount);
  return `${(Number.isFinite(value) ? value : 0).toLocaleString('en-IN')} coins`;
}

export function readWalletState(user) {
  const virtualCoins = Number(user?.virtualCoins);
  return { virtualCoins: Number.isSafeInteger(virtualCoins) && virtualCoins >= 0 ? virtualCoins : 0, transactions: [] };
}

export function getWalletTransactions(user) {
  return readWalletState(user).transactions;
}
