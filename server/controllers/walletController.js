import { getWallet, grantDailyBonus } from '../services/walletService.js';

export async function getWalletController(req, res) {
  try {
    const wallet = await getWallet(req.user.id);
    res.json({ ...wallet, unit: 'virtual_coins', monetaryValue: false, redeemable: false, withdrawable: false, transferable: false, purchasable: false });
  } catch {
    console.error('Virtual wallet read failed.');
    res.status(500).json({ message: 'Unable to load virtual coins.' });
  }
}

export async function claimDailyBonus(req, res) {
  try {
    const result = await grantDailyBonus(req.user.id);
    res.json({ ...result, dailyBonusCoins: result.transaction.amount });
  } catch (error) {
    if (error.message === 'A valid claim timestamp is required.') return res.status(400).json({ message: error.message });
    console.error('Daily bonus claim failed.');
    res.status(500).json({ message: 'Unable to claim daily bonus.' });
  }
}
