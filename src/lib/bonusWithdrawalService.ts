import { 
  db, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  doc, 
  runTransaction, 
  collection, 
  serverTimestamp 
} from 'firebase/firestore';

export interface BonusWithdrawalParams {
  userUid: string;
  userEmail: string;
  amountRequested: number; // 50% profit withdrawal amount requested by member
  method: string;
  destinationAddress: string;
  initialBonusBase?: number; // Base deposit bonus granted (e.g., $250)
}

export interface BonusWithdrawalResult {
  success: boolean;
  trxId: string;
  netProfit: number;
  withdrawnProfit: number;
  deductedSystemProfit: number;
  newBonusBalance: number;
}

/**
 * Executes an atomic Firestore Transaction for Bonus Account Profit Withdrawal:
 * 1. Checks member's bonus account balance & net trading profit in Firestore.
 * 2. Net Trading Profit = Current Bonus Balance - Deposit Bonus Granted (e.g. 496.80 - 250 = 246.80).
 * 3. Validates that withdrawal amount <= 50% of earned profit (e.g. 123.40).
 * 4. Atomically sets the withdrawal request record in 'withdrawals' collection.
 * 5. Automatically deducts the remaining 50% profit balance from the user's bonus balance.
 * 6. Returns user's bonus balance to base Deposit Bonus Granted.
 */
export async function processBonusAccountWithdrawal(
  params: BonusWithdrawalParams
): Promise<BonusWithdrawalResult> {
  const {
    userUid,
    userEmail,
    amountRequested,
    method,
    destinationAddress,
    initialBonusBase
  } = params;

  const trxId = 'WD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const userRef = doc(db, 'users', userUid);
  const withdrawalRef = doc(collection(db, 'withdrawals'));

  try {
    let netProfit = 0;
    let deductedSystemProfit = 0;
    let newBonusBalance = 250;

    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      
      const userData = userSnap.exists() ? userSnap.data() : {};
      const currentBonusBalance = Number(userData.bonusBalance ?? 0);
      const baseGranted = initialBonusBase !== undefined && initialBonusBase > 0
        ? initialBonusBase
        : Number(userData.depositBonusGranted ?? (currentBonusBalance > 0 ? 250.00 : 0));
      const actualBonusGranted = Math.min(currentBonusBalance, baseGranted);

      netProfit = Math.max(0, Number((currentBonusBalance - actualBonusGranted).toFixed(2)));
      const maxEligibleWithdrawal = Number((netProfit * 0.5).toFixed(2));

      if (netProfit <= 0) {
        throw new Error('Deposit bonus cannot be withdrawn directly. Only trading profit (50%) earned from bonus account is withdrawable.');
      }

      if (amountRequested > maxEligibleWithdrawal + 0.01) {
        throw new Error(`Withdrawal amount ($${amountRequested.toFixed(2)}) exceeds 50% eligible profit limit ($${maxEligibleWithdrawal.toFixed(2)}).`);
      }

      // System automatically deducts the remaining 50% profit balance
      deductedSystemProfit = Number((netProfit - amountRequested).toFixed(2));
      newBonusBalance = actualBonusGranted; // Reset bonus balance to base deposit bonus granted

      // 1. Update user's bonus account balance in Firestore
      if (userSnap.exists()) {
        const currentLive = Number(userData.liveBalance ?? userData.balances?.live ?? 0);
        const currentDemo = Number(userData.demoBalance ?? userData.balances?.demo ?? 10000);
        transaction.update(userRef, {
          bonusBalance: newBonusBalance,
          depositBonusGranted: actualBonusGranted,
          balances: {
            live: currentLive,
            bonus: newBonusBalance,
            demo: currentDemo
          },
          lastBonusWithdrawalAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      // 2. Add withdrawal record to 'withdrawals' collection
      transaction.set(withdrawalRef, {
        id: withdrawalRef.id,
        trxId,
        userUid: userUid || 'anonymous',
        userEmail: userEmail || 'trader@forexpro.com',
        accountType: 'bonus',
        amount: amountRequested,
        depositBonusGranted: actualBonusGranted,
        systemDeductedProfitAmount: deductedSystemProfit,
        totalNetProfit: netProfit,
        method,
        destinationAddress,
        status: 'Pending',
        createdAt: serverTimestamp()
      });
    });

    return {
      success: true,
      trxId,
      netProfit,
      withdrawnProfit: amountRequested,
      deductedSystemProfit,
      newBonusBalance
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userUid}`);
    throw error;
  }
}
