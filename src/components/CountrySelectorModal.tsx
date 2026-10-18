import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Check, Globe } from 'lucide-react';
import { COUNTRIES, Country } from '../data/countries';

interface CountrySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (country: Country) => void;
  selectedCountry?: Country;
  title?: string;
}

export const CountrySelectorModal: React.FC<CountrySelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedCountry,
  title = 'Select Country'
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.dialCode.includes(searchTerm)
  );

  return (
    <AnimatePresence>
      <div key="country-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          key="country-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-sm bg-[#101522] border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2 text-white font-bold text-sm uppercase tracking-wider">
              <Globe className="w-4 h-4 text-[#F5B301]" />
              <span>{title}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative my-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search country or code..."
              autoFocus
              className="w-full pl-9 pr-4 py-2 bg-[#1A2030] border border-gray-700/60 focus:border-[#F5B301] rounded-xl text-xs text-white placeholder-gray-400 outline-none transition-all"
            />
          </div>

          {/* Country List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredCountries.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">
                No matching country found
              </div>
            ) : (
              filteredCountries.map((c, idx) => {
                const isSelected = selectedCountry?.code === c.code;
                return (
                  <button
                    key={`country-${c.code}-${idx}`}
                    type="button"
                    onClick={() => {
                      onSelect(c);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#F5B301]/20 border border-[#F5B301]/50 text-white font-semibold'
                        : 'hover:bg-white/5 text-gray-300 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg leading-none">{c.flag}</span>
                      <span className="font-medium text-left">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#15eaff] bg-[#15eaff]/10 px-2 py-0.5 rounded">
                        {c.dialCode}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-[#F5B301]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
