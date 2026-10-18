export type LandingLanguageCode = 
  | 'en' // UK / International (Default)
  | 'bn' // Bangladesh (বাংলা)
  | 'hi' // India (हिन्दी)
  | 'ur' // Pakistan (اردو)
  | 'de' // Germany (Deutsch)
  | 'ar' // UAE / Arab (العربية)
  | 'es' // Spain / Latin America (Español)
  | 'fr' // France (Français)
  | 'pt' // Portugal / Brazil (Português)
  | 'zh' // China (中文)
  | 'ru' // Russia (Русский)
  | 'tr'; // Turkey (Türkçe)

export interface LandingCountryOption {
  code: LandingLanguageCode;
  countryName: string;
  nativeLangName: string;
  shortLabel: string;
  flag: string;
}

export const LANDING_SUPPORTED_LANGUAGES: LandingCountryOption[] = [
  { code: 'en', countryName: 'United Kingdom (UK)', nativeLangName: 'English (Default)', shortLabel: 'English', flag: '🇬🇧' },
  { code: 'bn', countryName: 'Bangladesh', nativeLangName: 'বাংলা', shortLabel: 'বাংলা', flag: '🇧🇩' },
  { code: 'hi', countryName: 'India', nativeLangName: 'हिन्दी', shortLabel: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ur', countryName: 'Pakistan', nativeLangName: 'اردو', shortLabel: 'اردو', flag: '🇵🇰' },
  { code: 'de', countryName: 'Germany', nativeLangName: 'Deutsch', shortLabel: 'Deutsch', flag: '🇩🇪' },
  { code: 'ar', countryName: 'United Arab Emirates / Arab', nativeLangName: 'العربية', shortLabel: 'العربية', flag: '🇦🇪' },
  { code: 'es', countryName: 'Spain / Latin America', nativeLangName: 'Español', shortLabel: 'Español', flag: '🇪🇸' },
  { code: 'fr', countryName: 'France', nativeLangName: 'Français', shortLabel: 'Français', flag: '🇫🇷' },
  { code: 'pt', countryName: 'Portugal / Brazil', nativeLangName: 'Português', shortLabel: 'Português', flag: '🇵🇹' },
  { code: 'zh', countryName: 'China', nativeLangName: '简体中文', shortLabel: '中文', flag: '🇨🇳' },
  { code: 'ru', countryName: 'Russia', nativeLangName: 'Русский', shortLabel: 'Русский', flag: '🇷🇺' },
  { code: 'tr', countryName: 'Turkey', nativeLangName: 'Türkçe', shortLabel: 'Türkçe', flag: '🇹🇷' },
];

export interface LandingTranslations {
  // Navigation
  navHome: string;
  navAbout: string;
  navBonus: string;
  navWithdrawal: string;
  navReferral: string;
  navFaq: string;
  navLeaderboard: string;
  navAboutCompany: string;
  navLogin: string;
  navRegister: string;
  selectLanguageTitle: string;

  // Hero Section
  heroPlatformTitle: string;
  hero3DTitle: string;
  heroTradingPlatform: string;
  heroHeadline: string;
  heroSubtitle: string;
  claimBonusBtn: string;
  tryDemoBtn: string;
  todayLeaderboardBtn: string;

  // Hero Cards
  card1Title: string;
  card1Subtitle: string;
  card1ExampleLabel: string;
  card1ExampleHead: string;
  card1Desc1: string;
  card1Desc2: string;
  
  card2Title: string;
  card2Subtitle: string;
  card2LiveTitle: string;
  card2LiveDesc: string;
  card2BonusTitle: string;
  card2BonusDesc: string;
  card2PolicyNote: string;
  card2Fee: string;
  card2Settlement: string;

  // Trust Badges
  trust1Title: string;
  trust1Sub: string;
  trust2Title: string;
  trust2Sub: string;
  trust3Title: string;
  trust3Sub: string;
  trust4Title: string;
  trust4Sub: string;

  // Dual Asset Section
  dualBadge: string;
  dualTitle: string;
  dualSubtitle: string;
  forexModeBadge: string;
  forexModeTitle: string;
  forexModeDesc: string;
  binaryModeBadge: string;
  binaryModeTitle: string;
  binaryModeDesc: string;

  // Network Section
  networkBadge: string;
  networkTitle: string;
  networkSubtitle: string;

  // Deposit Bonus Policy Section
  depositSecBadge: string;
  depositSecTitle: string;
  depositSecSubtitle: string;
  bonusRulesTitle: string;
  bonusRulesSub: string;
  qualifyingDepositLabel: string;
  qualifyingDepositValue: string;
  qualifyingDepositDesc: string;

  // Withdrawals Section
  withdrawalSecBadge: string;
  withdrawalSecTitle: string;
  withdrawalSecSubtitle: string;

  // Referral Section
  referralSecBadge: string;
  referralSecTitle: string;
  referralSecSubtitle: string;

  // FAQ
  faqBadge: string;
  faqTitle: string;
  faqSubtitle: string;

  // Footer
  footerDesc: string;
  footerRights: string;
  footerWarning: string;
}

export const LANDING_TRANSLATIONS: Record<LandingLanguageCode, LandingTranslations> = {
  en: {
    navHome: 'Home',
    navAbout: 'About Forex & Binary',
    navBonus: '100% Deposit Bonus',
    navWithdrawal: 'Withdrawal Policy',
    navReferral: '$25 UID Referral Reward',
    navFaq: 'FAQ',
    navLeaderboard: 'Leaderboard',
    navAboutCompany: 'About Company',
    navLogin: 'LOG IN',
    navRegister: 'REGISTER',
    selectLanguageTitle: 'Select Platform Language',

    heroPlatformTitle: 'Professional Trading Platform',
    hero3DTitle: 'FOREX & BINARY',
    heroTradingPlatform: 'TRADING PLATFORM',
    heroHeadline: '100% First Deposit Bonus for New Members',
    heroSubtitle: 'Trade Forex and Binary on one professional platform',
    claimBonusBtn: 'Claim $250 Bonus & Register',
    tryDemoBtn: 'Try $10,000 Free Demo',
    todayLeaderboardBtn: 'Today Leaderboard',

    card1Title: '100%',
    card1Subtitle: 'DEPOSIT BONUS',
    card1ExampleLabel: 'EXAMPLE:',
    card1ExampleHead: 'DEPOSIT $250, GET $250 BONUS',
    card1Desc1: 'Deposit is fully withdrawable. Bonus is non-withdrawable but can be used for trading.',
    card1Desc2: 'Supporting minimum qualifying deposit $250, seamlessly unified on one professional platform.',

    card2Title: 'Withdrawal Info',
    card2Subtitle: 'Fast 5-15 Min Processing',
    card2LiveTitle: 'LIVE ACCOUNT:',
    card2LiveDesc: 'Fully withdrawable, subject to standard platform minimums.',
    card2BonusTitle: 'BONUS ACCOUNT:',
    card2BonusDesc: 'Only profits generated from bonus trading are partially withdrawable.',
    card2PolicyNote: 'Original bonus funds are not directly withdrawable. Only 50% of the profits generated from trading with bonus funds can be withdrawn. Total profits = (Profit from deposit trade + Profit from bonus trade). Live Account funds are not restricted by this rule.',
    card2Fee: '0% Platform Fees',
    card2Settlement: '5-15 Mins Settlement',

    trust1Title: 'Regulated Standard',
    trust1Sub: 'Tier-1 Segregated Vaults',
    trust2Title: '0.0 Pip Spreads',
    trust2Sub: 'Ultra-Fast Meta Engine',
    trust3Title: '94% Binary Returns',
    trust3Sub: 'Fixed High Payouts',
    trust4Title: '$25 UID Reward',
    trust4Sub: 'Instant Referral Bonus',

    dualBadge: 'Dual Asset Architecture',
    dualTitle: 'Understanding Forex & Binary Trading',
    dualSubtitle: 'Forex Trade Pro unites two premier financial disciplines into a single high-speed execution ecosystem. Experience institutional liquidity alongside rapid fixed-time contracts.',
    forexModeBadge: 'Short-Term Scalping Mode',
    forexModeTitle: 'Short-Term Scalping & Pip Trading (A to Z)',
    forexModeDesc: 'Master high-speed scalp trading by capturing fast micro-price movements across short timeframes (5 seconds to 1 minute). Scalpers exploit rapid liquidity shifts, entering and exiting positions within seconds to lock in 1 to 5 pips.',
    binaryModeBadge: 'Binary Options Mode',
    binaryModeTitle: 'Fixed-Time High Payout Contracts',
    binaryModeDesc: 'Predict price direction within designated time windows ranging from 5 seconds to 5 minutes. Enjoy fixed payout rates up to 94% on OTC and live market instruments.',

    networkBadge: 'Worldwide Execution Grid',
    networkTitle: 'Designed to Serve Traders Worldwide',
    networkSubtitle: 'Operating redundant server clusters strategically situated across major financial nodes for minimal latency and maximum uptime reliability.',

    depositSecBadge: 'Instant Funding Ecosystem',
    depositSecTitle: 'Deposit Information & 100% Bonus Policy',
    depositSecSubtitle: 'Fund your account instantly with zero fees. New members making an initial qualifying deposit of $250 or more receive an automatic 100% cash matching bonus.',
    bonusRulesTitle: 'First Deposit 100% Matching Rules',
    bonusRulesSub: 'Official Platform Standards',
    qualifyingDepositLabel: 'QUALIFYING MINIMUM DEPOSIT:',
    qualifyingDepositValue: 'USD $250.00',
    qualifyingDepositDesc: 'To activate the 100% matching bonus, your first deposit must be at least $250. Regular deposits can start at $10.',

    withdrawalSecBadge: 'Institutional Liquidity',
    withdrawalSecTitle: 'Transparent Withdrawal Regulations',
    withdrawalSecSubtitle: 'Enjoy zero withdrawal fees and automated blockchain & e-wallet processing pipelines designed for reliable capital access.',

    referralSecBadge: 'Earn $25 Per Referral',
    referralSecTitle: '$25 UID Referral Reward Program',
    referralSecSubtitle: 'Invite friends, students, or community members using your unique UID referral link. Earn an instant $25 cash bonus when they deposit $25 or more.',

    faqBadge: 'Got Questions?',
    faqTitle: 'Frequently Asked Questions',
    faqSubtitle: 'Clear answers regarding our 100% deposit bonus, withdrawal terms, $25 UID referral rewards, and security.',

    footerDesc: 'Forex Trade Pro is an international multi-asset financial platform delivering cutting-edge execution across Forex spread trading and high-return Binary Options.',
    footerRights: '© 2026 Forex Trade Pro. All rights reserved.',
    footerWarning: 'High Risk Investment Warning: Trading Foreign Exchange (Forex) and Binary Options on margin carries a high level of risk and may not be suitable for all investors.'
  },
  bn: {
    navHome: 'হোম',
    navAbout: 'ফরেক্স ও বাইনারি পরিচিতি',
    navBonus: '১০০% ডিপোজিট বোনাস',
    navWithdrawal: 'উইথড্রয়াল নীতিমালা',
    navReferral: '$২৫ UID রেফারেল রিওয়ার্ড',
    navFaq: 'প্রশ্নোত্তর (FAQ)',
    navLeaderboard: 'লিডারবোর্ড',
    navAboutCompany: 'কোম্পানি পরিচিতি',
    navLogin: 'লগইন করুন',
    navRegister: 'রেজিস্টার করুন',
    selectLanguageTitle: 'প্ল্যাটফর্মের ভাষা পরিবর্তন করুন',

    heroPlatformTitle: 'আন্তর্জাতিক প্রফেশনাল ট্রেডিং প্ল্যাটফর্ম',
    hero3DTitle: 'FOREX & BINARY',
    heroTradingPlatform: 'TRADING PLATFORM',
    heroHeadline: 'নতুন ট্রেডারদের জন্য ১০০% ফার্স্ট ডিপোজিট বোনাস',
    heroSubtitle: 'একটি আধুনিক প্রফেশনাল প্ল্যাটফর্মে ফরেক্স ও বাইনারি ট্রেড করুন',
    claimBonusBtn: '১০০% বোনাস দাবি করুন ও রেজিস্টার করুন',
    tryDemoBtn: '$১০,০০০ ফ্রি ডেমো অ্যাকাউন্ট',
    todayLeaderboardBtn: 'আজকের লিডারবোর্ড',

    card1Title: '১০০%',
    card1Subtitle: 'ডিপোজিট বোনাস',
    card1ExampleLabel: 'উদাহরণ:',
    card1ExampleHead: 'ডিপোজিট $২৫০, বোনাস পাবেন $২৫০',
    card1Desc1: 'আপনার মূল ডিপোজিট যেকোনো সময় সম্পূর্ণ উত্তোলনযোগ্য। বোনাস ব্যালেন্স ট্রেড করার কাজে ব্যবহার করা যাবে।',
    card1Desc2: 'সর্বনিম্ন $২৫০ বা তার বেশি প্রথম ডিপোজিটে ১০০% বোনাস সক্রিয় হয়।',

    card2Title: 'উইথড্রয়াল তথ্য',
    card2Subtitle: 'দ্রুত ৫-১৫ মিনিটে প্রসেসিং',
    card2LiveTitle: 'লাইভ অ্যাকাউন্ট:',
    card2LiveDesc: 'মূল ডিপোজিট ও লাইভ ট্রেডের প্রফিট শতভাগ সরাসরি উত্তোলনযোগ্য।',
    card2BonusTitle: 'বোনাস অ্যাকাউন্ট:',
    card2BonusDesc: 'বোনাস ফান্ড ব্যবহার করে ট্রেড করে অর্জিত প্রফিটের ৫০% উত্তোলনযোগ্য।',
    card2PolicyNote: 'বোনাসের মূল ফান্ড সরাসরি উত্তোলন করা যায় না। বোনাস দিয়ে করা ট্রেডের ৫০% প্রফিট উইথড্র করা যাবে। লাইভ অ্যাকাউন্টের মূল ফান্ডের ক্ষেত্রে কোনো সীমাবদ্ধতা নেই।',
    card2Fee: '০% প্ল্যাটফর্ম ফি',
    card2Settlement: '৫-১৫ মিনিটে সেটেলমেন্ট',

    trust1Title: 'নিয়ন্ত্রিত স্ট্যান্ডার্ড',
    trust1Sub: 'টিয়ার-১ পৃথক ব্যাংক অ্যাকাউন্ট',
    trust2Title: '০.০ পিপ স্প্রেড',
    trust2Sub: 'আল্ট্রা-ফাস্ট মেটা ইঞ্জিন',
    trust3Title: '৯৪% পর্যন্ত বাইনারি রিটার্ন',
    trust3Sub: 'নির্দিষ্ট উচ্চ পে-আউট',
    trust4Title: '$২৫ UID রিওয়ার্ড',
    trust4Sub: 'তাৎক্ষণিক রেফারেল বোনাস',

    dualBadge: 'ডুয়েল অ্যাসেট আর্কিটেকচার',
    dualTitle: 'ফরেক্স এবং বাইনারি ট্রেডিং এর বিস্তারিত',
    dualSubtitle: 'Forex Trade Pro ফরেক্স ও ফিক্সড-টাইম বাইনারি অপশনকে একটি দ্রুতগতির শক্তিশালী সিস্টেমে রূপান্তর করেছে।',
    forexModeBadge: 'শর্ট-টার্ম স্ক্যাল্পিং মোড',
    forexModeTitle: 'শর্ট-টার্ম স্ক্যাল্পিং ও পিপ ট্রেডিং (A to Z)',
    forexModeDesc: '৫ সেকেন্ড থেকে ১ মিনিটের মধ্যে মাইক্রো-মুভমেন্ট ক্যাপচার করে দ্রুত প্রফিট লক করুন। আল্ট্রা-ফাস্ট স্পিডে ১ থেকে ৫ পিপস পর্যন্ত সহজে অর্জন সম্ভব।',
    binaryModeBadge: 'বাইনারি অপশন মোড',
    binaryModeTitle: 'ফিক্সড-টাইম হাই পে-আউট কন্ট্রাক্ট',
    binaryModeDesc: 'নির্দিষ্ট সময়সীমার (৫ সেকেন্ড থেকে ৫ মিনিট) মধ্যে মার্কেটের দিক অনুমান করে ৯৪% পর্যন্ত নিশ্চিত ফিক্সড প্রফিট অর্জন করুন।',

    networkBadge: 'গ্লোবাল এক্সিকিউশন নেটওয়ার্ক',
    networkTitle: 'বিশ্বব্যাপী ট্রেডারদের সেবায় নিবেদিত',
    networkSubtitle: 'সর্বোচ্চ আপটাইম ও দ্রুততম এক্সিকিউশন নিশ্চিত করতে বিশ্বজুড়ে শক্তিশালী ক্লাউড সার্ভার নিয়োজিত।',

    depositSecBadge: 'ইনস্ট্যান্ট ডিপোজিট সিস্টেম',
    depositSecTitle: 'ডিপোজিট তথ্য ও ১০০% বোনাস নীতিমালা',
    depositSecSubtitle: 'শূন্য ফি-তে তাৎক্ষণিকভাবে ফান্ড জমা করুন। নতুন মেম্বারদের প্রথম ডিপোজিটে ১০০% পর্যন্ত অতিরিক্ত বোনাস প্রদান করা হয়।',
    bonusRulesTitle: 'প্রথম ডিপোজিট ১০০% বোনাস নিয়মাবলি',
    bonusRulesSub: 'অফিসিয়াল প্ল্যাটফর্ম স্ট্যান্ডার্ড',
    qualifyingDepositLabel: 'বোনাস পেতে সর্বনিম্ন প্রথম ডিপোজিট:',
    qualifyingDepositValue: 'USD $২৫০.০০',
    qualifyingDepositDesc: '১০০% ক্যাশ ম্যাচিং বোনাস পেতে প্রথম ডিপোজিট ন্যূনতম $২৫০ হতে হবে। সাধারণ ডিপোজিট শুরু হতে পারে $১০ থেকে।',

    withdrawalSecBadge: 'আন্তর্জাতিক লিকুইডিটি',
    withdrawalSecTitle: 'স্বচ্ছ উইথড্রয়াল নীতিমালা',
    withdrawalSecSubtitle: 'কোনো হিডেন চার্জ ছাড়াই সম্পূর্ণ স্বয়ংক্রিয় প্রক্রিয়ায় ৫ থেকে ১৫ মিনিটের মধ্যে ফান্ড উত্তোলন করুন।',

    referralSecBadge: 'প্রতি রেফারেলে $২৫ আয় করুন',
    referralSecTitle: '$২৫ UID রেফারেল রিওয়ার্ড প্রোগ্রাম',
    referralSecSubtitle: 'আপনার ইউনিক UID লিংকের মাধ্যমে রেফার করুন। তারা $২৫ বা বেশি ডিপোজিট করলেই আপনি পাবেন নগদ $২৫ ইনস্ট্যান্ট বোনাস।',

    faqBadge: 'সাধারণ জিজ্ঞাসা',
    faqTitle: 'সচরাচর জিজ্ঞাসিত প্রশ্নাবলি (FAQ)',
    faqSubtitle: '১০০% বোনাস, উইথড্রয়াল শর্তাবলি, $২৫ UID রেফারেল এবং সিকিউরিটি সম্পর্কিত সমস্ত তথ্যাবলি।',

    footerDesc: 'Forex Trade Pro হলো একটি আন্তর্জাতিক মাল্টি-অ্যাসেট ফিন্যান্সিয়াল প্ল্যাটফর্ম যা ফরেক্স স্প্রেড ট্রেডিং ও হাই-রিটার্ন বাইনারি অপশন সেবা প্রদান করে।',
    footerRights: '© ২০২৬ Forex Trade Pro. সর্বস্বত্ব সংরক্ষিত।',
    footerWarning: 'উচ্চ ঝুঁকির সতর্কতা: ফরেক্স এবং বাইনারি অপশন ট্রেডিংয়ে মূলধনের ঝুঁকি রয়েছে এবং এটি সকল বিনিয়োগকারীর জন্য উপযুক্ত নাও হতে পারে।'
  },
  hi: {
    navHome: 'होम',
    navAbout: 'फॉरेक्स और बाइनरी',
    navBonus: '100% डिपॉजिट बोनस',
    navWithdrawal: 'निकासी नीति',
    navReferral: '$25 UID रेफरल इनाम',
    navFaq: 'अक्सर पूछे जाने वाले प्रश्न',
    navLeaderboard: 'लीडरबोर्ड',
    navAboutCompany: 'कंपनी के बारे में',
    navLogin: 'लॉग इन',
    navRegister: 'पंजीकरण',
    selectLanguageTitle: 'प्लेटफ़ॉर्म भाषा चुनें',

    heroPlatformTitle: 'पेशेवर ट्रेडिंग प्लेटफॉर्म',
    hero3DTitle: 'FOREX & BINARY',
    heroTradingPlatform: 'TRADING PLATFORM',
    heroHeadline: 'नए सदस्यों के लिए 100% प्रथम जमा बोनस',
    heroSubtitle: 'एक पेशेवर प्लेटफॉर्म पर फॉरेक्स और बाइनरी ट्रेड करें',
    claimBonusBtn: '$250 बोनस प्राप्त करें और रजिस्टर करें',
    tryDemoBtn: '$10,000 फ्री डेमो आज़माएं',
    todayLeaderboardBtn: 'आज का लीडरबोर्ड',

    card1Title: '100%',
    card1Subtitle: 'डिपॉजिट बोनस',
    card1ExampleLabel: 'उदाहरण:',
    card1ExampleHead: '$250 जमा करें, $250 बोनस पाएं',
    card1Desc1: 'जमा राशि पूरी तरह से निकाली जा सकती है। बोनस गैर-निकासी योग्य है लेकिन व्यापार के लिए उपयोग किया जा सकता है।',
    card1Desc2: 'न्यूनतम अर्हक जमा $250 पर 100% बोनस तुरंत सक्रिय होता है।',

    card2Title: 'निकासी जानकारी',
    card2Subtitle: 'तेज़ 5-15 मिनट में प्रोसेसिंग',
    card2LiveTitle: 'लाइव खाता:',
    card2LiveDesc: 'मानक न्यूनतम सीमाओं के अधीन पूरी तरह से निकाला जा सकता है।',
    card2BonusTitle: 'बोनस खाता:',
    card2BonusDesc: 'बोनस ट्रेडिंग से अर्जित लाभ का केवल 50% निकाला जा सकता है।',
    card2PolicyNote: 'मूल बोनस राशि सीधे निकाली नहीं जा सकती। बोनस ट्रेडिंग से प्राप्त लाभ का 50% निकाला जा सकता है। लाइव खाते के फंड पर कोई प्रतिबंध नहीं है।',
    card2Fee: '0% प्लेटफॉर्म शुल्क',
    card2Settlement: '5-15 मिनट में निपटान',

    trust1Title: 'विनियमित मानक',
    trust1Sub: 'टियर-1 अलग बैंक खाते',
    trust2Title: '0.0 पिप स्प्रेड',
    trust2Sub: 'अल्ट्रा-फास्ट इंजन',
    trust3Title: '94% बाइनरी रिटर्न',
    trust3Sub: 'निश्चित उच्च भुगतान',
    trust4Title: '$25 UID इनाम',
    trust4Sub: 'तत्काल रेफरल बोनस',

    dualBadge: 'डुअल एसेट आर्किटेक्चर',
    dualTitle: 'फॉरेक्स और बाइनरी ट्रेडिंग को समझें',
    dualSubtitle: 'Forex Trade Pro एक ही शक्तिशाली और सुरक्षित प्रणाली में दो प्रमुख वित्तीय साधनों को जोड़ता है।',
    forexModeBadge: 'शॉर्ट-टर्म स्कैल्पिंग मोड',
    forexModeTitle: 'शॉर्ट-टर्म स्कैल्पिंग और पिप ट्रेडिंग (A to Z)',
    forexModeDesc: '5 सेकंड से 1 मिनट के भीतर त्वरित मूल्य उतार-चढ़ाव को पकड़कर तेजी से लाभ अर्जित करें।',
    binaryModeBadge: 'बाइनरी ऑप्शंस मोड',
    binaryModeTitle: 'फिक्स्ड-टाइम हाई पे-आउट कॉन्ट्रैक्ट्स',
    binaryModeDesc: '5 सेकंड से 5 मिनट के भीतर मूल्य दिशा का अनुमान लगाएं और 94% तक निश्चित रिटर्न प्राप्त करें।',

    networkBadge: 'वैश्विक निष्पादन ग्रिड',
    networkTitle: 'दुनिया भर के व्यापारियों की सेवा के लिए निर्मित',
    networkSubtitle: 'न्यूनतम विलंबता और विश्वसनीयता के लिए वैश्विक स्तर पर रणनीतिक क्लाउड सर्वर।',

    depositSecBadge: 'त्वरित फंडिंग इकोसिस्टम',
    depositSecTitle: 'जमा जानकारी और 100% बोनस नीति',
    depositSecSubtitle: 'बिना किसी शुल्क के तुरंत फंड जमा करें। नए सदस्यों को पहले $250+ जमा पर 100% बोनस मिलता है।',
    bonusRulesTitle: 'प्रथम जमा 100% बोनस नियम',
    bonusRulesSub: 'आधिकारिक मानक',
    qualifyingDepositLabel: 'न्यूनतम अर्हक जमा:',
    qualifyingDepositValue: 'USD $250.00',
    qualifyingDepositDesc: '100% बोनस सक्रिय करने के लिए पहला जमा कम से कम $250 होना चाहिए। नियमित जमा $10 से शुरू हो सकता है।',

    withdrawalSecBadge: 'संस्थागत तरलता',
    withdrawalSecTitle: 'पारदर्शी निकासी नियम',
    withdrawalSecSubtitle: 'बिना किसी शुल्क के 5 से 15 मिनट में तुरंत अपनी निकासी प्राप्त करें।',

    referralSecBadge: 'प्रति रेफरल $25 कमाएं',
    referralSecTitle: '$25 UID रेफरल रिवॉर्ड प्रोग्राम',
    referralSecSubtitle: 'अपने दोस्तों को अपने UID लिंक से आमंत्रित करें। उनके $25 या अधिक जमा करने पर $25 तुरंत कमाएं।',

    faqBadge: 'सवाल हैं?',
    faqTitle: 'अक्सर पूछे जाने वाले प्रश्न',
    faqSubtitle: '100% बोनस, निकासी शर्तों, $25 UID रेफरल और सुरक्षा के संबंध में स्पष्ट उत्तर।',

    footerDesc: 'Forex Trade Pro एक अंतरराष्ट्रीय वित्तीय प्लेटफॉर्म है जो फॉरेक्स और उच्च रिटर्न बाइनरी ऑप्शंस प्रदान करता है।',
    footerRights: '© 2026 Forex Trade Pro. सभी अधिकार सुरक्षित।',
    footerWarning: 'जोखिम चेतावनी: फॉरेक्स और बाइनरी ट्रेडिंग में वित्तीय जोखिम शामिल है और यह सभी निवेशकों के लिए उपयुक्त नहीं हो सकता।'
  },
  ur: {
    navHome: 'ہوم',
    navAbout: 'فاریکس اور بائنری',
    navBonus: '100% ڈپازٹ بونس',
    navWithdrawal: 'رقم نکلوانے کی پالیسی',
    navReferral: '$25 UID ریفرل انعام',
    navFaq: 'اکثر پوچھے گئے سوالات',
    navLeaderboard: 'لیڈر بورڈ',
    navAboutCompany: 'کمپنی کا تعارف',
    navLogin: 'لاگ ان کریں',
    navRegister: 'رجسٹر کریں',
    selectLanguageTitle: 'زبان منتخب کریں',

    heroPlatformTitle: 'پیشہ ورانہ ٹریڈنگ پلیٹ فارم',
    hero3DTitle: 'FOREX & BINARY',
    heroTradingPlatform: 'TRADING PLATFORM',
    heroHeadline: 'نئے ممبرز کے لیے پہلی جمع رقم پر 100% بونس',
    heroSubtitle: 'ایک ہی جدید پلیٹ فارم پر فاریکس اور بائنری ٹریڈنگ کریں',
    claimBonusBtn: '$250 بونس حاصل کریں اور رجسٹر ہوں',
    tryDemoBtn: '$10,000 فری ڈیمو اکاؤنٹ',
    todayLeaderboardBtn: 'آج کا لیڈر بورڈ',

    card1Title: '100%',
    card1Subtitle: 'ڈپازٹ بونس',
    card1ExampleLabel: 'مثال:',
    card1ExampleHead: '$250 جمع کروائیں، $250 بونس پائیں',
    card1Desc1: 'آپ کی اصل رقم مکمل طور پر نکلوانے کے قابل ہے۔ بونس کی رقم ٹریڈنگ کے لیے استعمال کی جا سکتی ہے۔',
    card1Desc2: 'کم از کم $250 کی پہلی جمع رقم پر 100% بونس خودکار طور پر چالو ہو جاتا ہے۔',

    card2Title: 'رقم نکلوانے کی تفصیل',
    card2Subtitle: 'تیز ترین 5 تا 15 منٹ میں ادائیگی',
    card2LiveTitle: 'لائیو اکاؤنٹ:',
    card2LiveDesc: 'تمام جمع رقم اور منافع بغیر کسی پابندی کے فوراً نکلوائیں۔',
    card2BonusTitle: 'بونس اکاؤنٹ:',
    card2BonusDesc: 'بونس سے حاصل ہونے والے منافع کا 50% نکلوانے کی اجازت ہے۔',
    card2PolicyNote: 'اصل بونس رقم براہ راست نہیں نکلوائی جا سکتی۔ بونس ٹریڈنگ سے حاصل ہونے والے منافع کا 50% نکلوایا جا سکتا ہے۔ لائیو اکاؤنٹ کے فنڈز پر کوئی پابندی نہیں۔',
    card2Fee: '0% پلیٹ فارم فیس',
    card2Settlement: '5 تا 15 منٹ میں ادائیگی',

    trust1Title: 'منظم معیار',
    trust1Sub: 'ٹائر-1 محفوظ بینک اکاؤنٹس',
    trust2Title: '0.0 پِپ اسپریڈ',
    trust2Sub: 'انتہائی تیز رفتار انجن',
    trust3Title: '94% بائنری منافع',
    trust3Sub: 'مستقل اور بلند منافع',
    trust4Title: '$25 UID انعام',
    trust4Sub: 'فوری ریفرل بونس',

    dualBadge: 'ڈبل اثاثہ سسٹم',
    dualTitle: 'فاریکس اور بائنری ٹریڈنگ کی تفاصیل',
    dualSubtitle: 'Forex Trade Pro جدید رفتار اور محفوظ ترین ٹریڈنگ ایک ہی جگہ فراہم کرتا ہے۔',
    forexModeBadge: 'شارٹ ٹرم اسکیلپنگ موڈ',
    forexModeTitle: 'اسکیلپنگ اور پِپ ٹریڈنگ (A to Z)',
    forexModeDesc: '5 سیکنڈ سے 1 منٹ کے درمیان تیز رفتار قیمتوں کی نقل و حرکت سے فوری منافع کمائیں۔',
    binaryModeBadge: 'بائنری آپشنز موڈ',
    binaryModeTitle: 'مخصوص وقت کے منافع بخش معاہدے',
    binaryModeDesc: '5 سیکنڈ سے 5 منٹ کے اندر مارکیٹ کی سمت کا اندازہ لگائیں اور 94% تک منافع پائیں۔',

    networkBadge: 'عالمی ٹریڈنگ نیٹ ورک',
    networkTitle: 'پوری دنیا کے تاجروں کی خدمت کے لیے تیار',
    networkSubtitle: 'تیز ترین عمل درآمد کے لیے دنیا بھر میں جدید کلاؤڈ سرورز۔',

    depositSecBadge: 'فوری ڈپازٹ سسٹم',
    depositSecTitle: 'ڈپازٹ اور 100% بونس پالیسی',
    depositSecSubtitle: 'بغیر کسی اضافی چارجز کے فوری رقم جمع کروائیں اور 100% بونس پائیں۔',
    bonusRulesTitle: '100% بونس کے اصول',
    bonusRulesSub: 'آفیشل پلیٹ فارم معیار',
    qualifyingDepositLabel: 'بونس کے لیے کم از کم ڈپازٹ:',
    qualifyingDepositValue: 'USD $250.00',
    qualifyingDepositDesc: '100% بونس کے لیے پہلی جمع رقم کم از کم $250 ہونی چاہیے۔ عام ڈپازٹ $10 سے شروع ہو سکتا ہے۔',

    withdrawalSecBadge: 'بین الاقوامی مائعیت',
    withdrawalSecTitle: 'شفاف طریقے سے رقم نکالنے کے اصول',
    withdrawalSecSubtitle: 'کسی فیس کے بغیر 5 سے 15 منٹ میں اپنی رقم خودکار طور پر حاصل کریں۔',

    referralSecBadge: 'ہر ریفرل پر $25 کمائیں',
    referralSecTitle: '$25 UID ریفرل ریوارڈ پروگرام',
    referralSecSubtitle: 'اپنے دوستوں کو اپنے UID لنک کے ذریعے مدعو کریں۔ ان کے $25 ڈپازٹ پر آپ کو فوری $25 ملیں گے۔',

    faqBadge: 'معلومات و سوالات',
    faqTitle: 'اکثر پوچھے گئے سوالات',
    faqSubtitle: '100% بونس، رقم نکلوانے، $25 ریفرل اور سیکیورٹی سے متعلق واضح جوابات۔',

    footerDesc: 'Forex Trade Pro ایک بین الاقوامی ملٹی ایسٹ مالیاتی پلیٹ فارم ہے جو فاریکس اور بائنری آپشنز ٹریڈنگ فراہم کرتا ہے۔',
    footerRights: '© 2026 Forex Trade Pro. تمام حقوق محفوظ ہیں۔',
    footerWarning: 'وارننگ: فاریکس اور بائنری ٹریڈنگ میں مالی خطرہ شامل ہے اور یہ تمام سرمایہ کاروں کے لیے موزوں نہیں ہو سکتا۔'
  },
  de: {
    navHome: 'Startseite',
    navAbout: 'Über Forex & Binary',
    navBonus: '100% Einzahlungsbonus',
    navWithdrawal: 'Auszahlungsrichtlinien',
    navReferral: '$25 UID Empfehlungsprämie',
    navFaq: 'FAQ',
    navLeaderboard: 'Bestenliste',
    navAboutCompany: 'Über das Unternehmen',
    navLogin: 'ANMELDEN',
    navRegister: 'REGISTRIEREN',
    selectLanguageTitle: 'Plattform-Sprache wählen',

    heroPlatformTitle: 'Professionelle Handelsplattform',
    hero3DTitle: 'FOREX & BINARY',
    heroTradingPlatform: 'TRADING PLATFORM',
    heroHeadline: '100% Ersteinzahlungsbonus für Neukunden',
    heroSubtitle: 'Handeln Sie Forex und Binary auf einer professionellen Plattform',
    claimBonusBtn: '250$ Bonus sichern & Registrieren',
    tryDemoBtn: '10.000$ Kostenloses Demo-Konto',
    todayLeaderboardBtn: 'Heutige Bestenliste',

    card1Title: '100%',
    card1Subtitle: 'EINZAHLUNGSBONUS',
    card1ExampleLabel: 'BEISPIEL:',
    card1ExampleHead: '250$ EINZAHLEN, 250$ BONUS ERHALTEN',
    card1Desc1: 'Die Einzahlung kann vollständig ausgezahlt werden. Der Bonus kann für den Handel genutzt werden.',
    card1Desc2: 'Erfordert eine qualifizierte Mindesteinzahlung von 250$.',

    card2Title: 'Auszahlungsinformationen',
    card2Subtitle: 'Schnelle Bearbeitung in 5-15 Min.',
    card2LiveTitle: 'LIVE-KONTO:',
    card2LiveDesc: 'Vollständig auszahlbar gemäß den Standardmindestbeträgen.',
    card2BonusTitle: 'BONUS-KONTO:',
    card2BonusDesc: '50% der durch Bonushandel erzielten Gewinne sind auszahlbar.',
    card2PolicyNote: 'Ursprüngliche Bonusgelder können nicht direkt ausgezahlt werden. 50% der Gewinne aus Bonusgeschäften sind auszahlbar. Live-Kontogelder sind uneingeschränkt.',
    card2Fee: '0% Plattformgebühren',
    card2Settlement: '5-15 Min. Abwicklung',

    trust1Title: 'Regulierter Standard',
    trust1Sub: 'Segregierte Tier-1-Bankkonten',
    trust2Title: '0,0 Pip Spreads',
    trust2Sub: 'Ultraschnelle Meta-Engine',
    trust3Title: '94% Binäre Rendite',
    trust3Sub: 'Feste hohe Auszahlungen',
    trust4Title: '$25 UID Prämie',
    trust4Sub: 'Sofortiger Empfehlungsbonus',

    dualBadge: 'Duale Asset-Architektur',
    dualTitle: 'Forex & Binary Trading verstehen',
    dualSubtitle: 'Forex Trade Pro vereint zwei erstklassige Finanzdisziplinen in einem Hochgeschwindigkeitssystem.',
    forexModeBadge: 'Kurzfristiger Scalping-Modus',
    forexModeTitle: 'Kurzfristiges Scalping & Pip-Trading',
    forexModeDesc: 'Nutzen Sie schnelle Preisbewegungen in Zeiträumen von 5 Sekunden bis 1 Minute für sichere Gewinne.',
    binaryModeBadge: 'Binäre Optionen',
    binaryModeTitle: 'Feste Zeitauszahlungsverträge',
    binaryModeDesc: 'Prognostizieren Sie die Marktrichtung innerhalb von 5s bis 5m und erzielen Sie bis zu 94% Rendite.',

    networkBadge: 'Weltweites Ausführungsnetzwerk',
    networkTitle: 'Entwickelt für Händler weltweit',
    networkSubtitle: 'Strategisch platzierte Servercluster für minimale Latenz und maximale Verfügbarkeit.',

    depositSecBadge: 'Sofortiges Einzahlungssystem',
    depositSecTitle: 'Einzahlung & 100% Bonusrichtlinie',
    depositSecSubtitle: 'Laden Sie Ihr Konto gebührenfrei auf und sichern Sie sich 100% Bonus ab 250$.',
    bonusRulesTitle: 'Regeln für den 100% Bonus',
    bonusRulesSub: 'Offizielle Plattformstandards',
    qualifyingDepositLabel: 'QUALIFIZIERTE MINDESTEINZAHLUNG:',
    qualifyingDepositValue: 'USD $250.00',
    qualifyingDepositDesc: 'Um den 100% Bonus zu aktivieren, muss die Ersteinzahlung mindestens 250$ betragen.',

    withdrawalSecBadge: 'Institutionelle Liquidität',
    withdrawalSecTitle: 'Transparente Auszahlungsrichtlinien',
    withdrawalSecSubtitle: 'Genießen Sie gebührenfreie Auszahlungen in 5 bis 15 Minuten.',

    referralSecBadge: 'Verdienen Sie 25$ pro Empfehlung',
    referralSecTitle: '$25 UID Empfehlungsprogramm',
    referralSecSubtitle: 'Laden Sie Partner über Ihre UID ein und erhalten Sie sofort 25$ bei deren Ersteinzahlung.',

    faqBadge: 'Fragen?',
    faqTitle: 'Häufig gestellte Fragen (FAQ)',
    faqSubtitle: 'Klare Antworten zu unserem 100% Bonus, Auszahlungsbedingungen und Sicherheit.',

    footerDesc: 'Forex Trade Pro ist eine internationale Multi-Asset-Plattform für Forex und binäre Optionen.',
    footerRights: '© 2026 Forex Trade Pro. Alle Rechte vorbehalten.',
    footerWarning: 'Risikowarnung: Der Handel mit Hebelprodukten und binären Optionen birgt ein hohes Verlustrisiko.'
  },
  ar: {
    navHome: 'الرئيسية',
    navAbout: 'عن الفوركس والخيارات',
    navBonus: '100% مكافأة إيداع',
    navWithdrawal: 'سياسة السحب',
    navReferral: '25$ مكافأة الإحالة UID',
    navFaq: 'الأسئلة الشائعة',
    navLeaderboard: 'لوحة الصدارة',
    navAboutCompany: 'عن الشركة',
    navLogin: 'تسجيل الدخول',
    navRegister: 'إنشاء حساب',
    selectLanguageTitle: 'اختر لغة المنصة',

    heroPlatformTitle: 'منصة تداول احترافية',
    hero3DTitle: 'FOREX & BINARY',
    heroTradingPlatform: 'TRADING PLATFORM',
    heroHeadline: '100% مكافأة الإيداع الأول للأعضاء الجدد',
    heroSubtitle: 'تداول الفوركس والخيارات الثنائية على منصة احترافية موحدة',
    claimBonusBtn: 'احصل على مكافأة 250$ وسجل الآن',
    tryDemoBtn: 'جرب الحساب التجريبي 10,000$',
    todayLeaderboardBtn: 'لوحة الصدارة اليومية',

    card1Title: '100%',
    card1Subtitle: 'مكافأة الإيداع',
    card1ExampleLabel: 'مثال:',
    card1ExampleHead: 'أودع 250$ واحصل على 250$ بونص',
    card1Desc1: 'مبلغ الإيداع قابل للسحب بالكامل في أي وقت. البونص مخصص لزيادة حجم التداول.',
    card1Desc2: 'الحد الأدنى لتفعيل مكافأة الـ 100% هو إيداع 250$ كأول إيداع.',

    card2Title: 'معلومات السحب',
    card2Subtitle: 'تنفيذ سريع خلال 5-15 دقيقة',
    card2LiveTitle: 'الحساب الحقيقي:',
    card2LiveDesc: 'الأموال والأرباح قابلة للسحب بالكامل دون أي قيود.',
    card2BonusTitle: 'حساب البونص:',
    card2BonusDesc: 'يحق لك سحب 50% من الأرباح الناتجة عن تداول البونص.',
    card2PolicyNote: 'أموال البونص الأصلية لا يمكن سحبها مباشرة. يمكن سحب 50% من الأرباح المحققة من البونص. أموال الحساب الحقيقي لا تخضع لهذه الشروط.',
    card2Fee: '0% رسوم سحب',
    card2Settlement: 'تنفيذ خلال 5-15 دقيقة',

    trust1Title: 'معايير تنظيمية',
    trust1Sub: 'حسابات بنكية منفصلة Tier-1',
    trust2Title: '0.0 سبريد خام',
    trust2Sub: 'محرك تداول فائق السرعة',
    trust3Title: 'عائد يصل إلى 94%',
    trust3Sub: 'عقود خيارات ذات دفع ثابت',
    trust4Title: 'مكافأة 25$ UID',
    trust4Sub: 'بونص إحالة فوري',

    dualBadge: 'بنية تداول مزدوجة',
    dualTitle: 'فهم تداول الفوركس والخيارات الثنائية',
    dualSubtitle: 'تجمع منصة Forex Trade Pro بين سيولة الفوركس البنكية والخيارات الثنائية السريعة.',
    forexModeBadge: 'نمط السكالبينج السريع',
    forexModeTitle: 'السكالبينج السريع وتداول النقاط (A to Z)',
    forexModeDesc: 'استفد من تحركات الأسعار السريعة في أطر زمنية من 5 ثوانٍ إلى دقيقة واحدة.',
    binaryModeBadge: 'الخيارات الثنائية',
    binaryModeTitle: 'عقود محددة الوقت وعالية العائد',
    binaryModeDesc: 'توقع اتجاه السوق في أطر زمنية من 5 ثوانٍ إلى 5 دقائق واحصل على عائد يصل إلى 94%.',

    networkBadge: 'شبكة خوادم عالمية',
    networkTitle: 'مصممة لخدمة المتداولين حول العالم',
    networkSubtitle: 'خوادم سحابية موزعة استراتيجياً لتقليل وقت الاستجابة وضمان أعلى سرعة.',

    depositSecBadge: 'نظام إيداع فوري',
    depositSecTitle: 'معلومات الإيداع وسياسة البونص 100%',
    depositSecSubtitle: 'قم بتمويل حسابك فوراً بدون رسوم واحصل على بونص مضاعف 100% عند إيداع 250$ فأكثر.',
    bonusRulesTitle: 'شروط بونص الإيداع الأول 100%',
    bonusRulesSub: 'المعايير الرسمية للمنصة',
    qualifyingDepositLabel: 'الحد الأدنى لتفعيل البونص:',
    qualifyingDepositValue: 'USD $250.00',
    qualifyingDepositDesc: 'لتفعيل بونص 100%، يجب أن يكون الإيداع الأول 250$ على الأقل.',

    withdrawalSecBadge: 'سيولة مؤسسية',
    withdrawalSecTitle: 'لوائح السحب الشفافة',
    withdrawalSecSubtitle: 'سحب آمن وسريع خلال 5 إلى 15 دقيقة بدون أي رسوم خفية.',

    referralSecBadge: 'اربح 25$ لكل إحالة',
    referralSecTitle: 'برنامج مكافآت الإحالة 25$ UID',
    referralSecSubtitle: 'ادعُ أصدقاءك برابط UID الخاص بك، وعند إيداعهم 25$ أو أكثر ستحصل على 25$ كاش فوراً.',

    faqBadge: 'لديك استفسار؟',
    faqTitle: 'الأسئلة الشائعة (FAQ)',
    faqSubtitle: 'إجابات واضحة حول بونص 100% وشروط السحب ومكافأة الإحالة والأمان.',

    footerDesc: 'Forex Trade Pro هي منصة مالية دولية متعددة الأصول تقدم تداول الفوركس والخيارات الثنائية.',
    footerRights: '© 2026 Forex Trade Pro. جميع الحقوق محفوظة.',
    footerWarning: 'تحذير مخاطر: ينطوي تداول الفوركس والخيارات الثنائية على مخاطر عالية وقد لا يكون مناسباً لجميع المستثمرين.'
  },
  es: {
    navHome: 'Inicio',
    navAbout: 'Sobre Forex y Binarias',
    navBonus: 'Bono del 100%',
    navWithdrawal: 'Política de Retiro',
    navReferral: 'Bono de Referido $25 UID',
    navFaq: 'Preguntas Frecuentes',
    navLeaderboard: 'Clasificación',
    navAboutCompany: 'Sobre la Empresa',
    navLogin: 'INICIAR SESIÓN',
    navRegister: 'REGISTRARSE',
    selectLanguageTitle: 'Seleccionar Idioma',

    heroPlatformTitle: 'Plataforma de Trading Profesional',
    hero3DTitle: 'FOREX & BINARY',
    heroTradingPlatform: 'TRADING PLATFORM',
    heroHeadline: '100% Bono de Primer Depósito para Nuevos Miembros',
    heroSubtitle: 'Opere Forex y Opciones Binarias en una sola plataforma profesional',
    claimBonusBtn: 'Reclamar Bono de $250 y Registrarse',
    tryDemoBtn: 'Probar Demo Gratis de $10,000',
    todayLeaderboardBtn: 'Clasificación de Hoy',

    card1Title: '100%',
    card1Subtitle: 'BONO DE DEPÓSITO',
    card1ExampleLabel: 'EJEMPLO:',
    card1ExampleHead: 'DEPOSITA $250, RECIBE $250 DE BONO',
    card1Desc1: 'El depósito es 100% retirable. El bono se utiliza para aumentar el margen de trading.',
    card1Desc2: 'Requiere un depósito mínimo inicial de $250 para activar el bono del 100%.',

    card2Title: 'Información de Retiros',
    card2Subtitle: 'Procesamiento Rápido en 5-15 Min.',
    card2LiveTitle: 'CUENTA REAL:',
    card2LiveDesc: 'Totalmente retirable según los mínimos de la plataforma.',
    card2BonusTitle: 'CUENTA DE BONO:',
    card2BonusDesc: 'El 50% de las ganancias del trading con bono son retirables.',
    card2PolicyNote: 'El saldo del bono inicial no es retirable directamente. Se puede retirar el 50% de las ganancias generadas.',
    card2Fee: '0% Comisiones',
    card2Settlement: 'Liquidación en 5-15 Min.',

    trust1Title: 'Estándar Regulado',
    trust1Sub: 'Cuentas Segregadas Tier-1',
    trust2Title: 'Spreads desde 0.0 Pips',
    trust2Sub: 'Motor de Ejecución Rápido',
    trust3Title: 'Hasta 94% de Retorno',
    trust3Sub: 'Pagos Fijos en Binarias',
    trust4Title: 'Recompensa $25 UID',
    trust4Sub: 'Bono de Referidos al Instante',

    dualBadge: 'Arquitectura Dual',
    dualTitle: 'Comprender Forex y Binarias',
    dualSubtitle: 'Forex Trade Pro une la liquidez institucional con contratos binarios de alta rentabilidad.',
    forexModeBadge: 'Modo Scalping Rápido',
    forexModeTitle: 'Scalping y Operaciones por Pips',
    forexModeDesc: 'Capture micro-movimientos en gráficos de 5 segundos a 1 minuto con spreads de 0.0 pips.',
    binaryModeBadge: 'Opciones Binarias',
    binaryModeTitle: 'Contratos con Pagos Fijos',
    binaryModeDesc: 'Prediga la dirección del precio de 5s a 5m y obtenga hasta el 94% de retorno.',

    networkBadge: 'Red de Ejecución Global',
    networkTitle: 'Diseñado para Traders en Todo el Mundo',
    networkSubtitle: 'Servidores optimizados en centros financieros clave para latencia mínima.',

    depositSecBadge: 'Depósito Inmediato',
    depositSecTitle: 'Depósitos y Política de Bono 100%',
    depositSecSubtitle: 'Deposite sin comisiones y obtenga el 100% de bono desde $250.',
    bonusRulesTitle: 'Reglas del Bono del 100%',
    bonusRulesSub: 'Estándares Oficiales',
    qualifyingDepositLabel: 'DEPÓSITO MÍNIMO:',
    qualifyingDepositValue: 'USD $250.00',
    qualifyingDepositDesc: 'Para activar el 100%, el primer depósito debe ser de al menos $250.',

    withdrawalSecBadge: 'Liquidez Institucional',
    withdrawalSecTitle: 'Reglas Claras de Retiro',
    withdrawalSecSubtitle: 'Retiros automáticos en 5 a 15 minutos sin comisiones ocultas.',

    referralSecBadge: 'Gane $25 por Referido',
    referralSecTitle: 'Programa de Referidos $25 UID',
    referralSecSubtitle: 'Invite traders con su UID y gane $25 en efectivo cuando depositen $25 o más.',

    faqBadge: '¿Preguntas?',
    faqTitle: 'Preguntas Frecuentes',
    faqSubtitle: 'Respuestas sobre el bono del 100%, retiros y recompensas por recomendación.',

    footerDesc: 'Forex Trade Pro es una plataforma internacional para operaciones de Forex y Opciones Binarias.',
    footerRights: '© 2026 Forex Trade Pro. Todos los derechos reservados.',
    footerWarning: 'Advertencia de Riesgo: El trading con apalancamiento y opciones binarias conlleva un alto nivel de riesgo.'
  },
  fr: {
    navHome: 'Accueil',
    navAbout: 'À propos de Forex & Binaire',
    navBonus: 'Bonus de Dépôt 100%',
    navWithdrawal: 'Politique de Retrait',
    navReferral: 'Récompense Parrainage $25 UID',
    navFaq: 'FAQ',
    navLeaderboard: 'Classement',
    navAboutCompany: 'À propos de l\'Entreprise',
    navLogin: 'CONNEXION',
    navRegister: 'S\'INSCRIRE',
    selectLanguageTitle: 'Choisir la Langue',

    heroPlatformTitle: 'Plateforme de Trading Professionnelle',
    hero3DTitle: 'FOREX & BINARY',
    heroTradingPlatform: 'TRADING PLATFORM',
    heroHeadline: 'Bonus de 100% sur Premier Dépôt pour Nouveaux Membres',
    heroSubtitle: 'Négociez le Forex et les Options Binaires sur une plateforme professionnelle unique',
    claimBonusBtn: 'Réclamer Bonus $250 et S\'inscrire',
    tryDemoBtn: 'Tester la Démo Gratuite de $10,000',
    todayLeaderboardBtn: 'Classement du Jour',

    card1Title: '100%',
    card1Subtitle: 'BONUS DE DÉPÔT',
    card1ExampleLabel: 'EXEMPLE :',
    card1ExampleHead: 'DÉPOSEZ 250$, RECEVEZ 250$ DE BONUS',
    card1Desc1: 'Le dépôt initial est 100% retirable. Le bonus est dédié à augmenter la marge de trading.',
    card1Desc2: 'Dépôt initial minimum éligible de 250$ pour débloquer les 100% de bonus.',

    card2Title: 'Infos Retrait',
    card2Subtitle: 'Traitement Rapide en 5-15 Min.',
    card2LiveTitle: 'COMPTE RÉEL :',
    card2LiveDesc: 'Entièrement retirable selon les limites standards de la plateforme.',
    card2BonusTitle: 'COMPTE BONUS :',
    card2BonusDesc: '50% des profits générés par le bonus sont retirables.',
    card2PolicyNote: 'Le bonus initial n\'est pas directement retirable. 50% des gains issus du trading avec bonus sont retirables sans restriction.',
    card2Fee: '0% de Frais',
    card2Settlement: 'Règlement en 5-15 Min.',

    trust1Title: 'Standard Régulé',
    trust1Sub: 'Comptes Ségrégués Tier-1',
    trust2Title: 'Spreads 0.0 Pip',
    trust2Sub: 'Moteur d\'Exécution Ultra-Rapide',
    trust3Title: '94% de Rendement Binaire',
    trust3Sub: 'Paiements Fixes Élevés',
    trust4Title: 'Prime $25 UID',
    trust4Sub: 'Bonus Parrainage Immédiat',

    dualBadge: 'Architecture Double Actif',
    dualTitle: 'Comprendre le Forex et le Binaire',
    dualSubtitle: 'Forex Trade Pro réunit la liquidité bancaire et la rapidité des contrats à durée déterminée.',
    forexModeBadge: 'Mode Scalping Rapide',
    forexModeTitle: 'Scalping Court Terme & Pip Trading',
    forexModeDesc: 'Capturez les micro-mouvements en 5s à 1m avec une exécution ultra-rapide.',
    binaryModeBadge: 'Options Binaires',
    binaryModeTitle: 'Contrats à Rendement Fixe Élevé',
    binaryModeDesc: 'Prédisez la direction du marché en 5s à 5m pour des rendements allant jusqu\'à 94%.',

    networkBadge: 'Réseau Mondial',
    networkTitle: 'Conçu pour les Traders du Monde Entier',
    networkSubtitle: 'Clusters de serveurs stratégiques pour une latence minimale.',

    depositSecBadge: 'Dépôt Instantané',
    depositSecTitle: 'Dépôt & Politique de Bonus 100%',
    depositSecSubtitle: 'Alimentez votre compte sans frais et profitez de 100% de bonus dès 250$.',
    bonusRulesTitle: 'Règles du Bonus 100%',
    bonusRulesSub: 'Normes Officielles',
    qualifyingDepositLabel: 'DÉPÔT MINIMUM ÉLIGIBLE :',
    qualifyingDepositValue: 'USD $250.00',
    qualifyingDepositDesc: 'Le premier dépôt doit être d\'au moins 250$ pour activer le bonus.',

    withdrawalSecBadge: 'Liquidité Institutionnelle',
    withdrawalSecTitle: 'Règlement de Retrait Transparent',
    withdrawalSecSubtitle: 'Retraits automatisés en 5 à 15 minutes sans frais cachés.',

    referralSecBadge: 'Gagnez 25$ par Filleul',
    referralSecTitle: 'Programme de Parrainage $25 UID',
    referralSecSubtitle: 'Invitez vos proches avec votre UID et recevez 25$ lorsqu\'ils déposent 25$ ou plus.',

    faqBadge: 'Questions ?',
    faqTitle: 'Foire Aux Questions (FAQ)',
    faqSubtitle: 'Réponses claires sur le bonus 100%, les retraits et les primes de parrainage.',

    footerDesc: 'Forex Trade Pro est une plateforme financière multi-actifs proposant le Forex et les options binaires.',
    footerRights: '© 2026 Forex Trade Pro. Tous droits réservés.',
    footerWarning: 'Avertissement sur les Risques : Le trading de devises et d\'options comporte un niveau de risque élevé.'
  },
  pt: {
    navHome: 'Início',
    navAbout: 'Sobre Forex & Binárias',
    navBonus: 'Bônus de 100%',
    navWithdrawal: 'Política de Saque',
    navReferral: 'Bônus de Indicação $25 UID',
    navFaq: 'Perguntas Frequentes',
    navLeaderboard: 'Classificação',
    navAboutCompany: 'Sobre a Empresa',
    navLogin: 'ENTRAR',
    navRegister: 'REGISTRAR',
    selectLanguageTitle: 'Selecione o Idioma',

    heroPlatformTitle: 'Plataforma de Trading Profissional',
    hero3DTitle: 'FOREX & BINARY',
    heroTradingPlatform: 'TRADING PLATFORM',
    heroHeadline: 'Bônus de 100% no Primeiro Depósito para Novos Membros',
    heroSubtitle: 'Negocie Forex e Opções Binárias em uma plataforma profissional unificada',
    claimBonusBtn: 'Resgatar Bônus de $250 e Registrar',
    tryDemoBtn: 'Testar Demo Gratuita de $10.000',
    todayLeaderboardBtn: 'Classificação de Hoje',

    card1Title: '100%',
    card1Subtitle: 'BÔNUS DE DEPÓSITO',
    card1ExampleLabel: 'EXEMPLO:',
    card1ExampleHead: 'DEPOSITE $250, RECEBA $250 DE BÔNUS',
    card1Desc1: 'O depósito é totalmente retirável. O bônus pode ser utilizado para negociação.',
    card1Desc2: 'Depósito mínimo de qualificação de $250 para ativar o bônus.',

    card2Title: 'Informações de Saque',
    card2Subtitle: 'Processamento Rápido em 5-15 Minutos',
    card2LiveTitle: 'CONTA REAL:',
    card2LiveDesc: 'Totalmente retirável de acordo com os limites da plataforma.',
    card2BonusTitle: 'CONTA BÔNUS:',
    card2BonusDesc: '50% dos lucros obtidos com o bônus podem ser sacados.',
    card2PolicyNote: 'O bônus inicial não pode ser sacado diretamente. 50% do lucro obtido com o bônus é liberado para saque.',
    card2Fee: '0% de Taxas',
    card2Settlement: 'Liquidação em 5-15 Min.',

    trust1Title: 'Padrão Regulamentado',
    trust1Sub: 'Contas Segregadas Tier-1',
    trust2Title: 'Spreads de 0.0 Pips',
    trust2Sub: 'Motor de Execução Rápido',
    trust3Title: 'Até 94% de Retorno',
    trust3Sub: 'Pagamentos Fixos Elevados',
    trust4Title: 'Recompensa $25 UID',
    trust4Sub: 'Bônus de Indicação Instantâneo',

    dualBadge: 'Arquitetura Dupla',
    dualTitle: 'Entendendo Forex & Binárias',
    dualSubtitle: 'A Forex Trade Pro reúne liquidez institucional e contratos rápidos de tempo fixo.',
    forexModeBadge: 'Modo Scalping Rápido',
    forexModeTitle: 'Scalping e Trading de Pips',
    forexModeDesc: 'Capture micro-movimentos rápidos em gráficos de 5s a 1m com spreads mínimos.',
    binaryModeBadge: 'Opções Binárias',
    binaryModeTitle: 'Contratos de Pagamento Fixo',
    binaryModeDesc: 'Preveja a direção dos preços em prazos de 5s a 5m e ganhe até 94% de retorno.',

    networkBadge: 'Rede Global de Execução',
    networkTitle: 'Projetado para Traders em Todo o Mundo',
    networkSubtitle: 'Servidores dedicados nos principais centros financeiros.',

    depositSecBadge: 'Depósito Instantâneo',
    depositSecTitle: 'Depósitos e Política de Bônus 100%',
    depositSecSubtitle: 'Deposite sem taxas e garanta 100% de bônus a partir de $250.',
    bonusRulesTitle: 'Regras do Bônus de 100%',
    bonusRulesSub: 'Padrões Oficiais',
    qualifyingDepositLabel: 'DEPÓSITO MÍNIMO:',
    qualifyingDepositValue: 'USD $250.00',
    qualifyingDepositDesc: 'O primeiro depósito deve ser de pelo menos $250 para ativar o bônus de 100%.',

    withdrawalSecBadge: 'Liquidez Institucional',
    withdrawalSecTitle: 'Regras Transparentes de Saque',
    withdrawalSecSubtitle: 'Saques automáticos em 5 a 15 minutos sem taxas ocultas.',

    referralSecBadge: 'Ganhe $25 por Indicação',
    referralSecTitle: 'Programa de Indicação $25 UID',
    referralSecSubtitle: 'Convide amigos com seu UID e receba $25 quando eles depositarem $25 ou mais.',

    faqBadge: 'Dúvidas?',
    faqTitle: 'Perguntas Frequentes',
    faqSubtitle: 'Respostas sobre o bônus de 100%, regras de saque e programa de indicações.',

    footerDesc: 'A Forex Trade Pro é uma plataforma financeira de múltiplos ativos para Forex e Opções Binárias.',
    footerRights: '© 2026 Forex Trade Pro. Todos os direitos reservados.',
    footerWarning: 'Aviso de Risco: A negociação de Forex e Opções Binárias envolve alto risco de capital.'
  },
  zh: {
    navHome: '首页',
    navAbout: '关于外汇与二元期权',
    navBonus: '100% 充值赠金',
    navWithdrawal: '提现政策',
    navReferral: '$25 UID 邀请奖励',
    navFaq: '常见问题',
    navLeaderboard: '排行榜',
    navAboutCompany: '关于公司',
    navLogin: '登录',
    navRegister: '注册',
    selectLanguageTitle: '选择平台语言',

    heroPlatformTitle: '专业金融交易平台',
    hero3DTitle: 'FOREX & BINARY',
    heroTradingPlatform: 'TRADING PLATFORM',
    heroHeadline: '新会员首充 100% 现金赠金',
    heroSubtitle: '在一个专业平台上同时交易外汇与二元期权',
    claimBonusBtn: '领取 $250 赠金并注册',
    tryDemoBtn: '体验 $10,000 免费模拟账户',
    todayLeaderboardBtn: '今日排行榜',

    card1Title: '100%',
    card1Subtitle: '充值赠金',
    card1ExampleLabel: '示例：',
    card1ExampleHead: '充值 $250，赠送 $250 赠金',
    card1Desc1: '本金可全额自由提现。赠金可用于交易增加仓位。',
    card1Desc2: '首充最低 $250 即可自动激活 100% 匹配赠金。',

    card2Title: '提现说明',
    card2Subtitle: '5-15 分钟极速到账',
    card2LiveTitle: '真实账户：',
    card2LiveDesc: '本金及交易利润全额自由提现。',
    card2BonusTitle: '赠金账户：',
    card2BonusDesc: '使用赠金交易获得的利润可提现 50%。',
    card2PolicyNote: '赠金本金不可直接提现。赠金交易产生利润的 50% 可直接申请提现。真实账户资金不受此限制。',
    card2Fee: '0% 平台手续费',
    card2Settlement: '5-15 分钟快速结算',

    trust1Title: '监管合规标准',
    trust1Sub: '一级银行隔离账户',
    trust2Title: '0.0 点差',
    trust2Sub: '超高速撮合引擎',
    trust3Title: '高达 94% 期权收益',
    trust3Sub: '固定高额回报',
    trust4Title: '$25 UID 奖励',
    trust4Sub: '即时邀请奖金',

    dualBadge: '双重资产架构',
    dualTitle: '了解外汇与二元期权交易',
    dualSubtitle: 'Forex Trade Pro 将银行级外汇流动性与高收益固定时间期权融为一体。',
    forexModeBadge: '短线超短线剥头皮',
    forexModeTitle: '超短线与点差交易 (A 到 Z)',
    forexModeDesc: '在 5 秒至 1 分钟周期内捕捉快速微小波动，锁定稳定点差利润。',
    binaryModeBadge: '二元期权模式',
    binaryModeTitle: '固定时间高收益合约',
    binaryModeDesc: '预测 5 秒至 5 分钟内的走势，享受高达 94% 的固定收益率。',

    networkBadge: '全球撮合网络',
    networkTitle: '服务全球交易者',
    networkSubtitle: '在全球核心金融节点部署分布式集群，确保超低延迟与极速执行。',

    depositSecBadge: '即时入金系统',
    depositSecTitle: '充值信息与 100% 赠金政策',
    depositSecSubtitle: '零手续费即时充值，首次充值 $250 以上尊享 100% 现金赠金。',
    bonusRulesTitle: '首充 100% 赠金规则',
    bonusRulesSub: '官方平台标准',
    qualifyingDepositLabel: '首充达标最低金额：',
    qualifyingDepositValue: 'USD $250.00',
    qualifyingDepositDesc: '激活 100% 赠金首充需至少 $250，普通充值最低 $10 起。',

    withdrawalSecBadge: '机构级流动性',
    withdrawalSecTitle: '透明提现政策',
    withdrawalSecSubtitle: '5-15 分钟自动化处理，零隐藏费用。',

    referralSecBadge: '每位邀请赚取 $25',
    referralSecTitle: '$25 UID 邀请奖励计划',
    referralSecSubtitle: '通过您的 UID 链接邀请好友，当好友充值 $25 及以上时，您立得 $25 现金奖励。',

    faqBadge: '常见疑问',
    faqTitle: '常见问题解答 (FAQ)',
    faqSubtitle: '关于 100% 赠金、提现条款、$25 UID 奖励与账户安全的权威解答。',

    footerDesc: 'Forex Trade Pro 是一家国际多资产金融平台，提供外汇点差及高回报二元期权交易。',
    footerRights: '© 2026 Forex Trade Pro. 版权所有。',
    footerWarning: '风险提示：外汇与二元期权保证金交易具有高风险，可能并不适合所有投资者。'
  },
  ru: {
    navHome: 'Главная',
    navAbout: 'О Форекс и Опционах',
    navBonus: '100% Бонус на депозит',
    navWithdrawal: 'Правила вывода',
    navReferral: '$25 UID Реферальная награда',
    navFaq: 'FAQ',
    navLeaderboard: 'Таблица лидеров',
    navAboutCompany: 'О компании',
    navLogin: 'ВОЙТИ',
    navRegister: 'РЕГИСТРАЦИЯ',
    selectLanguageTitle: 'Выберите язык',

    heroPlatformTitle: 'Профессиональная торговая платформа',
    hero3DTitle: 'FOREX & BINARY',
    heroTradingPlatform: 'TRADING PLATFORM',
    heroHeadline: '100% Бонус на первый депозит для новых участников',
    heroSubtitle: 'Торгуйте Форекс и Бинарными опционами на единой платформе',
    claimBonusBtn: 'Получить бонус $250 и зарегистрироваться',
    tryDemoBtn: 'Демо-счет на $10,000 бесплатно',
    todayLeaderboardBtn: 'Таблица лидеров',

    card1Title: '100%',
    card1Subtitle: 'ДЕПОЗИТНЫЙ БОНУС',
    card1ExampleLabel: 'ПРИМЕР:',
    card1ExampleHead: 'ПОПОЛНИТЕ $250, ПОЛУЧИТЕ $250 БОНУСА',
    card1Desc1: 'Депозит полностью доступен для вывода. Бонус используется для увеличения торговой маржи.',
    card1Desc2: 'Минимальный квалификационный депозит $250 для активации бонуса 100%.',

    card2Title: 'Информация о выводе',
    card2Subtitle: 'Быстрая обработка за 5-15 минут',
    card2LiveTitle: 'РЕАЛЬНЫЙ СЧЕТ:',
    card2LiveDesc: 'Полностью доступен для вывода без ограничений.',
    card2BonusTitle: 'БОНУСНЫЙ СЧЕТ:',
    card2BonusDesc: '50% прибыли, полученной от торговли бонусом, доступны к выводу.',
    card2PolicyNote: 'Сумма бонуса не выводится напрямую. Вы можете вывести 50% чистой прибыли, полученной от торговли на бонус.',
    card2Fee: '0% комиссий',
    card2Settlement: 'Выплата за 5-15 минут',

    trust1Title: 'Регулируемый стандарт',
    trust1Sub: 'Сегрегированные банковские счета',
    trust2Title: 'Спреды от 0.0 пунктов',
    trust2Sub: 'Сверхбыстрое исполнение',
    trust3Title: 'До 94% выплат по опционам',
    trust3Sub: 'Фиксированные высокие выплаты',
    trust4Title: 'Награда $25 UID',
    trust4Sub: 'Мгновенный реферальный бонус',

    dualBadge: 'Двойная торговая архитектура',
    dualTitle: 'Все о Форекс и Бинарных опционах',
    dualSubtitle: 'Forex Trade Pro объединяет межбанковскую ликвидность и быстрые контракты с фиксированным временем.',
    forexModeBadge: 'Режим скальпинга',
    forexModeTitle: 'Скальпинг и пипсовка (от A до Z)',
    forexModeDesc: 'Фиксируйте микро-движения цен на таймфреймах от 5 секунд до 1 минуты с ультранизким спредом.',
    binaryModeBadge: 'Бинарные опционы',
    binaryModeTitle: 'Контракты с фиксированной выплатой',
    binaryModeDesc: 'Прогнозируйте направление рынка на время от 5 секунд до 5 минут с доходностью до 94%.',

    networkBadge: 'Глобальная сеть исполнения',
    networkTitle: 'Создано для трейдеров по всему миру',
    networkSubtitle: 'Высокоскоростные серверные кластеры для минимальной задержки.',

    depositSecBadge: 'Мгновенное пополнение',
    depositSecTitle: 'Пополнение и правила бонуса 100%',
    depositSecSubtitle: 'Пополняйте баланс без комиссий и получайте 100% бонус от $250.',
    bonusRulesTitle: 'Правила бонуса 100%',
    bonusRulesSub: 'Официальные стандарты',
    qualifyingDepositLabel: 'МИНИМАЛЬНЫЙ ДЕПОЗИТ:',
    qualifyingDepositValue: 'USD $250.00',
    qualifyingDepositDesc: 'Для активации бонуса 100% первый депозит должен составлять от $250.',

    withdrawalSecBadge: 'Институциональная ликвидность',
    withdrawalSecTitle: 'Прозрачные правила вывода',
    withdrawalSecSubtitle: 'Автоматизированный вывод средств за 5-15 минут без скрытых комиссий.',

    referralSecBadge: 'Зарабатывайте $25 за реферала',
    referralSecTitle: 'Реферальная программа $25 UID',
    referralSecSubtitle: 'Приглашайте друзей по вашей UID ссылке и получайте $25, когда они внесут $25 и более.',

    faqBadge: 'Есть вопросы?',
    faqTitle: 'Часто задаваемые вопросы (FAQ)',
    faqSubtitle: 'Четкие ответы о бонусе 100%, выводе средств и реферальной системе.',

    footerDesc: 'Forex Trade Pro — международная мультирыночная платформа для торговли на Форекс и опционах.',
    footerRights: '© 2026 Forex Trade Pro. Все права защищены.',
    footerWarning: 'Предупреждение о рисках: Торговля с кредитным плечом и опционами связана с высоким риском убытков.'
  },
  tr: {
    navHome: 'Ana Sayfa',
    navAbout: 'Forex ve İkili Opsiyon',
    navBonus: '%100 Yatırım Bonusu',
    navWithdrawal: 'Para Çekme Politikası',
    navReferral: '$25 UID Referans Ödülü',
    navFaq: 'SSS',
    navLeaderboard: 'Lider Tablosu',
    navAboutCompany: 'Şirket Hakkında',
    navLogin: 'GİRİŞ YAP',
    navRegister: 'KAYIT OL',
    selectLanguageTitle: 'Platform Dilini Seçin',

    heroPlatformTitle: 'Profesyonel İşlem Platformu',
    hero3DTitle: 'FOREX & BINARY',
    heroTradingPlatform: 'TRADING PLATFORM',
    heroHeadline: 'Yeni Üyelere İlk Yatırımda %100 Bonus',
    heroSubtitle: 'Forex ve İkili Opsiyon işlemlerini tek bir profesyonel platformda yapın',
    claimBonusBtn: '$250 Bonus Al ve Kayıt Ol',
    tryDemoBtn: '$10,000 Ücretsiz Demo Dene',
    todayLeaderboardBtn: 'Günün Liderleri',

    card1Title: '%100',
    card1Subtitle: 'YATIRIM BONUSU',
    card1ExampleLabel: 'ÖRNEK:',
    card1ExampleHead: '$250 YATIR, $250 BONUS KAZAN',
    card1Desc1: 'Ana para tamamen çekilebilir. Bonus marjin artırmak için kullanılır.',
    card1Desc2: '%100 bonusu etkinleştirmek için ilk yatırımın en az $250 olması gerekir.',

    card2Title: 'Para Çekme Bilgisi',
    card2Subtitle: '5-15 Dakikada Hızlı İşlem',
    card2LiveTitle: 'CANLI HESAP:',
    card2LiveDesc: 'Standart limitler dahilinde tamamen çekilebilir.',
    card2BonusTitle: 'BONUS HESABI:',
    card2BonusDesc: 'Bonus ile yapılan işlemlerden elde edilen kârın %50\'si çekilebilir.',
    card2PolicyNote: 'Orijinal bonus doğrudan çekilemez. Bonus işlemlerinden elde edilen kârın %50\'si çekilebilir.',
    card2Fee: '%0 Platform Komisyonu',
    card2Settlement: '5-15 Dakikada Ödeme',

    trust1Title: 'Düzenlenmiş Standart',
    trust1Sub: 'Ayrılmış Tier-1 Banka Hesapları',
    trust2Title: '0.0 Pip Spread',
    trust2Sub: 'Ultra Hızlı İşlem Motoru',
    trust3Title: '%94\'e Varan Getiri',
    trust3Sub: 'Yüksek Sabit Ödemeler',
    trust4Title: '$25 UID Ödülü',
    trust4Sub: 'Anında Referans Bonusu',

    dualBadge: 'Çift Varlık Mimarisi',
    dualTitle: 'Forex ve İkili Opsiyonları Anlamak',
    dualSubtitle: 'Forex Trade Pro kurumsal likiditeyi hızlı vadeli opsiyonlarla birleştirir.',
    forexModeBadge: 'Kısa Vadeli Scalping',
    forexModeTitle: 'Scalping ve Pip İşlemleri (A\'dan Z\'ye)',
    forexModeDesc: '5 saniyeden 1 dakikaya kadar olan zaman dilimlerinde mikro fiyat hareketlerini yakalayın.',
    binaryModeBadge: 'İkili Opsiyonlar',
    binaryModeTitle: 'Sabit Süreli Yüksek Getirili Sözleşmeler',
    binaryModeDesc: '5s ile 5dk arasında yön tahmini yapın ve %94\'e varan getiri elde edin.',

    networkBadge: 'Küresel Ağ',
    networkTitle: 'Dünya Çapındaki Yatırımcılar İçin',
    networkSubtitle: 'Minimum gecikme için stratejik finansal merkezlerde sunucular.',

    depositSecBadge: 'Anında Fonlama',
    depositSecTitle: 'Yatırım Bilgisi ve %100 Bonus',
    depositSecSubtitle: 'Komisyonsuz anında fon yatırın, $250 ve üzeri için %100 bonus kazanın.',
    bonusRulesTitle: '%100 İlk Yatırım Kuralları',
    bonusRulesSub: 'Resmi Standartlar',
    qualifyingDepositLabel: 'MİNİMUM GEÇERLİ YATIRIM:',
    qualifyingDepositValue: 'USD $250.00',
    qualifyingDepositDesc: '%100 bonusu almak için ilk yatırım en az $250 olmalıdır.',

    withdrawalSecBadge: 'Kurumsal Likidite',
    withdrawalSecTitle: 'Şeffaf Para Çekme Kuralları',
    withdrawalSecSubtitle: 'Gizli ücret olmadan 5-15 dakikada otomatik çekim.',

    referralSecBadge: 'Referans Başına $25 Kazanın',
    referralSecTitle: '$25 UID Referans Programı',
    referralSecSubtitle: 'UID linkinizle arkadaşlarınızı davet edin, $25 yatırdıklarında anında $25 nakit kazanın.',

    faqBadge: 'Sorularınız mı var?',
    faqTitle: 'Sıkça Sorulan Sorular (SSS)',
    faqSubtitle: '%100 bonus, para çekme ve referans ödülleri hakkında net yanıtlar.',

    footerDesc: 'Forex Trade Pro, Forex ve ikili opsiyon işlemleri sunan uluslararası bir finans platformudur.',
    footerRights: '© 2026 Forex Trade Pro. Tüm hakları saklıdır.',
    footerWarning: 'Risk Uyarısı: Kaldıraçlı Forex ve ikili opsiyon işlemleri yüksek sermaye kaybı riski taşır.'
  }
};
