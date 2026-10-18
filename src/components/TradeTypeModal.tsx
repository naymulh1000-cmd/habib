import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, TrendingUp, TrendingDown, DollarSign, Globe, Cpu, Zap, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { AccountType, CoinAsset, TradePosition } from '../types';

interface TradeTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAccount: AccountType;
  availableBalance: number;
  assets: CoinAsset[];
  onExecuteTrade: (trade: Omit<TradePosition, 'id' | 'pnl' | 'timestamp' | 'status'>) => void;
}

export const TradeTypeModal: React.FC<TradeTypeModalProps> = ({
  isOpen,
  onClose,
  activeAccount,
  availableBalance,
  assets,
  onExecuteTrade
}) => {
  const [activeCategory, setActiveCategory] = useState<'forex' | 'crypto' | 'binary'>('forex');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('EUR/USD');
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [amount, setAmount] = useState<string>('100');
  const [leverage, setLeverage] = useState<number>(100);
  const [binaryExpiry, setBinaryExpiry] = useState<number>(60); // 60 seconds
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter assets by category
  const filteredAssets = assets.filter(a => {
    if (activeCategory === 'forex') return a.type === 'forex';
    if (activeCategory === 'crypto') return a.type === 'crypto';
    return true; // binary can trade all assets
  });

  const currentAsset = assets.find(a => a.symbol === selectedSymbol) || filteredAssets[0] || assets[0];

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) return;
    if (numericAmount > availableBalance) {
      alert(`Insufficient ${activeAccount.toUpperCase()} balance! Required: $${numericAmount}, Available: $${availableBalance.toFixed(2)}`);
      return;
    }

    onExecuteTrade({
      accountType: activeAccount,
      category: activeCategory,
      pair: currentAsset.symbol,
      type: tradeType,
      amount: numericAmount,
      entryPrice: currentAsset.price,
      currentPrice: currentAsset.price,
      expirySeconds: activeCategory === 'binary' ? binaryExpiry : undefined
    });

    setSuccessMsg(`Order Executed! ${tradeType} ${currentAsset.symbol} for $${numericAmount}`);
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1200);
  };

  return (
    <AnimatePresence>
      <div key="trade-type-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          key="trade-type-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl bg-[#0E1424] border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5B301]/10 border border-[#F5B301]/30 flex items-center justify-center text-[#F5B301]">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  Execute Trade <span className="text-xs uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">{activeAccount} Account</span>
                </h3>
                <p className="text-xs text-gray-400">Available Balance: <span className="text-[#F5B301] font-mono font-bold">${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Trade Category Switcher (Forex, Crypto, Binary) */}
          <div className="grid grid-cols-3 gap-2 my-4">
            <button
              type="button"
              onClick={() => {
                setActiveCategory('forex');
                setSelectedSymbol('EUR/USD');
              }}
              className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeCategory === 'forex'
                  ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/10'
                  : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:bg-gray-800/60'
              }`}
            >
              <Globe className="w-5 h-5 text-blue-400" />
              <span>Forex Trading</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveCategory('crypto');
                setSelectedSymbol('BTC');
              }}
              className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeCategory === 'crypto'
                  ? 'bg-gradient-to-r from-amber-500/30 to-orange-500/30 border-[#F5B301] text-[#F5B301] shadow-lg shadow-[#F5B301]/10'
                  : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:bg-gray-800/60'
              }`}
            >
              <Cpu className="w-5 h-5 text-[#F5B301]" />
              <span>Crypto Trading</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveCategory('binary');
                setSelectedSymbol('EUR/USD');
              }}
              className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeCategory === 'binary'
                  ? 'bg-gradient-to-r from-emerald-500/30 to-teal-500/30 border-emerald-400 text-emerald-400 shadow-lg shadow-emerald-500/10'
                  : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:bg-gray-800/60'
              }`}
            >
              <Clock className="w-5 h-5 text-emerald-400" />
              <span>Binary Options</span>
            </button>
          </div>

          {successMsg ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
              <p className="text-sm font-bold text-emerald-300">{successMsg}</p>
            </div>
          ) : (
            <form onSubmit={handlePlaceOrder} className="space-y-4">
              {/* Asset Selector */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Select Instrument / Asset</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {filteredAssets.map((asset, idx) => (
                    <button
                      key={`asset-${asset.symbol}-${idx}`}
                      type="button"
                      onClick={() => setSelectedSymbol(asset.symbol)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        selectedSymbol === asset.symbol
                          ? 'bg-[#F5B301]/10 border-[#F5B301] text-white'
                          : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      <p className="font-bold text-xs">{asset.symbol}</p>
                      <p className="font-mono text-[10px] text-[#F5B301]">${asset.price}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount & Specific Category Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Trade Volume (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 text-xs">$</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="100"
                      className="w-full pl-7 pr-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-sm font-mono text-white outline-none focus:border-[#F5B301]"
                    />
                  </div>
                </div>

                {activeCategory === 'forex' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Leverage Ratio</label>
                    <select
                      value={leverage}
                      onChange={(e) => setLeverage(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white outline-none focus:border-[#F5B301]"
                    >
                      <option value={50}>1:50 Standard</option>
                      <option value={100}>1:100 Recommended</option>
                      <option value={200}>1:200 Aggressive</option>
                      <option value={500}>1:500 Pro High Risk</option>
                    </select>
                  </div>
                )}

                {activeCategory === 'binary' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Contract Expiry Duration</label>
                    <select
                      value={binaryExpiry}
                      onChange={(e) => setBinaryExpiry(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white outline-none focus:border-[#F5B301]"
                    >
                      <option value={30}>30 Seconds (⚡ Turbo 85% payout)</option>
                      <option value={60}>60 Seconds (1 Min 90% payout)</option>
                      <option value={300}>5 Minutes (92% payout)</option>
                      <option value={900}>15 Minutes (95% payout)</option>
                    </select>
                  </div>
                )}

                {activeCategory === 'crypto' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Order Execution Mode</label>
                    <div className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-emerald-400 font-bold flex items-center justify-between">
                      <span>Instant Market Order</span>
                      <span className="text-[10px] text-gray-400">0% Fee</span>
                    </div>
                  </div>
                )}
              </div>

              {/* BUY / SELL Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="submit"
                  onClick={() => setTradeType('BUY')}
                  className="py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-gray-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>{activeCategory === 'binary' ? 'HIGHER / CALL' : 'BUY LONG'}</span>
                </button>

                <button
                  type="submit"
                  onClick={() => setTradeType('SELL')}
                  className="py-3 px-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 transition-all cursor-pointer"
                >
                  <TrendingDown className="w-4 h-4" />
                  <span>{activeCategory === 'binary' ? 'LOWER / PUT' : 'SELL SHORT'}</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
