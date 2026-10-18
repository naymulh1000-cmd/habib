import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquareHeart, Star, Send, CheckCircle2 } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [category, setCategory] = useState<string>('Trading Execution');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setComment('');
      onClose();
    }, 1500);
  };

  return (
    <AnimatePresence>
      <div key="feedback-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          key="feedback-modal-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-[#0E1424] border border-white/10 rounded-2xl p-6 shadow-2xl text-white space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <div className="flex items-center gap-2 font-extrabold text-sm text-white uppercase tracking-wider">
              <MessageSquareHeart className="w-5 h-5 text-rose-400" />
              <span>Submit Feedback</span>
            </div>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {submitted ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <p className="text-sm font-bold text-emerald-300">Thank You For Your Feedback!</p>
              <p className="text-xs text-gray-400">Your review helps us improve Forex Trade Pro.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Rate Your Experience</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star, idx) => (
                    <button
                      key={`fb-star-${star}-${idx}`}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 text-[#F5B301] hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star className={`w-6 h-6 ${star <= rating ? 'fill-[#F5B301]' : 'text-gray-600'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Topic Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white outline-none focus:border-[#F5B301]"
                >
                  <option value="Trading Execution">Trading Execution & Charts</option>
                  <option value="Deposit & Withdrawal">Deposit & Withdrawal Speed</option>
                  <option value="User Interface">User Interface & Design</option>
                  <option value="Feature Request">New Feature Request</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Your Comments or Suggestions</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  placeholder="Tell us what you like or what we can improve..."
                  className="w-full p-3 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white outline-none focus:border-[#F5B301]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 hover:brightness-110 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Submit Review</span>
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
