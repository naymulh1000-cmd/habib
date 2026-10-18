import { collection, query, where, doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, isQuotaExceeded, isQuotaError, markQuotaExceeded } from './firebase';
import { COUNTRIES } from '../data/countries';
import { calculateAccountMetricsEngine, getDailyTradingCycleWindow } from './profitCalculator';

let _leaderboardBroadcastChannel: BroadcastChannel | null = null;
function getLeaderboardBroadcastChannel(): BroadcastChannel | null {
  if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
    if (!_leaderboardBroadcastChannel) {
      try {
        _leaderboardBroadcastChannel = new BroadcastChannel('forex_global_leaderboard_channel');
      } catch (_) {
        _leaderboardBroadcastChannel = null;
      }
    }
    return _leaderboardBroadcastChannel;
  }
  return null;
}

export interface LeaderboardEntry {
  id: string;
  userId?: string;
  username: string;
  avatar: string;
  countryCode: string;
  countryName: string;
  countryFlag: string;
  accountType: 'live' | 'bonus';
  todayProfit: number;
  profitPercentage: number;
  winRate: number;
  totalTrades: number;
  isBenchmark?: boolean;
  lastUpdated?: number;
}

export interface LeaderboardConfig {
  resetHourUtc: number; // 8 = 8:00 AM (server UTC / configured reset cycle)
  liveActive: boolean;
  bonusActive: boolean;
  lastResetTimestamp: number;
  benchmarkEntriesLive: LeaderboardEntry[];
  benchmarkEntriesBonus: LeaderboardEntry[];
}

const LEADERBOARD_CONFIG_KEY = 'forex_pro_leaderboard_config';

/**
 * Normalizes username for case-insensitive, whitespace-independent, symbol-independent equality checking
 */
export function normalizeTraderName(name: string): string {
  return (name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Resolves the genuine profile name saved by the user in their profile.
 * Strictly guarantees that no Gmail address or email-derived ID is displayed on the Leaderboard.
 */
export function resolveUserProfileName(
  user?: {
    uid?: string;
    email?: string;
    displayName?: string;
  } | null,
  fallbackUserId?: string
): string {
  const uid = user?.uid || fallbackUserId;

  // 1. Direct explicit displayName from profile (if not empty and not an email)
  if (user?.displayName && typeof user.displayName === 'string') {
    const trimmed = user.displayName.trim();
    if (trimmed && !trimmed.includes('@') && trimmed.length >= 2) {
      return trimmed.length > 20 ? trimmed.substring(0, 19) + '...' : trimmed;
    }
  }

  // 2. Saved user profile display name from localStorage
  if (typeof window !== 'undefined') {
    if (uid) {
      try {
        const storedUidName = localStorage.getItem(`forex_user_display_name_${uid}`);
        if (storedUidName && typeof storedUidName === 'string') {
          const trimmed = storedUidName.trim();
          if (trimmed && !trimmed.includes('@') && trimmed.length >= 2) {
            return trimmed.length > 20 ? trimmed.substring(0, 19) + '...' : trimmed;
          }
        }
      } catch (_) {}
    }

    try {
      const storedGeneric = localStorage.getItem('forex_user_display_name');
      if (storedGeneric && typeof storedGeneric === 'string') {
        const trimmed = storedGeneric.trim();
        if (trimmed && !trimmed.includes('@') && trimmed.length >= 2) {
          return trimmed.length > 20 ? trimmed.substring(0, 19) + '...' : trimmed;
        }
      }
    } catch (_) {}

    try {
      const rawProfile = localStorage.getItem('forex_user_profile');
      if (rawProfile) {
        const parsed = JSON.parse(rawProfile);
        const pName = parsed.displayName || parsed.fullName || parsed.name;
        if (pName && typeof pName === 'string') {
          const trimmed = pName.trim();
          if (trimmed && !trimmed.includes('@') && trimmed.length >= 2) {
            return trimmed.length > 20 ? trimmed.substring(0, 19) + '...' : trimmed;
          }
        }
      }
    } catch (_) {}

    // Check users cache (all registered users)
    try {
      const rawUsers = localStorage.getItem('forex_pro_users_cache');
      if (rawUsers) {
        const usersList = JSON.parse(rawUsers);
        if (Array.isArray(usersList) && uid) {
          const matched = usersList.find((u: any) => u.uid === uid || (user?.email && u.email && u.email.toLowerCase() === user.email.toLowerCase()));
          if (matched) {
            const mName = matched.displayName || matched.fullName || matched.name;
            if (mName && typeof mName === 'string') {
              const trimmed = mName.trim();
              if (trimmed && !trimmed.includes('@') && trimmed.length >= 2) {
                return trimmed.length > 20 ? trimmed.substring(0, 19) + '...' : trimmed;
              }
            }
          }
        }
      }
    } catch (_) {}
  }

  // 3. Fallback: Clean trader alias — NEVER show Gmail ID / email address!
  if (uid) {
    const cleanId = uid.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
    return `Trader ${cleanId || 'PRO'}`;
  }

  return 'Trader Pro';
}

/**
 * Ensures any username shown on the leaderboard does not expose an email / Gmail ID
 */
export function cleanTraderDisplayName(name: string, userId?: string): string {
  if (!name) {
    return userId ? `Trader ${userId.slice(-4).toUpperCase()}` : 'Trader';
  }
  let clean = name.trim();
  // If it's an email address or contains @, resolve to actual profile name or clean alias
  if (clean.includes('@')) {
    const resolved = resolveUserProfileName({ uid: userId, email: clean }, userId);
    if (resolved && !resolved.includes('@')) return resolved;
    return userId ? `Trader ${userId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || 'PRO'}` : 'Trader';
  }
  if (!clean || clean.length < 2) {
    return userId ? `Trader ${userId.slice(-4).toUpperCase()}` : 'Trader';
  }
  return clean.length > 20 ? clean.substring(0, 19) + '...' : clean;
}

/**
 * Master Pool of 80+ completely unique international traders with distinct names, countries, flags & avatars.
 * Used to rotate fresh accounts and fresh names every 24 hours while strictly preventing duplicate names.
 */
interface TraderIdentity {
  id: string;
  name: string;
  countryCode: string;
  countryName: string;
  countryFlag: string;
  avatar: string;
}

const MASTER_TRADER_POOL: TraderIdentity[] = [
  // European Traders
  { id: 't_de_1', name: 'Hans_Schmitt', countryCode: 'DE', countryName: 'Germany', countryFlag: '🇩🇪', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { id: 't_it_1', name: 'Marco_Rossi_FX', countryCode: 'IT', countryName: 'Italy', countryFlag: '🇮🇹', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_fr_1', name: 'Julien_Dubois', countryCode: 'FR', countryName: 'France', countryFlag: '🇫🇷', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { id: 't_es_1', name: 'Carlos_Navarro', countryCode: 'ES', countryName: 'Spain', countryFlag: '🇪🇸', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80' },
  { id: 't_nl_1', name: 'Lars_Van_Dijk', countryCode: 'NL', countryName: 'Netherlands', countryFlag: '🇳🇱', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_ch_1', name: 'Lukas_Weber_CH', countryCode: 'CH', countryName: 'Switzerland', countryFlag: '🇨🇭', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { id: 't_se_1', name: 'Nils_Lindstrom', countryCode: 'SE', countryName: 'Sweden', countryFlag: '🇸🇪', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80' },
  { id: 't_gb_1', name: 'Oliver_Knight_UK', countryCode: 'GB', countryName: 'United Kingdom', countryFlag: '🇬🇧', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },
  { id: 't_de_2', name: 'Elena_Vassiliev', countryCode: 'DE', countryName: 'Germany', countryFlag: '🇩🇪', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { id: 't_it_2', name: 'Giuseppe_Mancini', countryCode: 'IT', countryName: 'Italy', countryFlag: '🇮🇹', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_fr_2', name: 'Antoine_Laurent', countryCode: 'FR', countryName: 'France', countryFlag: '🇫🇷', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { id: 't_es_2', name: 'Javier_Morales', countryCode: 'ES', countryName: 'Spain', countryFlag: '🇪🇸', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80' },
  { id: 't_nl_2', name: 'Bram_De_Jong', countryCode: 'NL', countryName: 'Netherlands', countryFlag: '🇳🇱', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_ch_2', name: 'Simon_Meier_CH', countryCode: 'CH', countryName: 'Switzerland', countryFlag: '🇨🇭', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { id: 't_se_2', name: 'Erik_Johansson', countryCode: 'SE', countryName: 'Sweden', countryFlag: '🇸🇪', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80' },
  { id: 't_gb_2', name: 'George_Harrison_UK', countryCode: 'GB', countryName: 'United Kingdom', countryFlag: '🇬🇧', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },
  { id: 't_de_3', name: 'Felix_Bauer_FX', countryCode: 'DE', countryName: 'Germany', countryFlag: '🇩🇪', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' },
  { id: 't_it_3', name: 'Matteo_Romano', countryCode: 'IT', countryName: 'Italy', countryFlag: '🇮🇹', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_fr_3', name: 'Alexandre_Moreau', countryCode: 'FR', countryName: 'France', countryFlag: '🇫🇷', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { id: 't_es_3', name: 'Mateo_Alvarez', countryCode: 'ES', countryName: 'Spain', countryFlag: '🇪🇸', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80' },
  { id: 't_nl_3', name: 'Daan_Vermeer', countryCode: 'NL', countryName: 'Netherlands', countryFlag: '🇳🇱', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_ch_3', name: 'Julian_Keller', countryCode: 'CH', countryName: 'Switzerland', countryFlag: '🇨🇭', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { id: 't_se_3', name: 'Gustav_Larsson', countryCode: 'SE', countryName: 'Sweden', countryFlag: '🇸🇪', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80' },
  { id: 't_gb_3', name: 'Arthur_Pendleton', countryCode: 'GB', countryName: 'United Kingdom', countryFlag: '🇬🇧', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },
  { id: 't_de_4', name: 'Maximilian_Koch', countryCode: 'DE', countryName: 'Germany', countryFlag: '🇩🇪', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { id: 't_it_4', name: 'Lorenzo_Ricci', countryCode: 'IT', countryName: 'Italy', countryFlag: '🇮🇹', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_fr_4', name: 'Lucas_Bernard', countryCode: 'FR', countryName: 'France', countryFlag: '🇫🇷', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { id: 't_es_4', name: 'Alejandro_Ruiz', countryCode: 'ES', countryName: 'Spain', countryFlag: '🇪🇸', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80' },
  { id: 't_gb_4', name: 'William_Scott_LDN', countryCode: 'GB', countryName: 'United Kingdom', countryFlag: '🇬🇧', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },

  // Middle Eastern Traders
  { id: 't_ae_1', name: 'Rashid_Al_Maktoum', countryCode: 'AE', countryName: 'United Arab Emirates', countryFlag: '🇦🇪', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_ae_2', name: 'Tariq_Zayed_DXB', countryCode: 'AE', countryName: 'United Arab Emirates', countryFlag: '🇦🇪', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_ae_3', name: 'Khalid_Al_Nuaimi', countryCode: 'AE', countryName: 'United Arab Emirates', countryFlag: '🇦🇪', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_ae_4', name: 'Mansoor_Al_Falasi', countryCode: 'AE', countryName: 'United Arab Emirates', countryFlag: '🇦🇪', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_sa_1', name: 'Faisal_Al_Saud', countryCode: 'SA', countryName: 'Saudi Arabia', countryFlag: '🇸🇦', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_sa_2', name: 'Salman_KSA', countryCode: 'SA', countryName: 'Saudi Arabia', countryFlag: '🇸🇦', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_sa_3', name: 'Nasser_Al_Otaibi', countryCode: 'SA', countryName: 'Saudi Arabia', countryFlag: '🇸🇦', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_sa_4', name: 'Bandar_Riyadh', countryCode: 'SA', countryName: 'Saudi Arabia', countryFlag: '🇸🇦', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_qa_1', name: 'Hamad_Al_Thani', countryCode: 'QA', countryName: 'Qatar', countryFlag: '🇶🇦', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },
  { id: 't_qa_2', name: 'Abdullah_DOH', countryCode: 'QA', countryName: 'Qatar', countryFlag: '🇶🇦', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },
  { id: 't_qa_3', name: 'Mohammed_Al_Kuwari', countryCode: 'QA', countryName: 'Qatar', countryFlag: '🇶🇦', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },
  { id: 't_qa_4', name: 'Saad_Al_Attiyah', countryCode: 'QA', countryName: 'Qatar', countryFlag: '🇶🇦', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },
  { id: 't_tr_1', name: 'Emre_Yilmaz', countryCode: 'TR', countryName: 'Turkey', countryFlag: '🇹🇷', avatar: 'https://images.unsplash.com/photo-1528892952291-009c663ce843?w=150&auto=format&fit=crop&q=80' },
  { id: 't_tr_2', name: 'Can_Demir_TR', countryCode: 'TR', countryName: 'Turkey', countryFlag: '🇹🇷', avatar: 'https://images.unsplash.com/photo-1528892952291-009c663ce843?w=150&auto=format&fit=crop&q=80' },
  { id: 't_tr_3', name: 'Burak_Kaya_TR', countryCode: 'TR', countryName: 'Turkey', countryFlag: '🇹🇷', avatar: 'https://images.unsplash.com/photo-1528892952291-009c663ce843?w=150&auto=format&fit=crop&q=80' },
  { id: 't_tr_4', name: 'Omer_Celik', countryCode: 'TR', countryName: 'Turkey', countryFlag: '🇹🇷', avatar: 'https://images.unsplash.com/photo-1528892952291-009c663ce843?w=150&auto=format&fit=crop&q=80' },

  // Asian Traders
  { id: 't_bd_1', name: 'Tanvir_Rahman_BD', countryCode: 'BD', countryName: 'Bangladesh', countryFlag: '🇧🇩', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
  { id: 't_bd_2', name: 'Sayed_Ahmed_BD', countryCode: 'BD', countryName: 'Bangladesh', countryFlag: '🇧🇩', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
  { id: 't_bd_3', name: 'Arif_Hossain_BD', countryCode: 'BD', countryName: 'Bangladesh', countryFlag: '🇧🇩', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
  { id: 't_bd_4', name: 'Rakib_Chowdhury', countryCode: 'BD', countryName: 'Bangladesh', countryFlag: '🇧🇩', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
  { id: 't_in_1', name: 'Vikram_Patel_FX', countryCode: 'IN', countryName: 'India', countryFlag: '🇮🇳', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
  { id: 't_in_2', name: 'Rahul_Sharma_FX', countryCode: 'IN', countryName: 'India', countryFlag: '🇮🇳', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
  { id: 't_in_3', name: 'Arjun_Mehta_IN', countryCode: 'IN', countryName: 'India', countryFlag: '🇮🇳', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
  { id: 't_in_4', name: 'Aditya_Verma_IN', countryCode: 'IN', countryName: 'India', countryFlag: '🇮🇳', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
  { id: 't_sg_1', name: 'Zhi_Wei_Singapore', countryCode: 'SG', countryName: 'Singapore', countryFlag: '🇸🇬', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
  { id: 't_sg_2', name: 'Wei_Jie_SG', countryCode: 'SG', countryName: 'Singapore', countryFlag: '🇸🇬', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
  { id: 't_sg_3', name: 'Jun_Hao_SG', countryCode: 'SG', countryName: 'Singapore', countryFlag: '🇸🇬', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
  { id: 't_sg_4', name: 'Kian_Meng_FX', countryCode: 'SG', countryName: 'Singapore', countryFlag: '🇸🇬', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
  { id: 't_jp_1', name: 'Kenji_Sato', countryCode: 'JP', countryName: 'Japan', countryFlag: '🇯🇵', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
  { id: 't_jp_2', name: 'Daiki_Takahashi', countryCode: 'JP', countryName: 'Japan', countryFlag: '🇯🇵', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
  { id: 't_jp_3', name: 'Ren_Watanabe', countryCode: 'JP', countryName: 'Japan', countryFlag: '🇯🇵', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
  { id: 't_jp_4', name: 'Haruto_Tanaka', countryCode: 'JP', countryName: 'Japan', countryFlag: '🇯🇵', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },

  // Americas & Oceania Traders
  { id: 't_us_1', name: 'Michael_NYC_Pro', countryCode: 'US', countryName: 'United States', countryFlag: '🇺🇸', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
  { id: 't_us_2', name: 'David_Miller_USA', countryCode: 'US', countryName: 'United States', countryFlag: '🇺🇸', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
  { id: 't_us_3', name: 'James_Wilson_FX', countryCode: 'US', countryName: 'United States', countryFlag: '🇺🇸', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
  { id: 't_us_4', name: 'Robert_Taylor_US', countryCode: 'US', countryName: 'United States', countryFlag: '🇺🇸', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
  { id: 't_ca_1', name: 'Liam_Tremblay', countryCode: 'CA', countryName: 'Canada', countryFlag: '🇨🇦', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { id: 't_ca_2', name: 'Noah_Roy_CA', countryCode: 'CA', countryName: 'Canada', countryFlag: '🇨🇦', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { id: 't_ca_3', name: 'Oliver_Boucher', countryCode: 'CA', countryName: 'Canada', countryFlag: '🇨🇦', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { id: 't_ca_4', name: 'Ethan_Macdonald', countryCode: 'CA', countryName: 'Canada', countryFlag: '🇨🇦', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { id: 't_br_1', name: 'Lucas_Silva_FX', countryCode: 'BR', countryName: 'Brazil', countryFlag: '🇧🇷', avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80' },
  { id: 't_br_2', name: 'Mateo_Costa_BR', countryCode: 'BR', countryName: 'Brazil', countryFlag: '🇧🇷', avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80' },
  { id: 't_br_3', name: 'Gabriel_Santos_FX', countryCode: 'BR', countryName: 'Brazil', countryFlag: '🇧🇷', avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80' },
  { id: 't_br_4', name: 'Thiago_Oliveira', countryCode: 'BR', countryName: 'Brazil', countryFlag: '🇧🇷', avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80' },
  { id: 't_au_1', name: 'Jack_O_Connor', countryCode: 'AU', countryName: 'Australia', countryFlag: '🇦🇺', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
  { id: 't_au_2', name: 'Ethan_Smith_AU', countryCode: 'AU', countryName: 'Australia', countryFlag: '🇦🇺', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
  { id: 't_au_3', name: 'Harrison_Kelly', countryCode: 'AU', countryName: 'Australia', countryFlag: '🇦🇺', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
  { id: 't_au_4', name: 'Liam_Davies_SYD', countryCode: 'AU', countryName: 'Australia', countryFlag: '🇦🇺', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
];

import { 
  getDailyBenchmarkAccounts as getDailyBenchmarkAccountsFromMaster,
  cleanAndRankTop50 as cleanAndRankTop50FromMaster,
  DEFAULT_BENCHMARK_LIVE as MASTER_DEFAULT_BENCHMARK_LIVE,
  DEFAULT_BENCHMARK_BONUS as MASTER_DEFAULT_BENCHMARK_BONUS,
  MIN_LEADERBOARD_PROFIT_QUALIFY,
  LEADERBOARD_MAX_PUBLIC_PROFIT,
  formatLeaderboardProfit,
  formatLeaderboardGain,
} from './benchmarkData';

export {
  MIN_LEADERBOARD_PROFIT_QUALIFY,
  LEADERBOARD_MAX_PUBLIC_PROFIT,
  formatLeaderboardProfit,
  formatLeaderboardGain,
};

/**
 * Deterministically generates a fresh, unique 20-member benchmark leaderboard for every 24-hour cycle.
 * Guarantees that:
 * 1. Every 24 hours (when cycle advances at 8:00 AM), a brand new set of distinct names & accounts appear.
 * 2. In any single day, NO name is repeated twice.
 * 3. Live and Bonus accounts on the same day never share the same name.
 * 4. Profits scale automatically by ~$500/hour, peak between $20k - $30k, and shuffle dynamically.
 */
export function getDailyBenchmarkAccounts(
  accountType: 'live' | 'bonus',
  cycleStartTime?: number,
  currentTime = Date.now()
): LeaderboardEntry[] {
  return getDailyBenchmarkAccountsFromMaster(accountType, cycleStartTime, currentTime) as LeaderboardEntry[];
}

// Default Benchmarks (backward-compatible exports)
export const DEFAULT_BENCHMARK_LIVE: LeaderboardEntry[] = MASTER_DEFAULT_BENCHMARK_LIVE as LeaderboardEntry[];
export const DEFAULT_BENCHMARK_BONUS: LeaderboardEntry[] = MASTER_DEFAULT_BENCHMARK_BONUS as LeaderboardEntry[];

export const DEFAULT_LEADERBOARD_CONFIG: LeaderboardConfig = {
  resetHourUtc: 8, // 8:00 AM daily cycle
  liveActive: true,
  bonusActive: true,
  lastResetTimestamp: Date.now(),
  benchmarkEntriesLive: DEFAULT_BENCHMARK_LIVE,
  benchmarkEntriesBonus: DEFAULT_BENCHMARK_BONUS,
};

/**
 * Calculates the current 8:00 AM daily cycle window:
 * Window runs from 8:00 AM (start) to 8:00 AM next day (end).
 */
export function getDailyCycleWindow(resetHour = 8, referenceDate = new Date()): {
  startTime: number;
  endTime: number;
  now: number;
  remainingMs: number;
} {
  return getDailyTradingCycleWindow(resetHour, referenceDate);
}

/**
 * Formats countdown string: e.g. "14h 22m 35s"
 */
export function formatResetCountdown(remainingMs: number): string {
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
}

/**
 * Retrieves stored leaderboard config from localStorage or defaults
 */
export function getStoredLeaderboardConfig(): LeaderboardConfig {
  if (typeof window === 'undefined') return DEFAULT_LEADERBOARD_CONFIG;
  try {
    const raw = localStorage.getItem(LEADERBOARD_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        resetHourUtc: typeof parsed.resetHourUtc === 'number' ? parsed.resetHourUtc : 8,
        liveActive: parsed.liveActive !== false,
        bonusActive: parsed.bonusActive !== false,
        lastResetTimestamp: parsed.lastResetTimestamp || Date.now(),
        benchmarkEntriesLive: Array.isArray(parsed.benchmarkEntriesLive) && parsed.benchmarkEntriesLive.length > 0 
          ? parsed.benchmarkEntriesLive 
          : DEFAULT_BENCHMARK_LIVE,
        benchmarkEntriesBonus: Array.isArray(parsed.benchmarkEntriesBonus) && parsed.benchmarkEntriesBonus.length > 0 
          ? parsed.benchmarkEntriesBonus 
          : DEFAULT_BENCHMARK_BONUS,
      };
    }
  } catch (err) {
    console.warn('Failed reading local leaderboard config:', err);
  }
  return DEFAULT_LEADERBOARD_CONFIG;
}

/**
 * Saves leaderboard config to localStorage
 */
export function saveStoredLeaderboardConfig(config: LeaderboardConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LEADERBOARD_CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn('Failed saving local leaderboard config:', err);
  }
}

/**
 * Saves leaderboard config to Firestore & local storage
 */
export async function saveLeaderboardConfigToFirestore(config: LeaderboardConfig): Promise<boolean> {
  saveStoredLeaderboardConfig(config);

  // Sync to Backend Server
  try {
    fetch('/api/leaderboard/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }).catch(() => {});
  } catch (_) {}

  // Broadcast to other tabs
  const channel = getLeaderboardBroadcastChannel();
  if (channel) {
    try {
      channel.postMessage({ type: 'CONFIG_UPDATE', config });
    } catch (_) {}
  }

  if (isQuotaExceeded()) {
    return true;
  }

  try {
    const configDocRef = doc(db, 'system_config', 'leaderboard');
    await setDoc(configDocRef, {
      ...config,
      updatedAt: Date.now(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn('Firestore write warning for leaderboard config:', error);
    return false;
  }
}

/**
 * Subscribes to real-time leaderboard configuration from Firestore & Server
 */
export function subscribeToLeaderboardConfig(
  callback: (config: LeaderboardConfig) => void
): () => void {
  // Return local storage immediately
  const initial = getStoredLeaderboardConfig();
  callback(initial);

  // Cross-tab broadcast listener
  const handleBroadcast = (event: MessageEvent) => {
    if (event.data?.type === 'CONFIG_UPDATE' && event.data?.config) {
      saveStoredLeaderboardConfig(event.data.config);
      callback(event.data.config);
    }
  };

  const channel = getLeaderboardBroadcastChannel();
  if (channel) {
    channel.addEventListener('message', handleBroadcast);
  }

  // Periodic fallback polling from backend server
  const pollTimer = setInterval(async () => {
    try {
      const res = await fetch('/api/leaderboard/config');
      if (res.ok) {
        const json = await res.json();
        if (json?.config) {
          saveStoredLeaderboardConfig(json.config);
          callback(json.config);
        }
      }
    } catch (_) {}
  }, 4000);

  if (isQuotaExceeded()) {
    return () => {
      clearInterval(pollTimer);
      const ch = getLeaderboardBroadcastChannel();
      if (ch) {
        ch.removeEventListener('message', handleBroadcast);
      }
    };
  }

  try {
    const docRef = doc(db, 'system_config', 'leaderboard');
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const merged: LeaderboardConfig = {
          resetHourUtc: typeof data.resetHourUtc === 'number' ? data.resetHourUtc : 8,
          liveActive: data.liveActive !== false,
          bonusActive: data.bonusActive !== false,
          lastResetTimestamp: data.lastResetTimestamp || Date.now(),
          benchmarkEntriesLive: Array.isArray(data.benchmarkEntriesLive) && data.benchmarkEntriesLive.length > 0
            ? data.benchmarkEntriesLive
            : initial.benchmarkEntriesLive,
          benchmarkEntriesBonus: Array.isArray(data.benchmarkEntriesBonus) && data.benchmarkEntriesBonus.length > 0
            ? data.benchmarkEntriesBonus
            : initial.benchmarkEntriesBonus,
        };
        saveStoredLeaderboardConfig(merged);
        callback(merged);
      }
    }, (err) => {
      console.warn('Leaderboard config snapshot notice:', err);
    });

    return () => {
      clearInterval(pollTimer);
      unsub();
      const ch = getLeaderboardBroadcastChannel();
      if (ch) {
        ch.removeEventListener('message', handleBroadcast);
      }
    };
  } catch (err) {
    console.warn('Failed initializing leaderboard subscriber:', err);
    return () => {
      clearInterval(pollTimer);
      const ch = getLeaderboardBroadcastChannel();
      if (ch) {
        ch.removeEventListener('message', handleBroadcast);
      }
    };
  }
}

/**
 * Calculates user's Today's Profit (from 8 AM cycle start to now)
 * Uses the exact same shared calculation engine as the main Dashboard.
 */
export function calculateUserTodayProfit(
  closedTrades: any[],
  activeTrades: any[],
  accountType: 'live' | 'bonus' | 'demo',
  _cycleStartTime?: number,
  resetHour = 8,
  referenceDate = new Date()
): {
  netTodayProfit: number;
  totalProfit: number;
  totalLoss: number;
  profitPercentage: number;
  winRate: number;
  totalTradesToday: number;
} {
  const acc = accountType === 'demo' ? 'demo' : (accountType === 'bonus' ? 'bonus' : 'live');

  const metrics = calculateAccountMetricsEngine(
    acc,
    { live: 0, bonus: 0, demo: 0 },
    activeTrades || [],
    closedTrades || [],
    referenceDate,
    resetHour
  );

  const today = metrics.today;
  const netTodayProfit = today.netPnl;

  const profitPercentage = netTodayProfit > 0 
    ? parseFloat(Math.min(250, (netTodayProfit / 100) * 2.5).toFixed(1))
    : 0;

  return {
    netTodayProfit: today.netPnl,
    totalProfit: today.totalProfit,
    totalLoss: today.totalLoss,
    profitPercentage,
    winRate: today.winRate,
    totalTradesToday: today.totalTrades,
  };
}

/**
 * Global Real-Time Leaderboard Storage & Sync Engine
 */
const GLOBAL_LEADERBOARD_KEY_PREFIX = 'forex_pro_global_top20_';

// Throttling cache to prevent duplicate Firestore writes
const lastUserSyncCache: Record<string, { timestamp: number; profit: number; trades: number }> = {};

/**
 * Recursively strips undefined values from an object or array before writing to Firestore.
 * Preserves FieldValue instances (like serverTimestamp).
 */
export function cleanFirestorePayload<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map(item => cleanFirestorePayload(item)) as any;
  }
  if (typeof data === 'object') {
    // If it's a Firestore FieldValue (e.g. serverTimestamp), preserve it
    if ('_methodName' in (data as any) || (data.constructor && data.constructor.name === 'FieldValue')) {
      return data;
    }
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestorePayload(value);
      }
    }
    return cleaned as any;
  }
  return data;
}

/**
 * Clean, merge and sort Top 50 list strictly with highest profit first.
 * Strictly deduplicates by BOTH unique identifier AND normalized username.
 * Guarantees that:
 * - No user/trader name appears twice in the leaderboard.
 * - Real user performance records take precedence over benchmark entries.
 * - Exactly 50 distinct entries with ranks 1 to 50 are returned.
 */
export const cleanAndRankTop50 = cleanAndRankTop50FromMaster as (
  candidates: LeaderboardEntry[],
  fallbackBenchmarks: LeaderboardEntry[]
) => (LeaderboardEntry & { rank: number })[];

/**
 * Backward compatibility alias: cleanAndRankTop20 now returns the clean ranked Top 50.
 */
export const cleanAndRankTop20 = cleanAndRankTop50;

/**
 * Returns stored global Top 50 from localStorage or fresh benchmarks for the current 24-hour cycle.
 * Automatically refreshes when the 24-hour window rolls over at 8:00 AM.
 */
export function getStoredGlobalLeaderboard(accountType: 'live' | 'bonus'): (LeaderboardEntry & { rank: number })[] {
  const currentCycle = getDailyTradingCycleWindow(8);
  const fallback = getDailyBenchmarkAccounts(accountType, currentCycle.startTime, Date.now());

  if (typeof window === 'undefined') {
    return cleanAndRankTop50([], fallback);
  }
  try {
    const raw = localStorage.getItem(`${GLOBAL_LEADERBOARD_KEY_PREFIX}${accountType}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        // If 24 hours have elapsed (cycle has changed), reset to fresh daily benchmarks starting from 0.00
        if (!parsed.cycleStartTime || parsed.cycleStartTime < currentCycle.startTime) {
          const freshDaily = cleanAndRankTop50([], fallback);
          saveStoredGlobalLeaderboard(accountType, freshDaily);
          return freshDaily;
        }
        if (Array.isArray(parsed.top50) && parsed.top50.length > 0) {
          return cleanAndRankTop50(parsed.top50, fallback);
        }
        if (Array.isArray(parsed.top20) && parsed.top20.length > 0) {
          return cleanAndRankTop50(parsed.top20, fallback);
        }
      }
    }
  } catch (_) {}

  const initial = cleanAndRankTop50([], fallback);
  saveStoredGlobalLeaderboard(accountType, initial);
  return initial;
}

/**
 * Compares two leaderboard lists to verify if items, ranks, and profits are strictly identical.
 * Prevents redundant re-renders and visual flickering.
 */
export function areLeaderboardListsEqual(
  a?: (LeaderboardEntry & { rank?: number })[] | null,
  b?: (LeaderboardEntry & { rank?: number })[] | null
): boolean {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const itemA = a[i];
    const itemB = b[i];
    if (!itemA || !itemB) return false;
    if (
      itemA.id !== itemB.id ||
      itemA.username !== itemB.username ||
      itemA.rank !== itemB.rank ||
      Math.abs((itemA.todayProfit || 0) - (itemB.todayProfit || 0)) > 0.01 ||
      itemA.winRate !== itemB.winRate ||
      itemA.totalTrades !== itemB.totalTrades
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Saves global Top 50 to localStorage with cycle start timestamp
 */
export function saveStoredGlobalLeaderboard(
  accountType: 'live' | 'bonus',
  entries: (LeaderboardEntry & { rank: number })[]
) {
  if (typeof window === 'undefined') return;
  try {
    const currentCycle = getDailyTradingCycleWindow(8);
    localStorage.setItem(
      `${GLOBAL_LEADERBOARD_KEY_PREFIX}${accountType}`,
      JSON.stringify({
        top50: entries,
        top20: entries,
        cycleStartTime: currentCycle.startTime,
        lastUpdated: Date.now(),
      })
    );
  } catch (_) {}
}

// Shared memory pools for real traders across the app session
const liveRealTraders = new Map<string, LeaderboardEntry>();
const bonusRealTraders = new Map<string, LeaderboardEntry>();

export function getRealTradersMap(accountType: 'live' | 'bonus'): Map<string, LeaderboardEntry> {
  return accountType === 'bonus' ? bonusRealTraders : liveRealTraders;
}

/**
 * Subscribes to real-time synchronized global leaderboard from Firestore and backend server.
 * Automatically checks for 24-hour cycle renewal at 8:00 AM and smoothly synchronizes all real traders across all devices.
 */
export function subscribeToGlobalLeaderboard(
  accountType: 'live' | 'bonus',
  callback: (data: { top50?: (LeaderboardEntry & { rank: number })[]; top20: (LeaderboardEntry & { rank: number })[]; lastUpdated: number }) => void
): () => void {
  const currentCycle = getDailyTradingCycleWindow(8);
  const fallback = getDailyBenchmarkAccounts(accountType, currentCycle.startTime, Date.now());
  const realTradersMap = getRealTradersMap(accountType);

  let lastEmitted: (LeaderboardEntry & { rank: number })[] = [];

  const emitIfChanged = (ranked: (LeaderboardEntry & { rank: number })[], lastUpdated: number) => {
    if (!areLeaderboardListsEqual(lastEmitted, ranked)) {
      lastEmitted = ranked;
      saveStoredGlobalLeaderboard(accountType, ranked);
      callback({ top50: ranked, top20: ranked, lastUpdated });
    }
  };

  // Immediate cached return for zero-latency UI rendering
  const cached = getStoredGlobalLeaderboard(accountType);
  if (Array.isArray(cached) && cached.length > 0) {
    cached.forEach((item) => {
      if (!item.isBenchmark && (item.userId || item.id?.startsWith('user_')) && (item.todayProfit || 0) > 0) {
        const uid = item.userId || item.id.replace('user_', '');
        if (uid && !realTradersMap.has(uid)) {
          realTradersMap.set(uid, item);
        }
      }
    });
    lastEmitted = cached;
    callback({ top50: cached, top20: cached, lastUpdated: Date.now() });
  }

  // Helper to recompile and emit Top 50 from realTradersMap + stable benchmarks
  const recompileAndEmit = (timestamp = Date.now()) => {
    const cycleWindow = getDailyTradingCycleWindow(8);
    const dynamicBenchmarks = getDailyBenchmarkAccounts(accountType, cycleWindow.startTime, Date.now());
    const realTradersList = Array.from(realTradersMap.values()).filter(
      t => (t.todayProfit || 0) > 0 && (!t.lastUpdated || t.lastUpdated >= (cycleWindow.startTime - 120000))
    );
    const ranked = cleanAndRankTop50(realTradersList, dynamicBenchmarks);
    emitIfChanged(ranked, timestamp);
    return ranked;
  };

  // 1. Full-stack Server API polling: guarantees cross-device sync and authoritative single source of truth
  const fetchFromServer = async () => {
    try {
      const res = await fetch(`/api/leaderboard/${accountType}`);
      if (res.ok) {
        const json = await res.json();
        const incomingList = (Array.isArray(json?.top50) && json.top50.length > 0)
          ? json.top50
          : (Array.isArray(json?.top20) && json.top20.length > 0 ? json.top20 : null);

        if (incomingList) {
          const nowCycle = getDailyTradingCycleWindow(8);
          incomingList.forEach((e: any) => {
            if (!e.isBenchmark && (e.userId || e.id?.startsWith('user_')) && (e.todayProfit || 0) > 0) {
              const uid = e.userId || e.id.replace('user_', '');
              const traderLastUpdated = typeof e.lastUpdated === 'number' ? e.lastUpdated : Date.now();
              if (uid && traderLastUpdated >= (nowCycle.startTime - 120000)) {
                realTradersMap.set(uid, {
                  id: e.id || `user_${uid}`,
                  userId: uid,
                  username: cleanTraderDisplayName(e.username, uid),
                  avatar: e.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                  countryCode: e.countryCode || 'BD',
                  countryName: e.countryName || 'Bangladesh',
                  countryFlag: e.countryFlag || '🇧🇩',
                  accountType,
                  todayProfit: parseFloat(Number(e.todayProfit || 0).toFixed(2)),
                  profitPercentage: e.profitPercentage || 0,
                  winRate: e.winRate || 0,
                  totalTrades: e.totalTrades || 0,
                  isBenchmark: false,
                  lastUpdated: traderLastUpdated,
                });
              }
            }
          });
          emitIfChanged(incomingList, json.lastUpdated || Date.now());
        }
      }
    } catch (_) {}
  };

  fetchFromServer();
  const serverPollInterval = setInterval(fetchFromServer, 4000);

  // Cross-tab broadcast receiver
  const handleBroadcast = (event: MessageEvent) => {
    if (event.data && event.data.accountType === accountType) {
      const incomingList = (Array.isArray(event.data.top50) && event.data.top50.length > 0)
        ? event.data.top50
        : (Array.isArray(event.data.top20) ? event.data.top20 : null);

      if (incomingList) {
        incomingList.forEach((e: any) => {
          if (!e.isBenchmark && (e.userId || e.id?.startsWith('user_')) && (e.todayProfit || 0) > 0) {
            const uid = e.userId || e.id.replace('user_', '');
            if (uid) realTradersMap.set(uid, e);
          }
        });
        emitIfChanged(incomingList, event.data.lastUpdated || Date.now());
      }
    }
  };

  const channel = getLeaderboardBroadcastChannel();
  if (channel) {
    channel.addEventListener('message', handleBroadcast);
  }

  // Periodic hourly progression timer: smoothly updates benchmarks as hours pass
  const hourlyInterval = setInterval(() => {
    recompileAndEmit(Date.now());
  }, 60000);

  if (isQuotaExceeded()) {
    return () => {
      clearInterval(hourlyInterval);
      clearInterval(serverPollInterval);
      const ch = getLeaderboardBroadcastChannel();
      if (ch) {
        ch.removeEventListener('message', handleBroadcast);
      }
    };
  }

  try {
    // 2. Real-time Firestore master document listener: instant cross-device synchronization
    const masterDocRef = doc(db, 'global_leaderboard', accountType);
    const unsubMaster = onSnapshot(masterDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const incoming = (Array.isArray(data?.top50) && data.top50.length > 0)
          ? data.top50
          : (Array.isArray(data?.top20) && data.top20.length > 0 ? data.top20 : null);
        if (incoming) {
          incoming.forEach((item: any) => {
            if (!item.isBenchmark && (item.userId || item.id?.startsWith('user_')) && (item.todayProfit || 0) > 0) {
              const uid = item.userId || item.id.replace('user_', '');
              if (uid) realTradersMap.set(uid, item);
            }
          });
          emitIfChanged(incoming, data.lastUpdated || Date.now());
        }
      }
    }, () => {});

    // 3. Real-time Firestore query on all real traders for this account type
    const tradersColl = collection(db, 'leaderboard_traders');
    const qTraders = query(tradersColl, where('accountType', '==', accountType));
    const unsubTraders = onSnapshot(qTraders, (snapshot) => {
      const currentCycle = getDailyTradingCycleWindow(8);
      const now = Date.now();
      let hasChanges = false;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        if (!data) return;
        const uid = data.userId || (docSnap.id.includes('_') ? docSnap.id.split('_').slice(1).join('_') : docSnap.id);
        const traderLastUpdated = typeof data.lastUpdated === 'number' ? data.lastUpdated : now;

        if ((data.todayProfit || 0) > 0 && traderLastUpdated >= (currentCycle.startTime - 120000)) {
          const existing = realTradersMap.get(uid);
          if (!existing || Math.abs((existing.todayProfit || 0) - (data.todayProfit || 0)) > 0.01) {
            hasChanges = true;
          }
          realTradersMap.set(uid, {
            id: data.id || `user_${uid}`,
            userId: uid,
            username: cleanTraderDisplayName(data.username || data.displayName, uid),
            avatar: data.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            countryCode: data.countryCode || 'BD',
            countryName: data.countryName || 'Bangladesh',
            countryFlag: data.countryFlag || '🇧🇩',
            accountType,
            todayProfit: parseFloat(Number(data.todayProfit || 0).toFixed(2)),
            profitPercentage: data.profitPercentage || 0,
            winRate: data.winRate || 0,
            totalTrades: data.totalTrades || 0,
            isBenchmark: false,
            lastUpdated: traderLastUpdated,
          });
        } else if ((data.todayProfit || 0) <= 0 && realTradersMap.has(uid)) {
          realTradersMap.delete(uid);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        recompileAndEmit(now);
      }
    }, (err) => {
      if (!isQuotaError(err)) {
        console.warn(`Leaderboard snapshot note (${accountType}):`, err);
      } else {
        markQuotaExceeded(err);
      }
    });

    return () => {
      clearInterval(hourlyInterval);
      clearInterval(serverPollInterval);
      unsubMaster();
      unsubTraders();
      const ch = getLeaderboardBroadcastChannel();
      if (ch) {
        ch.removeEventListener('message', handleBroadcast);
      }
    };
  } catch (err) {
    console.warn('Failed subscribing to global leaderboard:', err);
    return () => {
      clearInterval(hourlyInterval);
      clearInterval(serverPollInterval);
      const ch = getLeaderboardBroadcastChannel();
      if (ch) {
        ch.removeEventListener('message', handleBroadcast);
      }
    };
  }
}

/**
 * Synchronizes user's today performance to the global database and recalculates rankings.
 * Called automatically after every trade close.
 */
export async function syncUserToGlobalLeaderboard(
  currentUser: {
    uid?: string;
    email?: string;
    displayName?: string;
    countryCode?: string;
    countryFlag?: string;
    avatar?: string;
    photoURL?: string;
  } | null,
  userStats: {
    netTodayProfit: number;
    profitPercentage: number;
    winRate: number;
    totalTradesToday: number;
  },
  accountType: 'live' | 'bonus'
): Promise<void> {
  if (!currentUser?.uid) {
    return;
  }

  const syncKey = `${accountType}_${currentUser.uid}`;
  const now = Date.now();
  const cachedSync = lastUserSyncCache[syncKey];

  // Prevent duplicate writes within 1200ms if metrics have not changed
  if (
    cachedSync &&
    now - cachedSync.timestamp < 1200 &&
    Math.abs(cachedSync.profit - userStats.netTodayProfit) < 0.01 &&
    cachedSync.trades === userStats.totalTradesToday
  ) {
    return;
  }

  lastUserSyncCache[syncKey] = {
    timestamp: now,
    profit: userStats.netTodayProfit,
    trades: userStats.totalTradesToday,
  };

  try {
    const userCountry = COUNTRIES.find(c => c.code === (currentUser?.countryCode || 'BD')) || COUNTRIES[0];
    const rawName = resolveUserProfileName(currentUser, currentUser?.uid);
    const formattedUsername = cleanTraderDisplayName(rawName, currentUser?.uid);

    const traderRecord: LeaderboardEntry = {
      id: `user_${currentUser.uid}`,
      userId: currentUser.uid,
      username: formattedUsername,
      avatar: currentUser?.avatar || currentUser?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      countryCode: userCountry.code,
      countryName: userCountry.name,
      countryFlag: currentUser?.countryFlag || userCountry.flag,
      accountType,
      todayProfit: parseFloat(Number(userStats.netTodayProfit || 0).toFixed(2)),
      profitPercentage: userStats.profitPercentage || 0,
      winRate: userStats.winRate || 0,
      totalTrades: userStats.totalTradesToday || 0,
      isBenchmark: false,
      lastUpdated: now,
    };

    const realTradersMap = getRealTradersMap(accountType);

    // Update current user in real trader map
    if ((traderRecord.todayProfit || 0) > 0) {
      realTradersMap.set(currentUser.uid, traderRecord);
    } else {
      realTradersMap.delete(currentUser.uid);
    }

    // 1. Authoritative sync with fullstack Express backend API for global cross-device visibility
    try {
      const res = await fetch('/api/leaderboard/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traderRecord, accountType }),
      });
      if (res.ok) {
        const data = await res.json();
        const incoming = (data && Array.isArray(data.top50) && data.top50.length > 0)
          ? data.top50
          : (data && Array.isArray(data.top20) ? data.top20 : null);
        if (incoming) {
          incoming.forEach((item: any) => {
            if (!item.isBenchmark && (item.userId || item.id?.startsWith('user_')) && (item.todayProfit || 0) > 0) {
              const uid = item.userId || item.id.replace('user_', '');
              if (uid) realTradersMap.set(uid, item);
            }
          });
          saveStoredGlobalLeaderboard(accountType, incoming);
          const ch = getLeaderboardBroadcastChannel();
          if (ch) {
            ch.postMessage({
              accountType,
              top50: incoming,
              top20: incoming,
              lastUpdated: data.lastUpdated || Date.now(),
            });
          }
          // Update Firestore master document with authoritative server list
          if (!isQuotaExceeded()) {
            const currentCycle = getDailyTradingCycleWindow(8);
            const masterDocRef = doc(db, 'global_leaderboard', accountType);
            setDoc(masterDocRef, cleanFirestorePayload({
              accountType,
              top50: incoming,
              top20: incoming,
              cycleStartTime: currentCycle.startTime,
              lastUpdated: data.lastUpdated || Date.now(),
              updatedAt: serverTimestamp(),
            }), { merge: true }).catch(() => {});
          }
        }
      }
    } catch (_) {}

    // 2. Authoritative persistence in Firestore: ALWAYS write user record to leaderboard_traders
    const currentCycle = getDailyTradingCycleWindow(8);
    if (!isQuotaExceeded()) {
      const traderDocRef = doc(db, 'leaderboard_traders', syncKey);
      setDoc(traderDocRef, cleanFirestorePayload({
        ...traderRecord,
        cycleStartTime: currentCycle.startTime,
        updatedAt: serverTimestamp(),
      }), { merge: true }).catch((err) => {
        if (isQuotaError(err)) markQuotaExceeded(err);
      });
    }
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn('Leaderboard sync note:', err);
    } else {
      markQuotaExceeded(err);
    }
  }
}

/**
 * Builds the complete sorted Leaderboard list, merging real user performance with benchmark accounts.
 * Guarantees zero duplicate entries for the current user and completely distinct names across all ranks.
 */
export function buildRankedLeaderboard(
  accountType: 'live' | 'bonus',
  currentUser: {
    uid?: string;
    email?: string;
    displayName?: string;
    countryCode?: string;
    countryFlag?: string;
    avatar?: string;
    photoURL?: string;
  } | null,
  userStats: {
    netTodayProfit: number;
    profitPercentage: number;
    winRate: number;
    totalTradesToday: number;
  },
  config: LeaderboardConfig,
  isPublicView = false,
  syncedGlobalTop50?: (LeaderboardEntry & { rank: number })[]
): {
  top50: (LeaderboardEntry & { rank: number; isCurrentUser?: boolean })[];
  top20: (LeaderboardEntry & { rank: number; isCurrentUser?: boolean })[];
  userRank: number;
  userEntry: LeaderboardEntry & { rank: number; isCurrentUser?: boolean };
  gapToTop50: number;
  gapToTop20: number;
  rank50Profit: number;
  totalParticipants: number;
} {
  const currentCycle = getDailyTradingCycleWindow(8);
  const fallback = getDailyBenchmarkAccounts(accountType, currentCycle.startTime, Date.now());

  // Use the synchronized global Top 50 as authoritative base
  const baseTop50 = (syncedGlobalTop50 && syncedGlobalTop50.length > 0)
    ? syncedGlobalTop50
    : getStoredGlobalLeaderboard(accountType);

  // If viewing publicly (e.g. landing page) or user not signed in
  const isLoggedIn = !isPublicView && Boolean(currentUser?.uid || currentUser?.email);

  if (!isLoggedIn) {
    const publicList = (baseTop50 && baseTop50.length >= 40)
      ? baseTop50
      : cleanAndRankTop50(baseTop50 || [], fallback);

    const publicTop50 = publicList.slice(0, 50).map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
      isCurrentUser: false,
    }));

    const rank50Val = publicTop50.length >= 50 ? (publicTop50[49].todayProfit || 0) : 0;

    return {
      top50: publicTop50,
      top20: publicTop50,
      userRank: 999,
      userEntry: {
        ...publicTop50[0],
        rank: 1,
        isCurrentUser: false,
      },
      gapToTop50: rank50Val,
      gapToTop20: rank50Val,
      rank50Profit: rank50Val,
      totalParticipants: publicTop50.length + 1540,
    };
  }

  // Form authenticated user profile object with real-time stats
  const userCountry = COUNTRIES.find(c => c.code === (currentUser?.countryCode || 'BD')) || COUNTRIES[0];
  const rawName = resolveUserProfileName(currentUser, currentUser?.uid);
  const formattedUsername = cleanTraderDisplayName(rawName, currentUser?.uid);

  const currentUserEntry: LeaderboardEntry & { rank: number; isCurrentUser: boolean } = {
    id: currentUser?.uid ? `user_${currentUser.uid}` : 'current_user_id',
    userId: currentUser?.uid,
    username: formattedUsername,
    avatar: currentUser?.avatar || currentUser?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    countryCode: userCountry.code,
    countryName: userCountry.name,
    countryFlag: currentUser?.countryFlag || userCountry.flag,
    accountType,
    todayProfit: parseFloat(Number(userStats.netTodayProfit || 0).toFixed(2)),
    profitPercentage: userStats.profitPercentage || 0,
    winRate: userStats.winRate || 0,
    totalTrades: userStats.totalTradesToday || 0,
    isBenchmark: false,
    lastUpdated: Date.now(),
    rank: 999,
    isCurrentUser: true,
  };

  const normCurrentName = normalizeTraderName(formattedUsername);
  const isSameAsCurrentUser = (e: LeaderboardEntry) =>
    Boolean(
      (currentUser?.uid && (e.userId === currentUser.uid || e.id === currentUserEntry.id || e.id === `user_${currentUser.uid}`)) ||
      (normCurrentName && normalizeTraderName(e.username) === normCurrentName)
    );

  const baseList = (Array.isArray(baseTop50) && baseTop50.length >= 40)
    ? baseTop50
    : cleanAndRankTop50(baseTop50 || [], fallback);

  const existingIndexInTop50 = baseList.findIndex(isSameAsCurrentUser);
  const userProfit = Math.max(0, currentUserEntry.todayProfit || 0);

  let finalTop50: (LeaderboardEntry & { rank: number; isCurrentUser?: boolean })[];
  let calculatedUserRank = 999;
  let gapToTop50 = 0;

  if (existingIndexInTop50 >= 0) {
    // Current user is ALREADY positioned in the synchronized Top 50!
    // Update user entry with real-time stats and preserve all ranks
    calculatedUserRank = existingIndexInTop50 + 1;
    gapToTop50 = 0;

    finalTop50 = baseList.slice(0, 50).map((entry, idx) => {
      const isCur = idx === existingIndexInTop50;
      if (isCur) {
        return {
          ...entry,
          ...currentUserEntry,
          username: formattedUsername,
          rank: idx + 1,
          isCurrentUser: true,
        };
      }
      return {
        ...entry,
        username: cleanTraderDisplayName(entry.username, entry.userId),
        rank: idx + 1,
        isCurrentUser: false,
      };
    });
  } else if (userProfit > 0) {
    // Current user has profit and qualifies to enter Top 50: merge into baseList at exact position
    const merged = [currentUserEntry, ...baseList.filter(e => !isSameAsCurrentUser(e))];
    merged.sort((a, b) => {
      const profitA = typeof a.todayProfit === 'number' ? a.todayProfit : 0;
      const profitB = typeof b.todayProfit === 'number' ? b.todayProfit : 0;
      const pDiff = profitB - profitA;
      if (Math.abs(pDiff) > 0.001) return pDiff;
      const aIsReal = !a.isBenchmark && Boolean(a.userId || (a as any).isCurrentUser);
      const bIsReal = !b.isBenchmark && Boolean(b.userId || (b as any).isCurrentUser);
      if (aIsReal !== bIsReal) return aIsReal ? -1 : 1;
      return (b.winRate || 0) - (a.winRate || 0);
    });

    const userIdx = merged.findIndex(isSameAsCurrentUser);
    if (userIdx >= 0 && userIdx < 50) {
      calculatedUserRank = userIdx + 1;
      gapToTop50 = 0;
    } else {
      const rank50Profit = merged.length >= 50 ? (merged[49].todayProfit || 0) : 0;
      const deficit = Math.max(0, rank50Profit - userProfit);
      gapToTop50 = parseFloat(deficit.toFixed(2));
      calculatedUserRank = 50 + Math.max(1, Math.ceil(deficit / 25));
    }

    finalTop50 = merged.slice(0, 50).map((entry, idx) => {
      const isCur = Boolean(isSameAsCurrentUser(entry));
      return {
        ...entry,
        username: isCur ? formattedUsername : cleanTraderDisplayName(entry.username, entry.userId),
        rank: idx + 1,
        isCurrentUser: isCur,
      };
    });
  } else {
    // Current user profit is 0: user is outside Top 50.
    // Every single entry in baseList stays 100% stable and unchanged!
    const rank50Profit = baseList.length >= 50 ? (baseList[49].todayProfit || 0) : 0;
    gapToTop50 = parseFloat(rank50Profit.toFixed(2));
    calculatedUserRank = 50 + Math.max(1, Math.ceil(rank50Profit / 25));

    finalTop50 = baseList.slice(0, 50).map((entry, idx) => ({
      ...entry,
      username: cleanTraderDisplayName(entry.username, entry.userId),
      rank: idx + 1,
      isCurrentUser: false,
    }));
  }

  const rank50Profit = finalTop50.length >= 50 ? (finalTop50[49].todayProfit || 0) : 0;

  const userEntryObj: LeaderboardEntry & { rank: number; isCurrentUser?: boolean } = {
    ...currentUserEntry,
    rank: calculatedUserRank,
    isCurrentUser: true,
  };

  return {
    top50: finalTop50,
    top20: finalTop50,
    userRank: calculatedUserRank,
    userEntry: userEntryObj,
    gapToTop50,
    gapToTop20: gapToTop50,
    rank50Profit,
    totalParticipants: finalTop50.length + 1540,
  };
}
