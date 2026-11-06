export interface BonusLanguage {
  code: 'en' | 'bn' | 'hi' | 'ar' | 'es' | 'pt';
  name: string;
  nativeName: string;
  flag: string;
}

export const BONUS_LANGUAGES: BonusLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English (US)', flag: '🇺🇸' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' }
];

export interface BonusTranslation {
  headerLabel: string;
  toggleTitle: string;
  toggleSubtitleOn: string;
  toggleSubtitleOff: string;
  unlockRequirement: string;
  selectMinButton: string;
  liveWalletLabel: string;
  bonusWalletLabel: string;
  distributionInfo: string;
  categoriesHeader: string;
  autoSelectedBadge: string;
  activeBadge: string;
  selectButton: string;
  categories: {
    1: {
      name: string;
      tag: string;
      terms: string;
    };
    2: {
      name: string;
      tag: string;
      terms: string;
    };
    3: {
      name: string;
      tag: string;
      terms: string;
    };
  };
}

export const BONUS_TRANSLATIONS: Record<string, BonusTranslation> = {
  en: {
    headerLabel: '100% Bonus Program',
    toggleTitle: 'Do you want to accept the 100% bonus balance?',
    toggleSubtitleOn: '100% Cash Matching Bonus Active',
    toggleSubtitleOff: 'Toggle OFF: Standard Live Deposit',
    unlockRequirement: 'Deposit minimum $250 to unlock bonus challenge',
    selectMinButton: 'Select $250',
    liveWalletLabel: 'Live Wallet',
    bonusWalletLabel: 'Bonus Wallet: +100%',
    distributionInfo: 'Deposited funds go directly to your Live Wallet and an equal 100% matching amount is credited to your separate Bonus Wallet.',
    categoriesHeader: 'Bonus Categories & Terms:',
    autoSelectedBadge: 'Auto-selected by amount',
    activeBadge: 'ACTIVE',
    selectButton: 'Select',
    categories: {
      1: {
        name: 'Starter Category ($250 - $499)',
        tag: '5% Daily Profit Cap • 50% Profit Share',
        terms: 'Daily profit capped at 5% of deposit amount. When total balance doubles (2x), 50% of the profits become withdrawable.'
      },
      2: {
        name: 'Pro Category ($500 - $999)',
        tag: '10% Daily Profit Cap • 60% Profit Share',
        terms: 'Daily profit capped at 10% of deposit amount. When total balance doubles (2x), 60% of the profits become withdrawable.'
      },
      3: {
        name: 'Elite VIP Category ($1000+)',
        tag: '20% Daily Profit Cap • 70% Profit Share',
        terms: 'Daily profit capped at 20% of deposit amount. When total balance doubles (2x), 70% of the profits become withdrawable.'
      }
    }
  },
  bn: {
    headerLabel: '১০০% বোনাস প্রোগ্রাম',
    toggleTitle: 'আপনি কি ১০০% বোনাস ব্যালেন্স গ্রহণ করতে চান?',
    toggleSubtitleOn: '১০০% ক্যাশ ম্যাচিং বোনাস এক্টিভ',
    toggleSubtitleOff: 'টগল OFF: সাধারণ লাইভ ডিপোজিট',
    unlockRequirement: 'বোনাস আনলক করতে সর্বনিম্ন $২৫০ ডিপোজিট করুন',
    selectMinButton: 'Select $250',
    liveWalletLabel: 'Live Wallet',
    bonusWalletLabel: 'Bonus Wallet: +১০০%',
    distributionInfo: 'ডিপোজিটকৃত অর্থ সরাসরি Live Wallet-এ জমা হবে এবং ১০০% সমপরিমাণ আলাদা Bonus Wallet-এ ক্রেডিট হবে।',
    categoriesHeader: 'বোনাস ক্যাটাগরি ও শর্তাবলি:',
    autoSelectedBadge: 'ইনপুট অনুযায়ী অটো-সিলেক্টেড',
    activeBadge: 'ACTIVE',
    selectButton: 'সিলেক্ট করুন',
    categories: {
      1: {
        name: 'স্টার্টার ক্যাটাগরি ($২৫০ - $৪৯৯)',
        tag: 'দৈনিক প্রফিট ক্যাপ ৫% • প্রফিট শেয়ার ৫০%',
        terms: 'ডিপোজিট $২৫০ - $৪৯৯। দৈনিক সর্বোচ্চ ৫% প্রফিট। ব্যালেন্স দ্বিগুণ (২x) হলে ৫০% প্রফিট উইথড্র যোগ্য।'
      },
      2: {
        name: 'প্রো ক্যাটাগরি ($৫০০ - $৯৯৯)',
        tag: 'দৈনিক প্রফিট ক্যাপ ১০% • প্রফিট শেয়ার ৬০%',
        terms: 'ডিপোজিট $৫০০ - $৯৯৯। দৈনিক সর্বোচ্চ ১০% প্রফিট। ব্যালেন্স দ্বিগুণ (২x) হলে ৬০% প্রফিট উইথড্র যোগ্য।'
      },
      3: {
        name: 'এলিট ভিআইপি ক্যাটাগরি ($১০০০+)',
        tag: 'দৈনিক প্রফিট ক্যাপ ২০% • প্রফিট শেয়ার ৭০%',
        terms: 'ডিপোজিট $১০০০+। দৈনিক সর্বোচ্চ ২০% প্রফিট। ব্যালেন্স দ্বিগুণ (২x) হলে ৭০% প্রফিট উইথড্র যোগ্য।'
      }
    }
  },
  hi: {
    headerLabel: '100% बोनस कार्यक्रम',
    toggleTitle: 'क्या आप 100% बोनस बैलेंस स्वीकार करना चाहते हैं?',
    toggleSubtitleOn: '100% कैश मैचिंग बोनस सक्रिय',
    toggleSubtitleOff: 'टॉगल बंद: सामान्य लाइव डिपॉजिट',
    unlockRequirement: 'बोनस अनलॉक करने के लिए न्यूनतम $250 जमा करें',
    selectMinButton: 'Select $250',
    liveWalletLabel: 'Live Wallet',
    bonusWalletLabel: 'Bonus Wallet: +100%',
    distributionInfo: 'जमा की गई राशि सीधे आपके Live Wallet में जाएगी और 100% समान राशि आपके अलग Bonus Wallet में जमा होगी।',
    categoriesHeader: 'बोनस श्रेणियां और शर्तें:',
    autoSelectedBadge: 'राशि के आधार पर स्वतः चयनित',
    activeBadge: 'सक्रिय',
    selectButton: 'चुनें',
    categories: {
      1: {
        name: 'स्टार्टर श्रेणी ($250 - $499)',
        tag: 'दैनिक लाभ कैप 5% • लाभ हिस्सा 50%',
        terms: 'दैनिक लाभ जमा राशि के 5% तक सीमित। कुल बैलेंस दोगुना (2x) होने पर 50% लाभ निकासी योग्य।'
      },
      2: {
        name: 'प्रो श्रेणी ($500 - $999)',
        tag: 'दैनिक लाभ कैप 10% • लाभ हिस्सा 60%',
        terms: 'दैनिक लाभ जमा राशि के 10% तक सीमित। कुल बैलेंस दोगुना (2x) होने पर 60% लाभ निकासी योग्य।'
      },
      3: {
        name: 'एलीट वीआईपी श्रेणी ($1000+)',
        tag: 'दैनिक लाभ कैप 20% • लाभ हिस्सा 70%',
        terms: 'दैनिक लाभ जमा राशि के 20% तक सीमित। कुल बैलेंस दोगुना (2x) होने पर 70% लाभ निकासी योग्य।'
      }
    }
  },
  ar: {
    headerLabel: 'برنامج بونص 100%',
    toggleTitle: 'هل ترغب في الحصول على رصيد بونص 100%؟',
    toggleSubtitleOn: 'بونص مطابقة إيداع 100% مفعّل',
    toggleSubtitleOff: 'الزر معطل: إيداع حقيقي عادي',
    unlockRequirement: 'قم بإيداع 250 دولار كحد أدنى لتفعيل البونص',
    selectMinButton: 'Select $250',
    liveWalletLabel: 'Live Wallet',
    bonusWalletLabel: 'Bonus Wallet: +100%',
    distributionInfo: 'تودع أموالك مباشرة في محفظة Live وسيتم إضافة 100% مطابقة في محفظة Bonus المنفصلة.',
    categoriesHeader: 'فئات البونص والشروط:',
    autoSelectedBadge: 'محدد تلقائياً حسب المبلغ',
    activeBadge: 'مفعّل',
    selectButton: 'تحديد',
    categories: {
      1: {
        name: 'فئة البداية ($250 - $499)',
        tag: 'الحد الأقصى للربح اليومي 5% • حصة الأرباح 50%',
        terms: 'الحد الأقصى للربح اليومي 5%. عند مضاعفة الرصيد مرتين (2x)، تصبح 50% من الأرباح قابلة للسحب.'
      },
      2: {
        name: 'الفئة الاحترافية ($500 - $999)',
        tag: 'الحد الأقصى للربح اليومي 10% • حصة الأرباح 60%',
        terms: 'الحد الأقصى للربح اليومي 10%. عند مضاعفة الرصيد مرتين (2x)، تصبح 60% من الأرباح قابلة للسحب.'
      },
      3: {
        name: 'فئة النخبة VIP ($1000+)',
        tag: 'الحد الأقصى للربح اليومي 20% • حصة الأرباح 70%',
        terms: 'الحد الأقصى للربح اليومي 20%. عند مضاعفة الرصيد مرتين (2x)، تصبح 70% من الأرباح قابلة للسحب.'
      }
    }
  },
  es: {
    headerLabel: 'Programa de Bono 100%',
    toggleTitle: '¿Deseas aceptar el saldo de bonificación del 100%?',
    toggleSubtitleOn: 'Bono de duplicación 100% activo',
    toggleSubtitleOff: 'Interruptor apagado: Depósito real estándar',
    unlockRequirement: 'Deposita un mínimo de $250 para desbloquear el bono',
    selectMinButton: 'Select $250',
    liveWalletLabel: 'Live Wallet',
    bonusWalletLabel: 'Bonus Wallet: +100%',
    distributionInfo: 'Los fondos depositados van directamente a su Live Wallet y un 100% equivalente se acredita en su Bonus Wallet.',
    categoriesHeader: 'Categorías de bonificación y reglas:',
    autoSelectedBadge: 'Seleccionado automáticamente',
    activeBadge: 'ACTIVO',
    selectButton: 'Seleccionar',
    categories: {
      1: {
        name: 'Categoría Inicial ($250 - $499)',
        tag: 'Límite diario 5% • 50% Reparto de ganancias',
        terms: 'Ganancia diaria limitada al 5%. Al duplicar el saldo (2x), el 50% de las ganancias se vuelve retirable.'
      },
      2: {
        name: 'Categoría Pro ($500 - $999)',
        tag: 'Límite diario 10% • 60% Reparto de ganancias',
        terms: 'Ganancia diaria limitada al 10%. Al duplicar el saldo (2x), el 60% de las ganancias se vuelve retirable.'
      },
      3: {
        name: 'Categoría Elite VIP ($1000+)',
        tag: 'Límite diario 20% • 70% Reparto de ganancias',
        terms: 'Ganancia diaria limitada al 20%. Al duplicar el saldo (2x), el 70% de las ganancias se vuelve retirable.'
      }
    }
  },
  pt: {
    headerLabel: 'Programa de Bônus 100%',
    toggleTitle: 'Deseja aceitar o saldo de bônus de 100%?',
    toggleSubtitleOn: 'Bônus de 100% de depósito ativo',
    toggleSubtitleOff: 'Desativado: Depósito real padrão',
    unlockRequirement: 'Deposite no mínimo $250 para desbloquear o bônus',
    selectMinButton: 'Select $250',
    liveWalletLabel: 'Live Wallet',
    bonusWalletLabel: 'Bonus Wallet: +100%',
    distributionInfo: 'Os fundos depositados vão direto para sua Live Wallet e 100% equivalentes serão creditados na sua Bonus Wallet.',
    categoriesHeader: 'Categorias de bônus e regras:',
    autoSelectedBadge: 'Selecionado automaticamente',
    activeBadge: 'ATIVO',
    selectButton: 'Selecionar',
    categories: {
      1: {
        name: 'Categoria Inicial ($250 - $499)',
        tag: 'Limite diário 5% • 50% Divisão de lucros',
        terms: 'Lucro diário limitado a 5%. Ao duplicar o saldo (2x), 50% dos lucros tornam-se disponíveis para saque.'
      },
      2: {
        name: 'Categoria Pro ($500 - $999)',
        tag: 'Limite diário 10% • 60% Divisão de lucros',
        terms: 'Lucro diário limitado a 10%. Ao duplicar o saldo (2x), 60% dos lucros tornam-se disponíveis para saque.'
      },
      3: {
        name: 'Categoria Elite VIP ($1000+)',
        tag: 'Limite diário 20% • 70% Divisão de lucros',
        terms: 'Lucro diário limitado a 20%. Ao duplicar o saldo (2x), 70% dos lucros tornam-se disponíveis para saque.'
      }
    }
  }
};

export interface WithdrawBonusTranslation {
  challengeTitle: string;
  challengeSubtitleUnlocked: string;
  challengeSubtitleLocked: string;
  badgeUnlocked: string;
  badgeLocked: string;
  progressTitle: string;
  progressDoubled: string;
  needMoreProfit: (remaining: string, target: string) => string;
  depositBonusBase: string;
  protectedPrincipal: string;
  unlockTarget: string;
  requiredTarget: string;
  netTradingProfit: string;
  earnedViaTrading: string;
  maxPayoutTitle: (percent: number) => string;
  ruleExplanation: (catName: string, percent: number, maxAmount: string, feePercent: number, baseAmount: string) => string;
  lockedButtonText: (percent: number, remaining: string) => string;
  unlockedButtonText: string;
  tierNames: {
    1: string;
    2: string;
    3: string;
  };
}

export const WITHDRAW_BONUS_TRANSLATIONS: Record<string, WithdrawBonusTranslation> = {
  en: {
    challengeTitle: 'Bonus 2X Doubling Challenge',
    challengeSubtitleUnlocked: 'Target achieved! Profit share unlocked',
    challengeSubtitleLocked: 'Double bonus balance through trading to unlock profit withdrawals',
    badgeUnlocked: 'UNLOCKED',
    badgeLocked: 'LOCKED',
    progressTitle: 'Challenge Target Progress',
    progressDoubled: '2x Doubled',
    needMoreProfit: (remaining, target) => `Need $${remaining} more profit via trading to reach 2x target ($${target}).`,
    depositBonusBase: 'Deposit Bonus Base',
    protectedPrincipal: 'Protected Principal',
    unlockTarget: '2x Unlock Target',
    requiredTarget: 'Required Target',
    netTradingProfit: 'Net Trading Profit',
    earnedViaTrading: 'Earned via trading',
    maxPayoutTitle: (percent) => `Max ${percent}% Payout`,
    ruleExplanation: (catName, percent, maxAmount, feePercent, baseAmount) =>
      `${catName} (${percent}% Profit Share): After challenge completion, ${percent}% ($${maxAmount}) of new profits are withdrawable, and the remaining ${feePercent}% is adjusted as platform fee. Your deposit bonus base ($${baseAmount}) remains protected in your account.`,
    lockedButtonText: (percent, remaining) => `Challenge Locked (${percent}% • Need $${remaining} more)`,
    unlockedButtonText: 'Confirm Withdrawal',
    tierNames: {
      1: 'Starter Category',
      2: 'Pro Category',
      3: 'Elite VIP Category'
    }
  },
  bn: {
    challengeTitle: 'বোনাস ২X ডাবলিং চ্যালেঞ্জ',
    challengeSubtitleUnlocked: 'টার্গেট সফল! প্রফিট শেয়ার আনলক হয়েছে',
    challengeSubtitleLocked: 'প্রফিট উইথড্র আনলক করতে বোনাস ব্যালেন্স দ্বিগুণ করুন',
    badgeUnlocked: 'আনলকড',
    badgeLocked: 'লকড',
    progressTitle: 'চ্যালেঞ্জ টার্গেট অগ্রগতি',
    progressDoubled: '২x দ্বিগুণ সম্পন্ন',
    needMoreProfit: (remaining, target) => `২x টার্গেট ($${target}) অর্জনে ট্রেডিংয়ের মাধ্যমে আরও $${remaining} প্রফিট প্রয়োজন।`,
    depositBonusBase: 'ডিপোজিট বোনাস বেস',
    protectedPrincipal: 'সুরক্ষিত মূল ফান্ড',
    unlockTarget: '২x আনলক টার্গেট',
    requiredTarget: 'প্রয়োজনীয় লক্ষ্য',
    netTradingProfit: 'নেট ট্রেডিং প্রফিট',
    earnedViaTrading: 'ট্রেডিং থেকে অর্জিত',
    maxPayoutTitle: (percent) => `সর্বোচ্চ ${percent}% পে-আউট`,
    ruleExplanation: (catName, percent, maxAmount, feePercent, baseAmount) =>
      `${catName} (${percent}% প্রফিট শেয়ার): চ্যালেঞ্জ সম্পন্ন হওয়ার পর নতুন প্রফিটের ${percent}% ($${maxAmount}) উইথড্রযোগ্য এবং অবশিষ্ট ${feePercent}% প্ল্যাটফর্ম ফি হিসেবে অ্যাডজাস্ট হবে। ডিপোজিটকৃত মূল বোনাস ফান্ড ($${baseAmount}) একাউন্টে অক্ষুণ্ণ থাকবে।`,
    lockedButtonText: (percent, remaining) => `চ্যালেঞ্জ লকড (${percent}% • আর $${remaining} বাকি)`,
    unlockedButtonText: 'Confirm Withdrawal',
    tierNames: {
      1: 'স্টার্টার ক্যাটাগরি',
      2: 'প্রো ক্যাটাগরি',
      3: 'এলিট ভিআইপি ক্যাটাগরি'
    }
  },
  hi: {
    challengeTitle: 'बोनस 2X डबलिंग चुनौती',
    challengeSubtitleUnlocked: 'लक्ष्य पूरा! लाभ हिस्सा अनलॉक हुआ',
    challengeSubtitleLocked: 'लाभ निकासी अनलॉक करने के लिए ट्रेडिंग द्वारा बोनस बैलेंस दोगुना करें',
    badgeUnlocked: 'अनलॉक',
    badgeLocked: 'लॉक',
    progressTitle: 'चुनौती लक्ष्य प्रगति',
    progressDoubled: '2x दोगुना पूर्ण',
    needMoreProfit: (remaining, target) => `2x लक्ष्य ($${target}) तक पहुंचने के लिए ट्रेडिंग द्वारा $${remaining} अतिरिक्त लाभ आवश्यक है।`,
    depositBonusBase: 'डिपॉजिट बोनस बेस',
    protectedPrincipal: 'संरक्षित मूल पूंजी',
    unlockTarget: '2x अनलॉक लक्ष्य',
    requiredTarget: 'आवश्यक लक्ष्य',
    netTradingProfit: 'शुद्ध ट्रेडिंग लाभ',
    earnedViaTrading: 'ट्रेडिंग से अर्जित',
    maxPayoutTitle: (percent) => `अधिकतम ${percent}% पेआउट`,
    ruleExplanation: (catName, percent, maxAmount, feePercent, baseAmount) =>
      `${catName} (${percent}% लाभ हिस्सा): चुनौती पूरी होने के बाद नए लाभ का ${percent}% ($${maxAmount}) निकाला जा सकता है, और शेष ${feePercent}% प्लेटफॉर्म शुल्क के रूप में समायोजित होगा। मूल बोनस फंड ($${baseAmount}) खाते में सुरक्षित रहेगा।`,
    lockedButtonText: (percent, remaining) => `चुनौती लॉक (${percent}% • $${remaining} शेष)`,
    unlockedButtonText: 'Confirm Withdrawal',
    tierNames: {
      1: 'स्टार्टर श्रेणी',
      2: 'प्रो श्रेणी',
      3: 'एलीट वीआईपी श्रेणी'
    }
  },
  ar: {
    challengeTitle: 'تحدي مضاعفة البونص 2X',
    challengeSubtitleUnlocked: 'تم تحقيق الهدف! تم فتح حصة الأرباح',
    challengeSubtitleLocked: 'ضاعف رصيد البونص عبر التداول لفتح سحب الأرباح',
    badgeUnlocked: 'مفتوح',
    badgeLocked: 'مقفل',
    progressTitle: 'التقدم نحو هدف التحدي',
    progressDoubled: 'تمت المضاعفة 2x',
    needMoreProfit: (remaining, target) => `يلزم ربح إضافي قدره $${remaining} عبر التداول للوصول إلى هدف 2x ($${target}).`,
    depositBonusBase: 'رصيد البونص الأساسي',
    protectedPrincipal: 'رأس المال المحمي',
    unlockTarget: 'هدف الفتح 2x',
    requiredTarget: 'الهدف المطلوب',
    netTradingProfit: 'صافي أرباح التداول',
    earnedViaTrading: 'مكتسب من التداول',
    maxPayoutTitle: (percent) => `الحد الأقصى للدفع ${percent}%`,
    ruleExplanation: (catName, percent, maxAmount, feePercent, baseAmount) =>
      `${catName} (حصة أرباح ${percent}%): بعد إتمام التحدي، يمكن سحب ${percent}% ($${maxAmount}) من الأرباح الجديدة، وتُعد خصم ${feePercent}% المتبقية كرسوم منصة. يبقى بونص الإيداع الأصلي ($${baseAmount}) محفوظاً في حسابك.`,
    lockedButtonText: (percent, remaining) => `التحدي مقفل (${percent}% • متبقي $${remaining})`,
    unlockedButtonText: 'Confirm Withdrawal',
    tierNames: {
      1: 'فئة البداية',
      2: 'الفئة الاحترافية',
      3: 'فئة النخبة VIP'
    }
  },
  es: {
    challengeTitle: 'Desafío de Duplicación 2X de Bono',
    challengeSubtitleUnlocked: '¡Objetivo alcanzado! Reparto de ganancias desbloqueado',
    challengeSubtitleLocked: 'Duplica el saldo de bonificación mediante operaciones para desbloquear retiros',
    badgeUnlocked: 'DESBLOQUEADO',
    badgeLocked: 'BLOQUEADO',
    progressTitle: 'Progreso del Objetivo',
    progressDoubled: '2x Duplicado',
    needMoreProfit: (remaining, target) => `Necesitas $${remaining} más de ganancia comercial para alcanzar el objetivo 2x ($${target}).`,
    depositBonusBase: 'Base de Bono de Depósito',
    protectedPrincipal: 'Principal Protegido',
    unlockTarget: 'Objetivo de Desbloqueo 2x',
    requiredTarget: 'Objetivo Requerido',
    netTradingProfit: 'Beneficio Neto de Trading',
    earnedViaTrading: 'Ganado operando',
    maxPayoutTitle: (percent) => `Pago Máx. ${percent}%`,
    ruleExplanation: (catName, percent, maxAmount, feePercent, baseAmount) =>
      `${catName} (${percent}% Reparto): Al completar el desafío, el ${percent}% ($${maxAmount}) de las nuevas ganancias es retirable y el ${feePercent}% restante se deduce como tarifa. El bono de depósito inicial ($${baseAmount}) permanece en tu cuenta.`,
    lockedButtonText: (percent, remaining) => `Desafío Bloqueado (${percent}% • Faltan $${remaining})`,
    unlockedButtonText: 'Confirm Withdrawal',
    tierNames: {
      1: 'Categoría Inicial',
      2: 'Categoría Pro',
      3: 'Categoría Elite VIP'
    }
  },
  pt: {
    challengeTitle: 'Desafio de Duplicação 2X de Bônus',
    challengeSubtitleUnlocked: 'Meta atingida! Divisão de lucros desbloqueada',
    challengeSubtitleLocked: 'Dobre o saldo de bônus operando para desbloquear saques de lucro',
    badgeUnlocked: 'DESBLOQUEADO',
    badgeLocked: 'BLOQUEADO',
    progressTitle: 'Progresso da Meta do Desafio',
    progressDoubled: '2x Dobrado',
    needMoreProfit: (remaining, target) => `Necessita de mais $${remaining} em lucros de trading para atingir a meta 2x ($${target}).`,
    depositBonusBase: 'Base do Bônus de Depósito',
    protectedPrincipal: 'Principal Protegido',
    unlockTarget: 'Meta de Desbloqueio 2x',
    requiredTarget: 'Meta Necessária',
    netTradingProfit: 'Lucro Líquido de Trading',
    earnedViaTrading: 'Ganho em operações',
    maxPayoutTitle: (percent) => `Pagamento Máx. ${percent}%`,
    ruleExplanation: (catName, percent, maxAmount, feePercent, baseAmount) =>
      `${catName} (${percent}% Divisão): Após concluir o desafio, {percent}% ($${maxAmount}) dos novos lucros podem ser sacados e os ${feePercent}% restantes são taxa da plataforma. O bônus original ($${baseAmount}) permanece protegido na conta.`,
    lockedButtonText: (percent, remaining) => `Desafio Bloqueado (${percent}% • Faltam $${remaining})`,
    unlockedButtonText: 'Confirm Withdrawal',
    tierNames: {
      1: 'Categoria Inicial',
      2: 'Categoria Pro',
      3: 'Categoria Elite VIP'
    }
  }
};
