export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  country: string;
  referralCode?: string | null;
  emailVerified: boolean;
  accountStatus: 'active' | 'suspended' | 'pending';
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  kycRejectionReason?: string;
  createdAt: any;
  photoURL?: string | null;
}

export interface KYCRequest {
  id: string;
  userUid: string;
  userEmail: string;
  userName: string;
  nidNumber: string;
  nidFrontUrl: string;
  nidBackUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  submittedAt: string;
  autoApproveTimeMs?: number;
  reviewedAt?: string;
}

export type AccountType = 'live' | 'bonus' | 'demo';

export interface AccountBalances {
  live: number;
  bonus: number;
  demo: number;
}

export interface Candlestick {
  time: number;
  timestamp?: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface CoinAsset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent: number;
  volume: string;
  high24h: number;
  low24h: number;
  isUp: boolean;
  type: 'crypto' | 'forex' | 'binary';
  sparkline: number[];
  iconBg?: string;
}

export interface TradePosition {
  id: string;
  userUid?: string;
  userEmail?: string;
  accountType: AccountType;
  category?: 'forex' | 'crypto' | 'binary';
  tradingMode?: 'forex' | 'otc';
  pair?: string;
  symbol: string;
  type: 'BUY' | 'SELL' | 'UP' | 'DOWN';
  lotSize?: number;
  leverage?: number;
  amount: number;
  entryPrice: number;
  currentPrice: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  payoutPercent?: number;
  expirySeconds?: number;
  remainingSeconds?: number;
  openTimestamp?: number;
  expiryTimestamp?: number;
  closeTimestamp?: number;
  closedAtMs?: number;
  closedAt?: string;
  pnl: number;
  timestamp: string;
  openTime?: string;
  closeTime?: string;
  status: 'OPEN' | 'WON' | 'LOST' | 'CLOSED' | 'DRAW';
}

export type ActiveTrade = TradePosition;

export interface TransactionRecord {
  id: string;
  userUid?: string;
  userEmail?: string;
  userName?: string;
  accountType: AccountType;
  type: 'Deposit' | 'Withdrawal' | 'Transfer' | 'Bonus Credit';
  method: string;
  amount: number;
  bonusAmount?: number;
  claimBonus?: boolean;
  mainBalanceCredit?: number;
  status: 'Completed' | 'Pending' | 'Failed' | 'Approved' | 'Rejected' | 'Success';
  timestamp: string;
  txHash?: string;
  trxId?: string;
  proofScreenshot?: string;
  rejectionReason?: string;
  rejectedAt?: string;
  createdAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  gateway?: string;
  destinationAddress?: string;
  depositBonusGranted?: number;
  systemDeductedProfitAmount?: number;
  totalNetProfit?: number;
}

export interface ReferredAccount {
  uid: string;
  fullName: string;
  liveBalance: number;
  bonusBalance: number;
  demoBalance: number;
  createdAt: string;
  hasQualifyingDeposit?: boolean;
  qualifyingDepositAmount?: number;
  bonusEarned?: number;
  status?: string;
}

export interface ReferralSummary {
  referralCode: string;
  totalReferrals: number;
  qualifyingReferrals: number;
  totalBonusEarned: number;
  referrals: ReferredAccount[];
}
