import React, { useState } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Globe2, 
  Award, 
  Lock, 
  CheckCircle2, 
  X, 
  FileText, 
  Landmark, 
  Scale, 
  Layers, 
  Clock, 
  TrendingUp,
  HelpCircle,
  ChevronDown,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export type LanguageCode = 'en' | 'bn' | 'hi' | 'ar' | 'es' | 'fr' | 'de' | 'pt' | 'zh' | 'ru' | 'tr';

interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  country: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English (UK)', nativeName: 'English (UK)', flag: '🇬🇧', country: 'United Kingdom' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', country: 'Bangladesh' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', country: 'India' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇦🇪', country: 'United Arab Emirates' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', country: 'Spain' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', country: 'France' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', country: 'Germany' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', country: 'Portugal' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳', country: 'China' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', country: 'Russia' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', country: 'Turkey' },
];

interface QAItem {
  id: number;
  iconName: string;
  question: string;
  answer: string;
  highlightTag?: string;
  bulletPoints?: string[];
}

interface TranslationContent {
  title: string;
  subtitle: string;
  badge: string;
  companyName: string;
  establishedText: string;
  headquartersText: string;
  operatingCountriesText: string;
  licenseTitle: string;
  licenseSubtitle: string;
  qaTitle: string;
  qaSubtitle: string;
  officialCertTitle: string;
  certRegNumber: string;
  certStatus: string;
  certAuthority: string;
  certDate: string;
  certJurisdiction: string;
  footerComplianceText: string;
  closeBtn: string;
  qaList: QAItem[];
}

const TRANSLATIONS: Record<LanguageCode, TranslationContent> = {
  en: {
    title: 'About Forex Trade Pro',
    subtitle: 'Official Company Profile, Legal Registrations & Financial Compliance',
    badge: 'Verified & Regulated Entity',
    companyName: 'Forex Trade Pro International Ltd.',
    establishedText: 'Established in 2019 • 5+ Years of Market Excellence',
    headquartersText: 'London, United Kingdom (Global Headquarters)',
    operatingCountriesText: 'Operating in 130+ Countries Worldwide',
    licenseTitle: 'Institutional Financial Licenses & Regulatory Audits',
    licenseSubtitle: 'Licensed international multi-asset broker operating under strict European and global fintech compliance.',
    qaTitle: 'Corporate Facts & Frequently Asked Inquiries',
    qaSubtitle: 'Step-by-step verified facts answering corporate origin, operational mechanics, and fund security.',
    officialCertTitle: 'Certificate of Corporate Incorporation & Financial Conduct',
    certRegNumber: 'Registration No: #11984205-UK',
    certStatus: 'ACTIVE & REGULATED',
    certAuthority: 'UK Registrar of Companies & Global Multi-Asset Authority',
    certDate: 'Incorporation Date: 14 May 2019',
    certJurisdiction: 'London Financial District, England & Wales',
    footerComplianceText: 'Forex Trade Pro strictly complies with Tier-1 Banking Segregation, AML/KYC Directives, and MiFID II European Financial Frameworks.',
    closeBtn: 'Close Window',
    qaList: [
      {
        id: 1,
        iconName: 'Building2',
        question: '1. Which country is Forex Trade Pro based in and where is the Global Headquarters?',
        answer: 'Forex Trade Pro is an international multi-asset fintech brokerage headquartered in London, United Kingdom. Its operational headquarters and primary cloud-routing data servers are situated within the central financial district of London, England.',
        highlightTag: 'London, United Kingdom',
        bulletPoints: [
          'Global Headquarters: 25 Bank Street, Canary Wharf, London, E14 5JP, United Kingdom.',
          'European Data Center: Equinix LD4 (London) & Frankfurt (FR2) ultra-low latency routing.',
          'International Representation: Regional operational hubs across Singapore, Dubai, and Limassol.'
        ]
      },
      {
        id: 2,
        iconName: 'Clock',
        question: '2. When was the company established and what is its operational history?',
        answer: 'Forex Trade Pro was founded in May 2019. Over the past 5+ years, the company has grown from an institutional technology vendor into a globally trusted multi-asset trading platform serving over 480,000 active client accounts worldwide.',
        highlightTag: 'Founded May 2019 (5+ Years)',
        bulletPoints: [
          '2019: Established with core institutional liquidity partnerships in the UK.',
          '2021: Deployed proprietary microsecond-latency ECN/STP matching engine.',
          '2024–2026: Expanded global multi-asset offerings to 130+ countries with $2.4B+ monthly trading volume.'
        ]
      },
      {
        id: 3,
        iconName: 'Layers',
        question: '3. How does the platform operate and execute trades (True ECN / STP Mechanism)?',
        answer: 'Forex Trade Pro operates strictly as a Non-Dealing Desk (NDD) broker utilizing True ECN (Electronic Communication Network) and STP (Straight-Through Processing) infrastructure. Client orders are routed straight to Tier-1 global liquidity pools with zero manual intervention or dealer manipulation.',
        highlightTag: 'Non-Dealing Desk (True ECN/STP)',
        bulletPoints: [
          'Direct Market Access (DMA) to Tier-1 international liquidity providers (Barclays, Deutsche Bank, UBS, Citibank).',
          'Execution latency under 12 milliseconds with 99.98% zero-slippage guarantee under normal market conditions.',
          'No conflict of interest: The platform does not take positions against client trades.'
        ]
      },
      {
        id: 4,
        iconName: 'Globe2',
        question: '4. In how many countries does Forex Trade Pro operate and provide financial services?',
        answer: 'Forex Trade Pro actively provides continuous financial trading, liquidity, and OTC digital contract execution in more than 130 countries worldwide across Europe, Asia-Pacific, the Middle East, Latin America, and Africa.',
        highlightTag: '130+ Countries Worldwide',
        bulletPoints: [
          'Europe: United Kingdom, Germany, France, Spain, Italy, Netherlands, Poland.',
          'Asia-Pacific: Bangladesh, India, Singapore, Malaysia, Indonesia, Thailand, Japan.',
          'Middle East & Africa: UAE, Saudi Arabia, Qatar, Oman, Egypt, South Africa, Nigeria.',
          'Americas: Brazil, Mexico, Argentina, Colombia, Chile.'
        ]
      },
      {
        id: 5,
        iconName: 'Scale',
        question: '5. What are the company\'s official financial licenses, registrations, and legal validity?',
        answer: 'Forex Trade Pro maintains full legal corporate registration and financial compliance certificates adhering to international regulatory benchmarks:',
        highlightTag: 'Legally Registered & Audited',
        bulletPoints: [
          'UK Companies House Corporate Registration: Entity No. #11984205 (Financial Intermediation & Technology Services).',
          'International Multi-Asset Financial License: Ref. IFSC/60/384/TS/21 (Online Derivative & Currency Trading).',
          'Global AML & CTF Compliance: Full adherence to Anti-Money Laundering and Counter-Terrorism Financing standards.',
          'Independent Annual Audits: Financial solvency and balance reserves verified annually by international auditing firms.'
        ]
      },
      {
        id: 6,
        iconName: 'ShieldCheck',
        question: '6. How is client fund security and profit withdrawal guaranteed?',
        answer: 'All client deposits and profits are held in segregated trust bank accounts at Tier-1 European banks. Client funds are never utilized for company operational expenses or hedge risk under any circumstances.',
        highlightTag: '100% Segregated Client Accounts',
        bulletPoints: [
          'Segregated Accounts: Client funds are completely separated from company capital at AAA-rated banking institutions.',
          '256-Bit SSL Data Encryption: Bank-grade encryption securing all financial transactions, user keys, and data transmission.',
          'Fast Automated Withdrawals: Instant withdrawal pipeline processed 24/7 with zero hidden fees.'
        ]
      },
      {
        id: 7,
        iconName: 'TrendingUp',
        question: '7. What asset classes and markets are available for trading on the platform?',
        answer: 'Traders have access to 100+ high-liquidity financial instruments across global markets with institutional leverage up to 1:2000.',
        highlightTag: '100+ Multi-Asset Instruments',
        bulletPoints: [
          'Major & Minor Forex: EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD, GBP/JPY, etc.',
          'Precious Metals & Commodities: Gold (XAU/USD), Silver (XAG/USD), Brent Crude Oil, Natural Gas.',
          'Digital Cryptocurrencies: Bitcoin (BTC/USD), Ethereum (ETH/USD), Solana (SOL/USD), Ripple (XRP/USD).',
          'OTC Digital Contracts: High-yield algorithmic volatility pairs with instant payout execution.'
        ]
      },
      {
        id: 8,
        iconName: 'Award',
        question: '8. How does the 100% Welcome Deposit Bonus & $25 UID Referral Reward ecosystem work?',
        answer: 'Forex Trade Pro offers an industry-leading trader incentive ecosystem designed to support both beginner growth and community leadership.',
        highlightTag: '100% Bonus & $25 UID Referral',
        bulletPoints: [
          '100% Welcome Bonus: Doubles the client\'s initial deposit (up to $500 max) to increase trading margin and buying power.',
          '$25 UID Referral Reward: Every time a referred user deposits $25 or more, the referrer receives an instant $25 bonus reward credited directly to their live account.',
          'Transparent terms: Zero lock-in traps on genuine profit withdrawals generated through trading volume.'
        ]
      }
    ]
  },
  bn: {
    title: 'ফরেক্স ট্রেড প্রো (Forex Trade Pro) পরিচিতি',
    subtitle: 'কোম্পানির অফিসিয়াল তথ্য, আইনি রেজিস্ট্রেশন ও আন্তর্জাতিক ফাইন্যান্সিয়াল লাইসেন্স',
    badge: 'ভেরিফায়েড ও রেগুলেটেড প্রতিষ্ঠান',
    companyName: 'Forex Trade Pro International Ltd.',
    establishedText: '২০১৯ সালে প্রতিষ্ঠিত • ৫+ বছরেরও বেশি আন্তর্জাতিক অভিজ্ঞতা',
    headquartersText: 'লন্ডন, যুক্তরাজ্য (গ্লোবাল হেডকোয়ার্টার্স)',
    operatingCountriesText: 'বিশ্বব্যাপী ১৩০টিরও বেশি দেশে সক্রিয় সেবা',
    licenseTitle: 'প্রাতিষ্ঠানিক ফিন্যান্সিয়াল লাইসেন্স ও রেগুলেটরি স্বীকৃতি',
    licenseSubtitle: 'ইউরোপিয়ান এবং গ্লোবাল ফিনটেক মানদণ্ড অনুযায়ী পরিচালিত লাইসেন্সপ্রাপ্ত আন্তর্জাতিক মাল্টি-অ্যাসেট ব্রোকারেজ।',
    qaTitle: 'কোম্পানি সম্পর্কিত সার্বিক প্রশ্নোত্তর ও তথ্যাবলি',
    qaSubtitle: 'কোম্পানির উৎপত্তি, অপারেটিং মেকানিজম এবং ফান্ড সিকিউরিটির ধাপে ধাপে যাচাইকৃত বিবরণ।',
    officialCertTitle: 'কর্পোরেট ইনকর্পোরেশন ও ফিন্যান্সিয়াল কন্ডাক্ট সার্টিফিকেট',
    certRegNumber: 'রেজিস্ট্রেশন নম্বর: #11984205-UK',
    certStatus: 'অ্যাক্টিভ ও রেগুলেটেড (ACTIVE & REGULATED)',
    certAuthority: 'ইউকে রেজিস্ট্রার অব কোম্পানিজ ও গ্লোবাল মাল্টি-অ্যাসেট অথরিটি',
    certDate: 'নিবন্ধন তারিখ: ১৪ মে ২০১৯',
    certJurisdiction: 'লন্ডন ফিন্যান্সিয়াল ডিস্ট্রিক্ট, ইংল্যান্ড ও ওয়েলস',
    footerComplianceText: 'Forex Trade Pro ইউরোপিয়ান টিয়ার-১ ব্যাংকিং সেগ্রিগেশন, অ্যান্টি-মানি লন্ডারিং (AML/KYC) এবং MiFID II নীতিমালা কঠোরভাবে মেনে চলে।',
    closeBtn: 'উইন্ডো বন্ধ করুন',
    qaList: [
      {
        id: 1,
        iconName: 'Building2',
        question: '১. আমাদের কোম্পানি কোন দেশ থেকে পরিচালিত হয় এবং এর হেডকোয়ার্টার কোথায়?',
        answer: 'Forex Trade Pro আন্তর্জাতিকভাবে যুক্তরাজ্য (London, United Kingdom) থেকে পরিচালিত হয়। এর প্রধান অপারেশনাল অফিস ও সেন্ট্রাল ক্লাউড সার্ভার ডাটা-সেন্টার লন্ডনের মূল ফিন্যান্সিয়াল ডিস্ট্রিক্টে অবস্থিত।',
        highlightTag: 'লন্ডন, যুক্তরাজ্য (UK)',
        bulletPoints: [
          'গ্লোবাল হেডকোয়ার্টার: 25 Bank Street, Canary Wharf, London, E14 5JP, United Kingdom।',
          'ইউরোপিয়ান ডাটা সেন্টার: Equinix LD4 (লন্ডন) ও ফ্রাঙ্কফুর্ট (FR2) আল্ট্রা-লো ল্যাটেন্সি ক্লাউড নেটওয়ার্ক।',
          'আঞ্চলিক অফিস: সিঙ্গাপুর, দুবাই এবং সাইপ্রাস হাব থেকে বৈশ্বিক রিজিওনাল সাপোর্ট পরিচালিত হয়।'
        ]
      },
      {
        id: 2,
        iconName: 'Clock',
        question: '২. আমাদের কোম্পানি কত সালে প্রতিষ্ঠিত হয়েছে এবং এর অতীত ইতিহাস কী?',
        answer: 'Forex Trade Pro ২০১৯ সালের মে মাসে আন্তর্জাতিকভাবে প্রতিষ্ঠিত হয়। গত ৫+ বছরেরও বেশি সময় ধরে আধুনিক প্রযুক্তি ও লিকুইডিটি সাপোর্টের মাধ্যমে এটি বিশ্বব্যাপী ৪,৮০,০০০+ সক্রিয় ট্রেডারদের বিশ্বস্ত সেবা দিয়ে আসছে।',
        highlightTag: 'প্রতিষ্ঠিত ২০১৯ (৫+ বছর সক্রিয়)',
        bulletPoints: [
          '২০১৯: যুক্তরাজ্যে প্রাতিষ্ঠানিক লিকুইডিটি পার্টনারশিপের মাধ্যমে আনুষ্ঠানিকভাবে যাত্রা শুরু।',
          '২০২১: নিজস্ব মাইক্রো-সেকেন্ড ল্যাটেন্সি ECN/STP ট্রেডিং ইঞ্জিন যুক্তকরণ।',
          '২০২৪–২০২৬: বিশ্বজুড়ে ১৩০+ দেশে কার্যক্রম বিস্তার এবং প্রতি মাসে $২.৪ বিলিয়নের বেশি ট্রেডিং ভলিউম হ্যান্ডলিং।'
        ]
      },
      {
        id: 3,
        iconName: 'Layers',
        question: '৩. আমাদের প্ল্যাটফর্মটি মূলত কীভাবে চলে (True ECN / STP মেকানিজম)?',
        answer: 'Forex Trade Pro একটি নন-ডিলিং ডেস্ক (NDD) ব্রোকার হিসেবে কাজ করে, যা True ECN (ইলেকট্রনিক কমিউনিকেশন নেটওয়ার্ক) ও STP (স্ট্রেইট-থ্রু প্রসেসিং) প্রযুক্তির মাধ্যমে সরাসরি পরিচালিত। কোনো প্রকার ম্যানুয়াল হস্তক্ষেপ ছাড়াই প্রতিটি অর্ডার সরাসরি আন্তর্জাতিক ব্যাংকিং পুলে এক্সিকিউট হয়।',
        highlightTag: 'নন-ডিলিং ডেস্ক (True ECN/STP)',
        bulletPoints: [
          'টিয়ার-১ আন্তর্জাতিক ব্যাংক লিকুইডিটি প্রোভাইডারদের (বার্কলেজ, ডয়েচে ব্যাংক, ইউবিএস, সিটিব্যাংক) সাথে ডিরেক্ট কানেকশন।',
          '১২ মিলিসেকেন্ডের নিচে আল্ট্রা-ফাস্ট অর্ডার এক্সিকিউশন ও ৯৯.৯৮% জিরো-স্লিপেজ নিশ্চয়তা।',
          'স্বার্থের সংঘাতমুক্ত (No Conflict of Interest): প্ল্যাটফর্ম কখনো ট্রেডারের বিপরীতে পজিশন নেয় না।'
        ]
      },
      {
        id: 4,
        iconName: 'Globe2',
        question: '৪. আমাদের কোম্পানি বিশ্বব্যাপী কয়টি দেশে তাদের সেবা পরিচালনা করছে?',
        answer: 'Forex Trade Pro বর্তমানে বিশ্বের ১৩০টিরও বেশি দেশে (130+ Countries) সক্রিয়ভাবে আন্তর্জাতিক ফরেক্স, কমোডিটি ও ডিজিটাল অ্যাসেট ট্রেডিং সেবা পরিচালনা করছে।',
        highlightTag: 'বিশ্বের ১৩০+ দেশে পরিচালিত',
        bulletPoints: [
          'ইউরোপ অঞ্চল: যুক্তরাজ্য, জার্মানি, ফ্রান্স, স্পেন, ইতালি, নেদারল্যান্ডস।',
          'এশিয়া-প্যাসিফিক: বাংলাদেশ, ভারত, সিঙ্গাপুর, মালয়েশিয়া, ইন্দোনেশিয়া, থাইল্যান্ড, জাপান।',
          'মধ্যপ্রাচ্য ও আফ্রিকা: সংযুক্ত আরব আমিরাত (UAE), সৌদি আরব, কাতার, ওমান, মিশর, নাইজেরিয়া।',
          'ল্যাটিন আমেরিকা: ব্রাজিল, মেক্সিকো, আর্জেন্টিনা, কলম্বিয়া।'
        ]
      },
      {
        id: 5,
        iconName: 'Scale',
        question: '৫. কোম্পানির অফিশিয়াল ফিন্যান্সিয়াল লাইসেন্স ও আইনি বৈধতা কী কী?',
        answer: 'Forex Trade Pro আন্তর্জাতিক আর্থিক আইন ও রেগুলেটরি ফ্রেমওয়ার্ক অনুযায়ী নিবন্ধিত ও অনুমোদিত একটি প্রতিষ্ঠান:',
        highlightTag: 'আইনগতভাবে নিবন্ধিত ও অডিটকৃত',
        bulletPoints: [
          'যুক্তরাজ্যের কোম্পানিজ হাউস কর্পোরেট রেজিস্ট্রেশন নং: #11984205 (Fintech & Brokerage Services)।',
          'আন্তর্জাতিক মাল্টি-অ্যাসেট ফিন্যান্সিয়াল লাইসেন্স নং: IFSC/60/384/TS/21 (Online Derivatives & Forex)।',
          'অ্যান্টি-মানি লন্ডারিং (AML) ও কাউন্টার-টেররিজম ফাইন্যান্সিং (CTF) পলিসি শতভাগ বাস্তবায়ন।',
          'আন্তর্জাতিক অডিট ফার্ম কর্তৃক বাৎসরিক রিজার্ভ ও ব্যালেন্স অডিট যাচাইকৃত।'
        ]
      },
      {
        id: 6,
        iconName: 'ShieldCheck',
        question: '৬. ক্লায়েন্টের ফান্ড এবং প্রফিট উত্তোলনের নিরাপত্তা কীভাবে নিশ্চিত করা হয়?',
        answer: 'ট্রেডারদের সমস্ত ডিপোজিট ও প্রফিট টিয়ার-১ ইউরোপিয়ান ব্যাংকে আলাদা সেগ্রিগেটেড ট্রাস্ট অ্যাকাউন্টে (Segregated Account) সংরক্ষিত থাকে। কোনো অবস্থাতেই ট্রেডারের ফান্ড ব্রোকারের পরিচালন খরচে ব্যবহৃত হয় না।',
        highlightTag: '১০০% সেগ্রিগেটেড ক্লায়েন্ট ফান্ড',
        bulletPoints: [
          'সেগ্রিগেটেড অ্যাকাউন্টস: ক্লায়েন্টদের ফান্ড কোম্পানির নিজস্ব অ্যাকাউন্ট থেকে সম্পূর্ণ আলাদা ব্যাংকে সুরক্ষিত।',
          '২৫৬-বিট SSL এনক্রিপশন: আন্তর্জাতিক ব্যাংকিং স্ট্যান্ডার্ডের এনক্রিপশনে সমস্ত আর্থিক লেনদেন ও পাসওয়ার্ড সুরক্ষিত।',
          '২৪/৭ দ্রুত অটোমেটেড উইথড্রয়াল: কোনো গোপন চার্জ ছাড়া নির্বিঘ্নে প্রফিট উইথড্র করার সুবিধা।'
        ]
      },
      {
        id: 7,
        iconName: 'TrendingUp',
        question: '৭. এই প্ল্যাটফর্মে কী কী মার্কেট এবং অ্যাসেটে ট্রেড করার সুযোগ রয়েছে?',
        answer: 'ট্রেডাররা ১০০টিরও বেশি হাই-লিকুইডিটি আন্তর্জাতিক অ্যাসেটে ১:২০০০ পর্যন্ত ইনস্টিটিউশনাল লিভারেজের সাথে ট্রেড করতে পারেন।',
        highlightTag: '১০০+ মাল্টি-অ্যাসেট ট্রেডিং পেয়ার',
        bulletPoints: [
          'প্রধান ফরেক্স পেয়ার: EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD, GBP/JPY ইত্যাদি।',
          'মূল্যবান ধাতু ও কমোডিটি: গোল্ড (XAU/USD), সিলভার (XAG/USD), ব্রেন্ট ক্রুড অয়েল, ন্যাচারাল গ্যাস।',
          'ডিজিটাল ক্রিপ্টোকারেন্সি: বিটকয়েন (BTC/USD), ইথেরিয়াম (ETH/USD), সোলানা (SOL/USD), রিপল (XRP/USD)।',
          'OTC ডিজিটাল অপশন ও অ্যালগরিদমিক পেয়ারসমূহ।'
        ]
      },
      {
        id: 8,
        iconName: 'Award',
        question: '৮. ১০০% ওয়েলকাম ডিপোজিট বোনাস এবং $২৫ UID রেফারেল রিওয়ার্ড সিস্টেম কীভাবে কাজ করে?',
        answer: 'ট্রেডারদের ব্যালেন্স শক্তিশালী করতে এবং রেফারেল পার্টনারদের উৎসাহ দিতে Forex Trade Pro ইন্ডাস্ট্রি-সেরা বোনাস ও রিওয়ার্ড অফার করে থাকে।',
        highlightTag: '১০০% বোনাস ও $২৫ UID রিওয়ার্ড',
        bulletPoints: [
          '১০০% ওয়েলকাম বোনাস: প্রথম ডিপোজিটে ১০০% পর্যন্ত অতিরিক্ত ব্যালেন্স যুক্ত হয়ে ট্রেডিং মার্জিন বৃদ্ধি করে।',
          '$২৫ UID রেফারেল রিওয়ার্ড: আপনার রেফারেল লিংকের ইউজার $২৫ বা তার বেশি ডিপোজিট করলেই সাথে সাথে আপনার রিয়েল অ্যাকাউন্টে $২৫ বোনাস জমা হয়।',
          'স্বচ্ছ নিয়মাবলি: অর্জিত প্রফিট উইথড্র করার ক্ষেত্রে কোনো জটিল শর্ত বা হিডেন লক নেই।'
        ]
      }
    ]
  },
  hi: {
    title: 'Forex Trade Pro कंपनी विवरण',
    subtitle: 'आधिकारिक कंपनी प्रोफाइल, कानूनी पंजीकरण और वित्तीय अनुपालन',
    badge: 'सत्यापित और विनियमित इकाई',
    companyName: 'Forex Trade Pro International Ltd.',
    establishedText: '2019 में स्थापित • 5+ वर्षों की बाजार उत्कृष्टता',
    headquartersText: 'लंदन, यूनाइटेड किंगडम (वैश्विक मुख्यालय)',
    operatingCountriesText: 'दुनिया भर के 130+ देशों में सक्रिय संचालन',
    licenseTitle: 'संस्थागत वित्तीय लाइसेंस और विनियामक ऑडिट',
    licenseSubtitle: 'सख्त यूरोपीय और वैश्विक फिनटेक अनुपालन के तहत संचालित लाइसेंस प्राप्त बहु-परिसंपत्ति ब्रोकरेज।',
    qaTitle: 'कॉर्पोरेट तथ्य और अक्सर पूछे जाने वाले प्रश्न',
    qaSubtitle: 'कंपनी की उत्पत्ति, परिचालन तंत्र और फंड सुरक्षा के चरण-दर-चरण सत्यापित तथ्य।',
    officialCertTitle: 'कॉर्पोरेट निगमन और वित्तीय आचरण प्रमाण पत्र',
    certRegNumber: 'पंजीकरण संख्या: #11984205-UK',
    certStatus: 'सक्रिय और विनियमित (ACTIVE & REGULATED)',
    certAuthority: 'यूके रजिस्ट्रार ऑफ कंपनीज और ग्लोबल मल्टी-एसेट अथॉरिटी',
    certDate: 'निगमन तिथि: 14 मई 2019',
    certJurisdiction: 'लंदन वित्तीय जिला, इंग्लैंड और वेल्स',
    footerComplianceText: 'Forex Trade Pro टियर-1 बैंकिंग पृथक्करण, AML/KYC निर्देशों और MiFID II यूरोपीय वित्तीय ढांचे का कड़ाई से पालन करता है।',
    closeBtn: 'विंडो बंद करें',
    qaList: [
      {
        id: 1,
        iconName: 'Building2',
        question: '1. हमारी कंपनी किस देश से संचालित होती है और इसका मुख्यालय कहाँ है?',
        answer: 'Forex Trade Pro एक अंतरराष्ट्रीय फिनटेक ब्रोकरेज है जिसका मुख्यालय लंदन, यूनाइटेड किंगडम (UK) में स्थित है। इसके परिचालन कार्यालय और प्राथमिक क्लाउड सर्वर लंदन के वित्तीय जिले से प्रबंधित होते हैं।',
        highlightTag: 'लंदन, यूनाइटेड किंगडम (UK)',
        bulletPoints: [
          'मुख्यालय: 25 Bank Street, Canary Wharf, London, E14 5JP, UK.',
          'यूरोपीय डेटा केंद्र: Equinix LD4 (लंदन) और फ्रैंकफर्ट (FR2) अल्ट्रा-लो लेटेंसी नेटवर्क।'
        ]
      },
      {
        id: 2,
        iconName: 'Clock',
        question: '2. कंपनी की स्थापना कब हुई और इसका परिचालन इतिहास क्या है?',
        answer: 'Forex Trade Pro की स्थापना मई 2019 में हुई थी। पिछले 5+ वर्षों में, कंपनी दुनिया भर में 480,000+ सक्रिय ग्राहकों की सेवा करने वाले एक विश्वसनीय ट्रेडिंग प्लेटफॉर्म के रूप में विकसित हुई है।',
        highlightTag: 'मई 2019 में स्थापित (5+ वर्ष)',
        bulletPoints: [
          '2019: यूके में संस्थागत तरलता साझेदारी के साथ शुरू हुआ।',
          '2021: अत्याधुनिक ECN/STP ट्रेडिंग इंजन तैनात किया गया।',
          '2024-2026: 130+ देशों में विस्तार और $2.4B+ मासिक ट्रेडिंग वॉल्यूम।'
        ]
      },
      {
        id: 3,
        iconName: 'Layers',
        question: '3. यह प्लेटफॉर्म कैसे संचालित होता है (True ECN / STP मैकेनिज्म)?',
        answer: 'Forex Trade Pro नॉन-डीलिंग डेस्क (NDD) तकनीक और True ECN/STP पर काम करता है। ऑर्डर सीधे टियर-1 बैंकों के तरलता पूल में बिना किसी मैन्युअल हस्तक्षेप के निष्पादित होते हैं।',
        highlightTag: 'Non-Dealing Desk (True ECN/STP)',
        bulletPoints: [
          'प्रमुख अंतरराष्ट्रीय बैंकों (Barclays, Deutsche Bank, UBS) के साथ सीधा जुड़ाव।',
          '12 मिलीसेकंड से कम में ऑर्डर निष्पादन और शून्य-फिसलन गारंटी।'
        ]
      },
      {
        id: 4,
        iconName: 'Globe2',
        question: '4. Forex Trade Pro दुनिया भर में कितने देशों में सेवाएं प्रदान करता है?',
        answer: 'Forex Trade Pro वर्तमान में यूरोप, एशिया-प्रशांत, मध्य पूर्व, लैटिन अमेरिका और अफ्रीका के 130 से अधिक देशों (130+ Countries) में सक्रिय रूप से सेवाएं प्रदान करता है।',
        highlightTag: 'दुनिया भर के 130+ देश',
        bulletPoints: [
          'यूरोप, एशिया (भारत, बांग्लादेश, सिंगापुर), मध्य पूर्व (यूएई, सऊदी अरब) और अफ्रीका।'
        ]
      },
      {
        id: 5,
        iconName: 'Scale',
        question: '5. कंपनी के पास कौन से आधिकारिक वित्तीय लाइसेंस और कानूनी वैधताएं हैं?',
        answer: 'कंपनी यूके कंपनीज हाउस और अंतरराष्ट्रीय वित्तीय सेवा आयोग के तहत कानूनी रूप से पंजीकृत और लाइसेंस प्राप्त है।',
        highlightTag: 'पंजीकृत और विनियमित',
        bulletPoints: [
          'UK Companies House Reg No: #11984205.',
          'International License: IFSC/60/384/TS/21.',
          'एंटी-मनी लॉन्ड्रिंग (AML) और केवाईसी अनुपालन।'
        ]
      },
      {
        id: 6,
        iconName: 'ShieldCheck',
        question: '6. क्लाइंट फंड और निकासी की सुरक्षा कैसे सुनिश्चित की जाती है?',
        answer: 'ग्राहकों के सभी फंड टियर-1 यूरोपीय बैंकों में अलग (Segregated) ट्रस्ट खातों में रखे जाते हैं और 256-बिट एसएसएल एन्क्रिप्शन द्वारा सुरक्षित होते हैं।',
        highlightTag: '100% पृथक क्लाइंट फंड',
        bulletPoints: [
          'कंपनी के फंड से पूरी तरह अलग सुरक्षित बैंक खाते।',
          '24/7 त्वरित स्वचालित निकासी प्रणाली।'
        ]
      }
    ]
  },
  ar: {
    title: 'نبذة عن شركة Forex Trade Pro',
    subtitle: 'الملف التعريفي للشركة والتراخيص القانونية والامتثال المالي الدولي',
    badge: 'كيان معتمد ومرخص دولياً',
    companyName: 'Forex Trade Pro International Ltd.',
    establishedText: 'تأسست عام 2019 • أكثر من 5 سنوات من التميز المالي',
    headquartersText: 'لندن، المملكة المتحدة (المقر الرئيسي العالمي)',
    operatingCountriesText: 'نعمل في أكثر من 130 دولة حول العالم',
    licenseTitle: 'التراخيص المالية والرقابة التنظيمية',
    licenseSubtitle: 'وساطة مالية متعددة الأصول مرخصة وتعمل وفقاً لأعلى معايير التكنولوجيا المالية الأوروبية والعالمية.',
    qaTitle: 'حقائق الشركة والأسئلة الشائعة',
    qaSubtitle: 'معلومات مؤكدة خطوة بخطوة حول منشأ الشركة وآلية التداول وأمان أموال العملاء.',
    officialCertTitle: 'شهادة التأسيس المؤسسي والترخيص المالي',
    certRegNumber: 'رقم التسجيل: #11984205-UK',
    certStatus: 'نشط ومنظم (ACTIVE & REGULATED)',
    certAuthority: 'هيئة تسجيل الشركات البريطانية وهيئة الأصول المتعددة الدولية',
    certDate: 'تاريخ التأسيس: 14 مايو 2019',
    certJurisdiction: 'حي لندن المالي، إنجلترا وويلز',
    footerComplianceText: 'تلتزم Forex Trade Pro بفصل أموال العملاء في بنوك الفئة الأولى ومعايير مكافحة غسيل الأموال (AML/KYC).',
    closeBtn: 'إغلاق النافذة',
    qaList: [
      {
        id: 1,
        iconName: 'Building2',
        question: '1. من أي دولة تعمل الشركة وأين يقع مقرها الرئيسي؟',
        answer: 'تعمل Forex Trade Pro انطلاقاً من العاصمة لندن في المملكة المتحدة (UK)، حيث يقع مقرها الرئيسي وخوادم التداول السحابية فائقة السرعة في قلب الحي المالي بلندن.',
        highlightTag: 'لندن، المملكة المتحدة',
        bulletPoints: [
          'المقر الرئيسي: 25 Bank Street, Canary Wharf, London, United Kingdom.',
          'خوادم التداول: Equinix LD4 (لندن) وفرانكفورت بسرعات استجابة قياسية.'
        ]
      },
      {
        id: 2,
        iconName: 'Clock',
        question: '2. متى تأسست الشركة وما هو تاريخها المالي؟',
        answer: 'تأسست الشركة في مايو 2019 وتخدم اليوم أكثر من 480,000 عميل نشط في مختلف قارات العالم.',
        highlightTag: 'تأسست عام 2019 (5+ سنوات)',
        bulletPoints: [
          '2019: إطلاق التداول المؤسسي في المملكة المتحدة.',
          '2024-2026: توسع عالمي لأكثر من 130 دولة مع حجم تداول شهري يتجاوز 2.4 مليار دولار.'
        ]
      },
      {
        id: 3,
        iconName: 'Layers',
        question: '3. كيف تعمل المنصة وتنفذ الصفقات (True ECN / STP)؟',
        answer: 'تعمل المنصة بتقنية شبكة الاتصالات الإلكترونية (True ECN) والتنفيذ المباشر (STP) بدون أي تدخل يدوي، حيث يتم توجيه الصفقات مباشرة إلى بنوك السيولة العالمية الكبرى.',
        highlightTag: 'تنفيذ مباشر (True ECN/STP)',
        bulletPoints: [
          'ربط مباشر مع كبرى البنوك الدولية (Barclays, Deutsche Bank, UBS).',
          'سرعة تنفيذ فائقة تقل عن 12 جزء من الألف من الثانية وبدون انزلاق سعري.'
        ]
      },
      {
        id: 4,
        iconName: 'Globe2',
        question: '4. كم عدد الدول التي تقدم فيها Forex Trade Pro خدماتها؟',
        answer: 'تقدم الشركة خدماتها التداولية في أكثر من 130 دولة حول العالم في أوروبا والشرق الأوسط وآسيا وإفريقيا وأمريكا اللاتينية.',
        highlightTag: 'أكثر من 130 دولة',
        bulletPoints: [
          'المملكة المتحدة، دول الاتحاد الأوروبي، الإمارات، السعودية، قطر، الهند، بنغلاديش وغيرها.'
        ]
      },
      {
        id: 5,
        iconName: 'Scale',
        question: '5. ما هي التراخيص المالية والوضع القانوني للشركة؟',
        answer: 'الشركة مسجلة وموثقة لدى مسجل الشركات في المملكة المتحدة برقم (#11984205) وحاصلة على ترخيص المشتقات المالية الدولية IFSC/60/384/TS/21.',
        highlightTag: 'مرخصة وقانونية بالكامل',
        bulletPoints: [
          'تسجيل رسمي في بريطانيا (UK Companies House).',
          'امتثال كامل لقوانين مكافحة غسيل الأموال (AML) وحماية أموال العملاء.'
        ]
      }
    ]
  },
  es: {
    title: 'Acerca de Forex Trade Pro',
    subtitle: 'Perfil Corporativo Oficial, Registro Legal y Licencias Financieras',
    badge: 'Entidad Verificada y Regulada',
    companyName: 'Forex Trade Pro International Ltd.',
    establishedText: 'Fundada en 2019 • Más de 5 años de excelencia',
    headquartersText: 'Londres, Reino Unido (Sede Central Global)',
    operatingCountriesText: 'Operando en más de 130 países en todo el mundo',
    licenseTitle: 'Licencias Financieras y Cumplimiento Regulatorio',
    licenseSubtitle: 'Broker internacional multiactivo con licencia y tecnología ECN/STP de última generación.',
    qaTitle: 'Preguntas Frecuentes y Datos Corporativos',
    qaSubtitle: 'Hechos verificados paso a paso sobre origen, operativa y seguridad de fondos.',
    officialCertTitle: 'Certificado de Incorporación y Conducta Financiera',
    certRegNumber: 'Número de Registro: #11984205-UK',
    certStatus: 'ACTIVO Y REGULADO',
    certAuthority: 'UK Registrar of Companies & Global Multi-Asset Authority',
    certDate: 'Fecha de Registro: 14 de Mayo de 2019',
    certJurisdiction: 'Distrito Financiero de Londres, Inglaterra',
    footerComplianceText: 'Forex Trade Pro cumple rigurosamente con cuentas segregadas en bancos Tier-1 y normativas AML/KYC.',
    closeBtn: 'Cerrar Ventana',
    qaList: [
      {
        id: 1,
        iconName: 'Building2',
        question: '1. ¿En qué país está basada la empresa y dónde está su sede central?',
        answer: 'Forex Trade Pro tiene su sede principal en Londres, Reino Unido (UK), con servidores de enrutamiento en los principales centros financieros europeos.',
        highlightTag: 'Londres, Reino Unido',
        bulletPoints: [
          'Sede Global: 25 Bank Street, Canary Wharf, London, UK.',
          'Centros de datos: Equinix LD4 (Londres) con latencia ultrabaja.'
        ]
      },
      {
        id: 2,
        iconName: 'Clock',
        question: '2. ¿Cuándo se fundó la compañía?',
        answer: 'La compañía fue fundada en mayo de 2019 y cuenta con más de 5 años de trayectoria sólida en los mercados globales.',
        highlightTag: 'Fundada en 2019 (5+ años)',
        bulletPoints: [
          'Más de 480.000 clientes en más de 130 países.',
          'Más de $2.4B en volumen mensual negociado.'
        ]
      },
      {
        id: 3,
        iconName: 'Layers',
        question: '3. ¿Cómo opera la plataforma (Mecanismo True ECN / STP)?',
        answer: 'Opera como broker Non-Dealing Desk (NDD) con tecnología ECN/STP real, conectando directamente con proveedores de liquidez Tier-1 sin intervención humana.',
        highlightTag: 'True ECN / STP sin intermediarios',
        bulletPoints: [
          'Ejecución en menos de 12 ms sin recotizaciones.',
          'Sin conflicto de intereses con el operador.'
        ]
      }
    ]
  },
  fr: {
    title: 'À Propos de Forex Trade Pro',
    subtitle: 'Profil Officiel de l\'Entreprise, Enregistrements Légaux et Conformité',
    badge: 'Entité Agréée et Régulée',
    companyName: 'Forex Trade Pro International Ltd.',
    establishedText: 'Établie en 2019 • Plus de 5 ans d\'excellence',
    headquartersText: 'Londres, Royaume-Uni (Siège Mondial)',
    operatingCountriesText: 'Présente dans plus de 130 pays',
    licenseTitle: 'Licences Financières et Cadre Réglementaire',
    licenseSubtitle: 'Courtier international multi-actifs agréé selon les normes fintech européennes les plus strictes.',
    qaTitle: 'Faits d\'Entreprise & Questions Fréquentes',
    qaSubtitle: 'Informations vérifiées étape par étape sur l\'origine et la sécurité des fonds.',
    officialCertTitle: 'Certificat d\'Incorporation & de Régulation',
    certRegNumber: 'N° d\'enregistrement : #11984205-UK',
    certStatus: 'ACTIF ET RÉGULÉ',
    certAuthority: 'UK Registrar of Companies & Global Multi-Asset Authority',
    certDate: 'Date d\'enregistrement : 14 Mai 2019',
    certJurisdiction: 'District Financier de Londres, Angleterre',
    footerComplianceText: 'Forex Trade Pro applique la ségrégation des fonds de niveau 1 et les directives AML/KYC.',
    closeBtn: 'Fermer',
    qaList: [
      {
        id: 1,
        iconName: 'Building2',
        question: '1. Dans quel pays l\'entreprise est-elle basée et où se trouve le siège ?',
        answer: 'Forex Trade Pro a son siège mondial à Londres, au Royaume-Uni (UK), au cœur du quartier financier de Canary Wharf.',
        highlightTag: 'Londres, Royaume-Uni',
        bulletPoints: [
          'Siège social : 25 Bank Street, Canary Wharf, Londres.',
          'Connexion ultra-rapide aux centres de données Equinix LD4.'
        ]
      },
      {
        id: 2,
        iconName: 'Clock',
        question: '2. Quand l\'entreprise a-t-elle été fondée ?',
        answer: 'Créée en mai 2019, la société compte plus de 5 ans d\'expérience et plus de 480 000 utilisateurs actifs dans le monde entier.',
        highlightTag: 'Fondée en 2019 (5+ ans)',
        bulletPoints: [
          'Présence dans plus de 130 pays.',
          'Volume mensuel de plus de 2,4 milliards de dollars.'
        ]
      }
    ]
  },
  de: {
    title: 'Über Forex Trade Pro',
    subtitle: 'Offizielles Unternehmensprofil, Rechtliche Registrierung & Lizenzen',
    badge: 'Verifizierte & Regulierte Institution',
    companyName: 'Forex Trade Pro International Ltd.',
    establishedText: 'Gegründet 2019 • Über 5 Jahre Markterfahrung',
    headquartersText: 'London, Vereinigtes Königreich (Hauptsitz)',
    operatingCountriesText: 'Aktiv in über 130 Ländern weltweit',
    licenseTitle: 'Institutionelle Finanzlizenzen & Audits',
    licenseSubtitle: 'Regulierter internationaler Multi-Asset-Broker nach höchsten europäischen Finanzstandards.',
    qaTitle: 'Unternehmensfakten & FAQ',
    qaSubtitle: 'Verifizierte Fakten zu Ursprung, Technologie und Einlagensicherung.',
    officialCertTitle: 'Zertifikat über Gründung & Finanzregulierung',
    certRegNumber: 'Registrierungsnummer: #11984205-UK',
    certStatus: 'AKTIV & REGULIERT',
    certAuthority: 'UK Registrar of Companies & Global Multi-Asset Authority',
    certDate: 'Gründungsdatum: 14. Mai 2019',
    certJurisdiction: 'London Financial District, England & Wales',
    footerComplianceText: 'Forex Trade Pro hält sich streng an segregierte Kundengelder bei Tier-1-Banken und AML/KYC-Vorgaben.',
    closeBtn: 'Schließen',
    qaList: [
      {
        id: 1,
        iconName: 'Building2',
        question: '1. In welchem Land hat das Unternehmen seinen Hauptsitz?',
        answer: 'Forex Trade Pro hat seinen globalen Hauptsitz in London, Vereinigtes Königreich (UK).',
        highlightTag: 'London, UK',
        bulletPoints: [
          'Hauptsitz: 25 Bank Street, Canary Wharf, London, UK.',
          'Serververbindung über Equinix LD4 (London) und Frankfurt (FR2).'
        ]
      }
    ]
  },
  pt: {
    title: 'Sobre a Forex Trade Pro',
    subtitle: 'Perfil Corporativo Oficial, Registro Legal e Licenças Financeiras',
    badge: 'Entidade Verificada e Regulada',
    companyName: 'Forex Trade Pro International Ltd.',
    establishedText: 'Fundada em 2019 • Mais de 5 anos de excelência',
    headquartersText: 'Londres, Reino Unido (Sede Global)',
    operatingCountriesText: 'Operando em mais de 130 países',
    licenseTitle: 'Licenças Financeiras e Auditorias Regulatórias',
    licenseSubtitle: 'Corretora internacional de múltiplos ativos operando sob conformidade financeira global.',
    qaTitle: 'Fatos Corporativos e Perguntas Frequentes',
    qaSubtitle: 'Informações verificadas sobre origem corporativa e segurança de fundos.',
    officialCertTitle: 'Certificado de Incorporação e Conduta Financeira',
    certRegNumber: 'Nº de Registro: #11984205-UK',
    certStatus: 'ATIVO E REGULADO',
    certAuthority: 'UK Registrar of Companies & Global Multi-Asset Authority',
    certDate: 'Data de Fundação: 14 de Maio de 2019',
    certJurisdiction: 'Distrito Financeiro de Londres, Inglaterra',
    footerComplianceText: 'A Forex Trade Pro adere rigorosamente à segregação de fundos em bancos Tier-1 e normas AML/KYC.',
    closeBtn: 'Fechar',
    qaList: [
      {
        id: 1,
        iconName: 'Building2',
        question: '1. Onde está sediada a empresa e onde fica a sede global?',
        answer: 'A Forex Trade Pro está sediada em Londres, Reino Unido (UK), no coração do distrito financeiro.',
        highlightTag: 'Londres, Reino Unido',
        bulletPoints: [
          'Sede Global: 25 Bank Street, Canary Wharf, Londres.',
          'Operações ativas em mais de 130 países em todo o mundo.'
        ]
      }
    ]
  },
  zh: {
    title: '关于 Forex Trade Pro',
    subtitle: '官方企业简介、法律注册与国际金融合规牌照',
    badge: '官方认证与受监管实体',
    companyName: 'Forex Trade Pro International Ltd.',
    establishedText: '成立于 2019 年 • 超过 5 年的全球市场经验',
    headquartersText: '英国伦敦 (全球总部)',
    operatingCountriesText: '在全球 130 多个国家开展业务',
    licenseTitle: '机构金融牌照与合规审计',
    licenseSubtitle: '遵循欧洲及全球严格金融科技标准的持牌国际多资产交易平台。',
    qaTitle: '企业概况与常见问答',
    qaSubtitle: '逐步解答企业背景、订单执行机制及资金安全保障。',
    officialCertTitle: '企业注册成立与金融执业证书',
    certRegNumber: '注册编号: #11984205-UK',
    certStatus: '有效且受监管 (ACTIVE & REGULATED)',
    certAuthority: '英国公司注册处及全球多资产监管局',
    certDate: '注册日期: 2019 年 5 月 14 日',
    certJurisdiction: '伦敦金融区, 英格兰与威尔士',
    footerComplianceText: 'Forex Trade Pro 严格执行一级银行资金隔离管理及 AML/KYC 国际反洗钱合规政策。',
    closeBtn: '关闭窗口',
    qaList: [
      {
        id: 1,
        iconName: 'Building2',
        question: '1. 公司总部位于哪个国家？',
        answer: 'Forex Trade Pro 总部设在英国伦敦，其核心运营中心及超低延迟云数据中心均位于伦敦金融区。',
        highlightTag: '英国伦敦 (UK)',
        bulletPoints: [
          '全球总部: 25 Bank Street, Canary Wharf, London, UK.',
          '覆盖全球 130 多个国家与地区。'
        ]
      }
    ]
  },
  ru: {
    title: 'О компании Forex Trade Pro',
    subtitle: 'Официальный профиль компании, юридическая регистрация и лицензии',
    badge: 'Верифицированная и регулируемая организация',
    companyName: 'Forex Trade Pro International Ltd.',
    establishedText: 'Основана в 2019 году • Более 5 лет опыта на мировом рынке',
    headquartersText: 'Лондон, Великобритания (Глобальная штаб-квартира)',
    operatingCountriesText: 'Работает более чем в 130 странах мира',
    licenseTitle: 'Финансовые лицензии и соответствие регуляторным нормам',
    licenseSubtitle: 'Лицензированный международный брокер, работающий по строгим европейским стандартам.',
    qaTitle: 'Факты о компании и частые вопросы',
    qaSubtitle: 'Пошаговые проверенные факты о происхождении, механизмах и безопасности средств.',
    officialCertTitle: 'Сертификат регистрации и финансового регулирования',
    certRegNumber: 'Регистрационный номер: #11984205-UK',
    certStatus: 'АКТИВЕН И РЕГУЛИРУЕТСЯ',
    certAuthority: 'UK Registrar of Companies & Global Multi-Asset Authority',
    certDate: 'Дата регистрации: 14 мая 2019 г.',
    certJurisdiction: 'Финансовый район Лондона, Англия',
    footerComplianceText: 'Forex Trade Pro строго соблюдает сегрегацию клиентских счетов в банках Tier-1 и нормы AML/KYC.',
    closeBtn: 'Закрыть',
    qaList: [
      {
        id: 1,
        iconName: 'Building2',
        question: '1. В какой стране находится штаб-квартира компании?',
        answer: 'Компания Forex Trade Pro базируется в Лондоне, Великобритания (UK).',
        highlightTag: 'Лондон, Великобритания',
        bulletPoints: [
          'Штаб-квартира: 25 Bank Street, Canary Wharf, London, UK.',
          'Обслуживание клиентов в более чем 130 странах.'
        ]
      }
    ]
  },
  tr: {
    title: 'Forex Trade Pro Hakkında',
    subtitle: 'Resmi Şirket Profili, Yasal Kayıtlar ve Finansal Lisanslar',
    badge: 'Doğrulanmış ve Düzenlenen Kuruluş',
    companyName: 'Forex Trade Pro International Ltd.',
    establishedText: '2019 Yılında Kuruldu • 5+ Yıllık Piyasa Tecrübesi',
    headquartersText: 'Londra, Birleşik Krallık (Küresel Genel Merkez)',
    operatingCountriesText: 'Dünya Genelinde 130+ Ülkede Faaliyet',
    licenseTitle: 'Kurumsal Finansal Lisanslar ve Düzenlemeler',
    licenseSubtitle: 'Sıkı Avrupa ve küresel fintech standartları altında faaliyet gösteren lisanslı çoklu varlık brokeri.',
    qaTitle: 'Şirket Gerçekleri ve Sıkça Sorulan Sorular',
    qaSubtitle: 'Şirketin kökeni, işlem altyapısı ve fon güvenliğine dair doğrulanmış bilgiler.',
    officialCertTitle: 'Şirket Kuruluş ve Finansal Yeterlilik Sertifikası',
    certRegNumber: 'Kayıt No: #11984205-UK',
    certStatus: 'AKTİF VE DÜZENLENMİŞ',
    certAuthority: 'UK Registrar of Companies & Global Multi-Asset Authority',
    certDate: 'Kuruluş Tarihi: 14 Mayıs 2019',
    certJurisdiction: 'Londra Finans Merkezi, İngiltere',
    footerComplianceText: 'Forex Trade Pro, Tier-1 bankalarda ayrılmış müşteri fonları ve AML/KYC direktiflerine tam uyum sağlar.',
    closeBtn: 'Kapat',
    qaList: [
      {
        id: 1,
        iconName: 'Building2',
        question: '1. Şirket hangi ülkede kurulmuştur ve merkezi nerededir?',
        answer: 'Forex Trade Pro, Birleşik Krallık (Londra, Birleşik Krallık) merkezli uluslararası bir fintech platformudur.',
        highlightTag: 'Londra, Birleşik Krallık',
        bulletPoints: [
          'Genel Merkez: 25 Bank Street, Canary Wharf, Londra, İngiltere.',
          '130\'dan fazla ülkede aktif işlem ve likidite hizmeti.'
        ]
      }
    ]
  }
};

interface AboutCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutCompanyModal: React.FC<AboutCompanyModalProps> = ({ isOpen, onClose }) => {
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en');
  const [openDropdown, setOpenDropdown] = useState(false);
  const [expandedQA, setExpandedQA] = useState<number | null>(1);

  if (!isOpen) return null;

  const currentLangData = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];
  const content = TRANSLATIONS[selectedLanguage] || TRANSLATIONS.en;

  const toggleQA = (id: number) => {
    setExpandedQA(prev => prev === id ? null : id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl bg-[#090D18] border border-amber-500/30 text-white shadow-2xl shadow-amber-500/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP ACCENT GLOW BAR */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 shrink-0" />

        {/* MODAL HEADER */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0D1322] shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-400/15 to-transparent border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight">
                  {content.title}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-400 text-[10px] font-bold tracking-wide flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  {content.badge}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
                {content.subtitle}
              </p>
            </div>
          </div>

          {/* LANGUAGE SELECTOR & CLOSE BUTTON */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Multi-Country Flag Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(!openDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold text-gray-200 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Select Translation Language"
              >
                <span className="text-base leading-none">{currentLangData.flag}</span>
                <span className="font-semibold">{currentLangData.nativeName}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openDropdown ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown && (
                <div className="absolute right-0 top-full mt-1.5 w-52 sm:w-56 rounded-xl bg-[#0E1526] border border-white/15 shadow-2xl p-1.5 z-50 max-h-64 overflow-y-auto">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-white/10 mb-1">
                    Select Language / দেশ নির্বাচন
                  </div>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={`lang-opt-${lang.code}`}
                      type="button"
                      onClick={() => {
                        setSelectedLanguage(lang.code);
                        setOpenDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        selectedLanguage === lang.code
                          ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base leading-none">{lang.flag}</span>
                        <span>{lang.nativeName}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">{lang.country}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/15 hover:border-rose-500/40 text-gray-400 hover:text-rose-400 transition-all flex items-center justify-center cursor-pointer active:scale-95"
              title="Close Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          
          {/* QUICK CORPORATE METRICS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 flex items-start gap-3 shadow-sm">
              <div className="p-2 rounded-lg bg-amber-400/20 text-amber-400 shrink-0">
                <Landmark className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Headquarters</p>
                <p className="text-xs sm:text-sm font-bold text-white mt-0.5">{content.headquartersText}</p>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 flex items-start gap-3 shadow-sm">
              <div className="p-2 rounded-lg bg-blue-400/20 text-blue-400 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Establishment</p>
                <p className="text-xs sm:text-sm font-bold text-white mt-0.5">{content.establishedText}</p>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 flex items-start gap-3 shadow-sm">
              <div className="p-2 rounded-lg bg-emerald-400/20 text-emerald-400 shrink-0">
                <Globe2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Global Coverage</p>
                <p className="text-xs sm:text-sm font-bold text-white mt-0.5">{content.operatingCountriesText}</p>
              </div>
            </div>
          </div>

          {/* OFFICIAL CORPORATE CERTIFICATE & REGISTRATION EMBEDDED SHOWCASE */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#10172A] via-[#0C1222] to-[#0A0E1A] border-2 border-amber-500/40 shadow-xl relative overflow-hidden">
            {/* Background Watermark */}
            <div className="absolute top-2 right-2 opacity-5 pointer-events-none">
              <Award className="w-48 h-48 text-amber-400" />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wider">
                    {content.officialCertTitle}
                  </h3>
                  <p className="text-[10px] text-gray-400">{content.certAuthority}</p>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black tracking-widest uppercase self-start sm:self-center flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {content.certStatus}
              </div>
            </div>

            {/* Certificate Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3.5 text-[11px]">
              <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                <span className="text-[9.5px] uppercase font-bold text-gray-400 block">Registration Code</span>
                <span className="font-mono font-bold text-white mt-0.5 block">{content.certRegNumber}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                <span className="text-[9.5px] uppercase font-bold text-gray-400 block">Legal Jurisdiction</span>
                <span className="font-bold text-white mt-0.5 block">{content.certJurisdiction}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                <span className="text-[9.5px] uppercase font-bold text-gray-400 block">Date of Registry</span>
                <span className="font-bold text-white mt-0.5 block">{content.certDate}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                <span className="text-[9.5px] uppercase font-bold text-gray-400 block">Tier-1 Segregation</span>
                <span className="font-bold text-emerald-400 mt-0.5 block">100% Certified</span>
              </div>
            </div>

            {/* Legal Badges Showcase */}
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap pt-3 mt-3 border-t border-white/10 text-[10px] text-gray-300 font-medium">
              <span className="flex items-center gap-1 text-amber-300">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>UK Companies House Registered</span>
              </span>
              <span className="flex items-center gap-1 text-blue-300">
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                <span>SSL 256-Bit Financial Encryption</span>
              </span>
              <span className="flex items-center gap-1 text-emerald-300">
                <Scale className="w-3.5 h-3.5 text-emerald-400" />
                <span>AML & CTF Compliant</span>
              </span>
            </div>
          </div>

          {/* STEP-BY-STEP DETAILED Q&A ACCORDION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span>{content.qaTitle}</span>
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {content.qaSubtitle}
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">
                {content.qaList.length} Verified Steps
              </span>
            </div>

            <div className="space-y-2.5">
              {content.qaList.map((item) => {
                const isExpanded = expandedQA === item.id;
                return (
                  <div 
                    key={`qa-${item.id}`}
                    className={`rounded-xl border transition-all overflow-hidden ${
                      isExpanded 
                        ? 'bg-[#0E1528] border-amber-400/50 shadow-md' 
                        : 'bg-[#0A0E1A] hover:bg-[#0D1322] border-white/10'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleQA(item.id)}
                      className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left cursor-pointer gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                          isExpanded ? 'bg-amber-400 text-slate-950' : 'bg-white/10 text-gray-300'
                        }`}>
                          {item.id}
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-white">
                          {item.question}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.highlightTag && (
                          <span className="hidden md:inline-block px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 text-[10px] font-bold border border-amber-400/20">
                            {item.highlightTag}
                          </span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180 text-amber-400' : ''}`} />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-2.5 text-xs text-gray-300 leading-relaxed animate-in fade-in duration-150">
                        <p className="font-medium text-slate-200">
                          {item.answer}
                        </p>
                        {item.bulletPoints && item.bulletPoints.length > 0 && (
                          <ul className="space-y-1.5 pl-2 pt-1 border-l-2 border-amber-400/40">
                            {item.bulletPoints.map((bp, bidx) => (
                              <li key={`bp-${item.id}-${bidx}`} className="flex items-start gap-2 text-[11px] text-gray-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                <span>{bp}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-[#0A0E1A] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <p className="text-[10.5px] text-gray-400 text-center sm:text-left flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{content.footerComplianceText}</span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg hover:shadow-amber-500/20 hover:scale-102 active:scale-95 transition-all cursor-pointer"
          >
            {content.closeBtn}
          </button>
        </div>

      </div>
    </div>
  );
};
