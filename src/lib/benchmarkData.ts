/**
 * Master Pool of 80+ completely unique international traders with distinct names, countries, flags & avatars.
 * Used across the application and server to ensure identical, deterministic benchmark data.
 */

export interface TraderIdentity {
  id: string;
  name: string;
  countryCode: string;
  countryName: string;
  countryFlag: string;
  avatar: string;
}

export function normalizeTraderName(name: string): string {
  return (name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export const MASTER_TRADER_POOL: TraderIdentity[] = [
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

  // Additional Global Traders to support 100+ unique identities for Top 50 (Live & Bonus)
  { id: 't_my_1', name: 'Farhan_Aziz_KL', countryCode: 'MY', countryName: 'Malaysia', countryFlag: '🇲🇾', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_my_2', name: 'Alvin_Tan_MY', countryCode: 'MY', countryName: 'Malaysia', countryFlag: '🇲🇾', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { id: 't_id_1', name: 'Budi_Santoso_JKT', countryCode: 'ID', countryName: 'Indonesia', countryFlag: '🇮🇩', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
  { id: 't_id_2', name: 'Reza_Pratama_ID', countryCode: 'ID', countryName: 'Indonesia', countryFlag: '🇮🇩', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80' },
  { id: 't_th_1', name: 'Somchai_BKK', countryCode: 'TH', countryName: 'Thailand', countryFlag: '🇹🇭', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { id: 't_th_2', name: 'Anan_Chai_TH', countryCode: 'TH', countryName: 'Thailand', countryFlag: '🇹🇭', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_kr_1', name: 'Min_Jun_Kim_SEO', countryCode: 'KR', countryName: 'South Korea', countryFlag: '🇰🇷', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
  { id: 't_kr_2', name: 'Ji_Hoon_Park_KR', countryCode: 'KR', countryName: 'South Korea', countryFlag: '🇰🇷', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
  { id: 't_ph_1', name: 'Mark_Reyes_MNL', countryCode: 'PH', countryName: 'Philippines', countryFlag: '🇵🇭', avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80' },
  { id: 't_ph_2', name: 'Angelo_Santos_PH', countryCode: 'PH', countryName: 'Philippines', countryFlag: '🇵🇭', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_vn_1', name: 'Nguyen_Van_Huy', countryCode: 'VN', countryName: 'Vietnam', countryFlag: '🇻🇳', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },
  { id: 't_vn_2', name: 'Tran_Quoc_Bao', countryCode: 'VN', countryName: 'Vietnam', countryFlag: '🇻🇳', avatar: 'https://images.unsplash.com/photo-1528892952291-009c663ce843?w=150&auto=format&fit=crop&q=80' },
  { id: 't_pk_1', name: 'Hamza_Malik_KHI', countryCode: 'PK', countryName: 'Pakistan', countryFlag: '🇵🇰', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { id: 't_pk_2', name: 'Bilal_Khan_LHR', countryCode: 'PK', countryName: 'Pakistan', countryFlag: '🇵🇰', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_lk_1', name: 'Kasun_Perera_CMB', countryCode: 'LK', countryName: 'Sri Lanka', countryFlag: '🇱🇰', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { id: 't_lk_2', name: 'Dinesh_Fernando', countryCode: 'LK', countryName: 'Sri Lanka', countryFlag: '🇱🇰', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80' },
  { id: 't_ng_1', name: 'Emeka_Okonkwo_LOS', countryCode: 'NG', countryName: 'Nigeria', countryFlag: '🇳🇬', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' },
  { id: 't_ng_2', name: 'Chidi_Adeyemi_NG', countryCode: 'NG', countryName: 'Nigeria', countryFlag: '🇳🇬', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_za_1', name: 'Sipho_Nkosi_JHB', countryCode: 'ZA', countryName: 'South Africa', countryFlag: '🇿🇦', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
  { id: 't_za_2', name: 'Johan_Van_Wyk_CPT', countryCode: 'ZA', countryName: 'South Africa', countryFlag: '🇿🇦', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
  { id: 't_eg_1', name: 'Ahmed_Mansour_CAI', countryCode: 'EG', countryName: 'Egypt', countryFlag: '🇪🇬', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },
  { id: 't_eg_2', name: 'Mahmoud_Hassan_EG', countryCode: 'EG', countryName: 'Egypt', countryFlag: '🇪🇬', avatar: 'https://images.unsplash.com/photo-1528892952291-009c663ce843?w=150&auto=format&fit=crop&q=80' },
  { id: 't_ke_1', name: 'Brian_Kipkorir_NBO', countryCode: 'KE', countryName: 'Kenya', countryFlag: '🇰🇪', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
  { id: 't_ma_1', name: 'Youssef_Benali_CAS', countryCode: 'MA', countryName: 'Morocco', countryFlag: '🇲🇦', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_gh_1', name: 'Kwame_Asante_ACC', countryCode: 'GH', countryName: 'Ghana', countryFlag: '🇬🇭', avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80' },
  { id: 't_mx_1', name: 'Alejandro_Hernandez_MX', countryCode: 'MX', countryName: 'Mexico', countryFlag: '🇲🇽', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80' },
  { id: 't_mx_2', name: 'Rodrigo_Castillo_MEX', countryCode: 'MX', countryName: 'Mexico', countryFlag: '🇲🇽', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_ar_1', name: 'Santiago_Fernandez_BA', countryCode: 'AR', countryName: 'Argentina', countryFlag: '🇦🇷', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { id: 't_ar_2', name: 'Joaquin_Romero_ARG', countryCode: 'AR', countryName: 'Argentina', countryFlag: '🇦🇷', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
  { id: 't_co_1', name: 'Sebastian_Gomez_BOG', countryCode: 'CO', countryName: 'Colombia', countryFlag: '🇨🇴', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { id: 't_cl_1', name: 'Nicolas_Vargas_SCL', countryCode: 'CL', countryName: 'Chile', countryFlag: '🇨🇱', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_no_1', name: 'Magnus_Hansen_OSL', countryCode: 'NO', countryName: 'Norway', countryFlag: '🇳🇴', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
  { id: 't_dk_1', name: 'Frederik_Jensen_CPH', countryCode: 'DK', countryName: 'Denmark', countryFlag: '🇩🇰', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
  { id: 't_fi_1', name: 'Aleksi_Virtanen_HEL', countryCode: 'FI', countryName: 'Finland', countryFlag: '🇫🇮', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },
  { id: 't_pl_1', name: 'Jakub_Kowalski_WAW', countryCode: 'PL', countryName: 'Poland', countryFlag: '🇵🇱', avatar: 'https://images.unsplash.com/photo-1528892952291-009c663ce843?w=150&auto=format&fit=crop&q=80' },
  { id: 't_at_1', name: 'Florian_Gruber_VIE', countryCode: 'AT', countryName: 'Austria', countryFlag: '🇦🇹', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
  { id: 't_be_1', name: 'Maxime_Wouters_BRU', countryCode: 'BE', countryName: 'Belgium', countryFlag: '🇧🇪', avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80' },
  { id: 't_pt_1', name: 'Rodrigo_Pereira_LIS', countryCode: 'PT', countryName: 'Portugal', countryFlag: '🇵🇹', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80' },
  { id: 't_ie_1', name: 'Conor_O_Brien_DUB', countryCode: 'IE', countryName: 'Ireland', countryFlag: '🇮🇪', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_nz_1', name: 'Oliver_Campbell_AKL', countryCode: 'NZ', countryName: 'New Zealand', countryFlag: '🇳🇿', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
  { id: 't_bd_5', name: 'Shahidul_Islam_CTG', countryCode: 'BD', countryName: 'Bangladesh', countryFlag: '🇧🇩', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
  { id: 't_in_5', name: 'Devendra_Reddy_HYD', countryCode: 'IN', countryName: 'India', countryFlag: '🇮🇳', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_ae_5', name: 'Sultan_Al_Qasimi_SHJ', countryCode: 'AE', countryName: 'United Arab Emirates', countryFlag: '🇦🇪', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
  { id: 't_gb_5', name: 'Edward_Sterling_MAN', countryCode: 'GB', countryName: 'United Kingdom', countryFlag: '🇬🇧', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },
  { id: 't_us_5', name: 'Brandon_Cole_CHI', countryCode: 'US', countryName: 'United States', countryFlag: '🇺🇸', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
  { id: 't_de_5', name: 'Tobias_Zimmermann_MUC', countryCode: 'DE', countryName: 'Germany', countryFlag: '🇩🇪', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
];

// Dynamic Qualification: Any profit > 0 competes directly against Rank #50
export const MIN_LEADERBOARD_PROFIT_QUALIFY = 0;
export const LEADERBOARD_MAX_PUBLIC_PROFIT = 20000;

/**
 * Formats leaderboard profit for display (Quotex-style):
 * - If profit >= $20,000:
 *   - The user themselves can see their exact profit amount (e.g. +$24,560.50).
 *   - Other users / public viewers see "+$20,000+" to protect high-earner privacy.
 * - Otherwise, displays the exact formatted dollar amount.
 */
export function formatLeaderboardProfit(profit: number, isSelf = false): string {
  const num = typeof profit === 'number' && !isNaN(profit) ? profit : 0;
  if (num >= LEADERBOARD_MAX_PUBLIC_PROFIT && !isSelf) {
    return '+$20,000+';
  }
  const sign = num >= 0 ? '+' : '-';
  const formatted = Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sign}$${formatted}`;
}

export function formatLeaderboardGain(percentage: number, profit: number, isSelf = false): string {
  const num = typeof profit === 'number' && !isNaN(profit) ? profit : 0;
  if (num >= LEADERBOARD_MAX_PUBLIC_PROFIT && !isSelf) {
    return '+200%+ Gain';
  }
  return `+${(percentage || 0).toFixed(1)}% Gain`;
}

export interface BaseLeaderboardEntry {
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
  rank?: number;
  lastUpdated?: number;
}

export function getDailyTradingCycleWindow(resetHourUtc = 8, referenceDate = new Date()): {
  startTime: number;
  endTime: number;
  now: number;
  remainingMs: number;
} {
  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const nowMs = ref.getTime();

  const todayReset = new Date(ref.getTime());
  todayReset.setUTCHours(resetHourUtc, 0, 0, 0);

  let cycleStart: Date;
  let cycleEnd: Date;

  if (nowMs >= todayReset.getTime()) {
    cycleStart = todayReset;
    const next = new Date(todayReset.getTime());
    next.setUTCDate(next.getUTCDate() + 1);
    cycleEnd = next;
  } else {
    const prev = new Date(todayReset.getTime());
    prev.setUTCDate(prev.getUTCDate() - 1);
    cycleStart = prev;
    cycleEnd = todayReset;
  }

  const remainingMs = Math.max(0, cycleEnd.getTime() - nowMs);

  return {
    startTime: cycleStart.getTime(),
    endTime: cycleEnd.getTime(),
    now: nowMs,
    remainingMs,
  };
}

export function getDailyBenchmarkAccounts(
  accountType: 'live' | 'bonus',
  cycleStartTime?: number,
  currentTime = Date.now()
): BaseLeaderboardEntry[] {
  // 8:00 AM UTC reference cycle
  const refDate = new Date(currentTime);
  const cycleWindow = getDailyTradingCycleWindow(8, refDate);
  const cycleTime = typeof cycleStartTime === 'number' && cycleStartTime > 0
    ? cycleStartTime
    : cycleWindow.startTime;

  const dayIndex = Math.floor(cycleTime / 86400000);
  const totalPool = MASTER_TRADER_POOL.length;
  // Live and Bonus have completely separate trader selections (zero name overlap)
  const typeOffset = accountType === 'live' ? 0 : 37;
  const startOffset = (Math.abs(dayIndex * 7) + typeOffset) % totalPool;

  const selectedTraders: TraderIdentity[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < totalPool; i++) {
    const candidate = MASTER_TRADER_POOL[(startOffset + i) % totalPool];
    const norm = normalizeTraderName(candidate.name);
    if (!usedNames.has(norm)) {
      usedNames.add(norm);
      selectedTraders.push(candidate);
      if (selectedTraders.length === 50) break;
    }
  }

  // 24-hour cycle progression: from 2:00 PM BST (8:00 AM UTC) to 2:00 PM BST next day
  const elapsedMs = Math.max(0, Math.min(86400000, currentTime - cycleTime));
  // Stabilize to 10-minute intervals so ranks and numbers are rock-solid and do not flicker or jump across polls
  const stableElapsedMs = Math.floor(elapsedMs / 600000) * 600000;
  const elapsedHours = stableElapsedMs / 3600000; // 0.0 to 24.0 hours

  const isBonus = accountType === 'bonus';
  const typeSeed = isBonus ? 61 : 23;
  // Maximum peak strictly between 20,000 and 30,000 USD
  const maxPeakCap = isBonus ? 28800 : 27500;

  // Normalized progress curve across 24h: strictly 0.0 at 2:00 PM (elapsedMs = 0), rising to 1.0 by 24h
  const timeRatio = Math.min(1.0, elapsedHours / 24.0);
  const progressCurve = elapsedHours <= 0.0005 ? 0 : Math.pow(timeRatio, 0.92);

  const tradersWithProfit = selectedTraders.map((t, idx) => {
    // Unique seed per trader for deterministic variety
    const traderSeed = (dayIndex * 41 + idx * 19 + typeSeed) % 100;
    const rankWeight = (49 - idx) / 49; // 1.0 for top down to 0.0 for 50th

    // Daily peak target for this rank:
    // Rank 1 targets $24k - $28.5k
    // Rank 10 targets $12k - $16k
    // Rank 25 targets $3.5k - $5.5k
    // Rank 50 targets $510 - $650 (reaches $500 qualification by afternoon/evening)
    const targetPeak = isBonus ? 28500 : 27000;
    const rankDailyTarget = 520.00 + (traderSeed % 30) + 
      Math.pow(rankWeight, 2.35) * (targetPeak - 650) + 
      Math.pow(rankWeight, 1.2) * 850;

    // Base accumulated profit starting strictly at $0.00 at 2:00 PM
    let calculatedProfit = rankDailyTarget * progressCurve;

    // Organic intra-hour trading waves (scaled with elapsed hours, strictly 0 at 2:00 PM)
    if (elapsedHours > 0.0005) {
      const sessionPhase = (idx * 2.8 + (isBonus ? 1.4 : 0));
      const waveAmplitude = Math.min(22, rankWeight * 18 + 1.5) * Math.min(1.0, elapsedHours / 1.5);
      calculatedProfit += Math.sin((elapsedHours * 0.48) + sessionPhase) * waveAmplitude;
    }

    // Deterministic micro-cent jitter (strictly 0 at 2:00 PM)
    const centJitter = elapsedHours <= 0.0005 ? 0 : (((dayIndex * 43 + idx * 31 + Math.floor(stableElapsedMs / 600000)) % 93) / 100);

    // Final profit: strictly 0.00 at 2:00 PM reset, smoothly rising throughout the 24-hour cycle
    const finalProfit = elapsedHours <= 0.0005 
      ? 0.00 
      : parseFloat(Math.min(maxPeakCap, Math.max(0, calculatedProfit + centJitter)).toFixed(2));

    // Dynamic trades count that advances with time from 0 trades at 2:00 PM
    const maxTargetTrades = 12 + Math.floor(rankWeight * 48);
    const totalTrades = elapsedHours <= 0.0005 
      ? 0 
      : Math.max(1, Math.floor(maxTargetTrades * progressCurve));

    // Win rate realistic variations (0 at 2:00 PM reset)
    const winRate = elapsedHours <= 0.0005 
      ? 0.0 
      : parseFloat((78 + rankWeight * 16 + Math.sin(elapsedHours + idx) * 1.2).toFixed(1));

    // Profit percentage (0 at 2:00 PM reset)
    const profitPercentage = elapsedHours <= 0.0005 
      ? 0.0 
      : parseFloat(Math.min(320, (finalProfit / 100) * 0.95 + (rankWeight * 12)).toFixed(1));

    return {
      id: `${accountType}_d${dayIndex}_${t.id}`,
      username: t.name,
      avatar: t.avatar,
      countryCode: t.countryCode,
      countryName: t.countryName,
      countryFlag: t.countryFlag,
      accountType,
      todayProfit: finalProfit,
      profitPercentage,
      winRate,
      totalTrades,
      isBenchmark: true,
      lastUpdated: cycleTime + stableElapsedMs,
    };
  });

  // Sort descending by todayProfit so positions dynamically change as profits fluctuate
  tradersWithProfit.sort((a, b) => b.todayProfit - a.todayProfit);

  // Assign sequential ranks 1 to 50
  return tradersWithProfit.map((trader, i) => ({
    ...trader,
    rank: i + 1,
  }));
}

/**
 * Deduplicates, merges and strictly ranks candidate entries (real users) and fallback benchmarks.
 * Guarantees zero duplicate entries and consecutive ranks 1 to 50.
 */
export function cleanAndRankTop50(
  candidates: BaseLeaderboardEntry[],
  fallbackBenchmarks: BaseLeaderboardEntry[]
): (BaseLeaderboardEntry & { rank: number })[] {
  const mergedPool: BaseLeaderboardEntry[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  const processEntry = (item: BaseLeaderboardEntry, isCandidate = false) => {
    if (!item || !item.username) return;

    let cleanUsername = item.username.trim();
    if (cleanUsername.includes('@')) {
      // Never show email or Gmail ID
      if (typeof window !== 'undefined' && item.userId) {
        try {
          const stored = localStorage.getItem(`forex_user_display_name_${item.userId}`);
          if (stored && !stored.includes('@')) {
            cleanUsername = stored.trim();
          } else {
            cleanUsername = cleanUsername.split('@')[0].replace(/[._\-+]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
          }
        } catch (_) {
          cleanUsername = cleanUsername.split('@')[0].replace(/[._\-+]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
        }
      } else {
        cleanUsername = cleanUsername.split('@')[0].replace(/[._\-+]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
      }
    }
    if (!cleanUsername || cleanUsername.length < 2) {
      cleanUsername = item.userId ? `Trader ${item.userId.slice(-4).toUpperCase()}` : 'Trader';
    }

    const cleanedItem: BaseLeaderboardEntry = {
      ...item,
      username: cleanUsername,
    };

    const uniqueKey = (cleanedItem.userId ? `user_${cleanedItem.userId}` : cleanedItem.id).trim();
    const normName = normalizeTraderName(cleanedItem.username);
    if (!normName) return;

    const idSeen = seenIds.has(uniqueKey);
    const nameSeen = seenNames.has(normName);

    if (idSeen || nameSeen) {
      const existingIdx = mergedPool.findIndex(
        e => (uniqueKey && (e.id === uniqueKey || (e.userId && `user_${e.userId}` === uniqueKey))) ||
             normalizeTraderName(e.username) === normName
      );

      if (existingIdx >= 0) {
        const existing = mergedPool[existingIdx];
        const incomingIsReal = isCandidate || (!cleanedItem.isBenchmark && Boolean(cleanedItem.userId));
        const existingIsReal = !existing.isBenchmark && Boolean(existing.userId);

        if (incomingIsReal && !existingIsReal) {
          // Real user takes precedence over benchmark
          const updatedEntry: BaseLeaderboardEntry = {
            ...cleanedItem,
            id: cleanedItem.id || uniqueKey,
            todayProfit: typeof cleanedItem.todayProfit === 'number' ? cleanedItem.todayProfit : 0,
            profitPercentage: typeof cleanedItem.profitPercentage === 'number' ? cleanedItem.profitPercentage : 0,
            winRate: typeof cleanedItem.winRate === 'number' ? cleanedItem.winRate : 0,
            totalTrades: typeof cleanedItem.totalTrades === 'number' ? cleanedItem.totalTrades : 0,
            lastUpdated: typeof cleanedItem.lastUpdated === 'number' ? cleanedItem.lastUpdated : Date.now(),
            isBenchmark: false,
          };
          const uid = cleanedItem.userId || (uniqueKey.startsWith('user_') ? uniqueKey.replace('user_', '') : '');
          if (uid) {
            updatedEntry.userId = uid;
          } else {
            delete updatedEntry.userId;
          }

          mergedPool[existingIdx] = updatedEntry;
          seenIds.add(uniqueKey);
          seenNames.add(normName);
        } else if (incomingIsReal && existingIsReal) {
          // Always update real user with latest metrics
          mergedPool[existingIdx] = {
            ...existing,
            ...cleanedItem,
            todayProfit: typeof cleanedItem.todayProfit === 'number' ? cleanedItem.todayProfit : existing.todayProfit,
            profitPercentage: typeof cleanedItem.profitPercentage === 'number' ? cleanedItem.profitPercentage : existing.profitPercentage,
            winRate: typeof cleanedItem.winRate === 'number' ? cleanedItem.winRate : existing.winRate,
            totalTrades: typeof cleanedItem.totalTrades === 'number' ? cleanedItem.totalTrades : existing.totalTrades,
            lastUpdated: Date.now(),
          };
        }
      }
      return;
    }

    seenIds.add(uniqueKey);
    seenNames.add(normName);

    const newEntry: BaseLeaderboardEntry = {
      ...cleanedItem,
      id: cleanedItem.id || uniqueKey,
      todayProfit: typeof cleanedItem.todayProfit === 'number' ? cleanedItem.todayProfit : 0,
      profitPercentage: typeof cleanedItem.profitPercentage === 'number' ? cleanedItem.profitPercentage : 0,
      winRate: typeof cleanedItem.winRate === 'number' ? cleanedItem.winRate : 0,
      totalTrades: typeof cleanedItem.totalTrades === 'number' ? cleanedItem.totalTrades : 0,
      lastUpdated: typeof cleanedItem.lastUpdated === 'number' ? cleanedItem.lastUpdated : Date.now(),
      isBenchmark: cleanedItem.isBenchmark ?? !cleanedItem.userId,
    };
    const uid = cleanedItem.userId || (uniqueKey.startsWith('user_') ? uniqueKey.replace('user_', '') : '');
    if (uid) {
      newEntry.userId = uid;
    } else {
      delete newEntry.userId;
    }

    mergedPool.push(newEntry);
  };

  // 1. Add real candidates first (guaranteed precedence)
  (candidates || []).forEach(c => {
    const isReal = !c.isBenchmark && (Boolean(c.userId) || c.id?.startsWith('user_'));
    if (isReal) {
      processEntry(c, true);
    }
  });

  // 2. Then add fallback benchmarks
  (fallbackBenchmarks || []).forEach(b => processEntry(b, false));

  // 3. Add any other non-real candidates if space remains
  (candidates || []).forEach(c => {
    const isReal = !c.isBenchmark && (Boolean(c.userId) || c.id?.startsWith('user_'));
    if (!isReal) {
      processEntry(c, false);
    }
  });

  // Dynamic Rank Qualification: All traders in mergedPool compete directly based on their net today's profit.
  // Real traders with positive today's profit (> $0.00) and benchmarks are included.
  const realTradersWithProfit = mergedPool.filter(e => !e.isBenchmark && (e.todayProfit || 0) > 0);
  const benchmarkEntries = mergedPool.filter(e => e.isBenchmark);

  // Combine real traders with positive profit and benchmarks
  const combined = [...realTradersWithProfit, ...benchmarkEntries];

  // If combined has fewer than 50 due to duplicate removals or small pool, fill from backup reserve pool
  if (combined.length < 50) {
    const cycleWindow = getDailyTradingCycleWindow(8);
    const targetType = (candidates[0]?.accountType || fallbackBenchmarks[0]?.accountType || 'live') as 'live' | 'bonus';
    const backupPool = getDailyBenchmarkAccounts(targetType, cycleWindow.startTime + 86400000, Date.now());
    for (const reserve of backupPool) {
      if (combined.length >= 50) break;
      const norm = normalizeTraderName(reserve.username);
      if (!combined.some(e => normalizeTraderName(e.username) === norm)) {
        combined.push({ ...reserve, isBenchmark: true });
      }
    }
  }

  // Strict descending sort: highest profit first (mathematically guaranteed descending order)
  combined.sort((a, b) => {
    const profitA = typeof a.todayProfit === 'number' ? a.todayProfit : 0;
    const profitB = typeof b.todayProfit === 'number' ? b.todayProfit : 0;
    const pDiff = profitB - profitA;
    if (Math.abs(pDiff) > 0.001) return pDiff;
    
    // Real members win tie-breakers with equal profit
    const aIsReal = !a.isBenchmark && Boolean(a.userId);
    const bIsReal = !b.isBenchmark && Boolean(b.userId);
    if (aIsReal !== bIsReal) return aIsReal ? -1 : 1;
    
    const wrA = typeof a.winRate === 'number' ? a.winRate : 0;
    const wrB = typeof b.winRate === 'number' ? b.winRate : 0;
    if (Math.abs(wrB - wrA) > 0.01) return wrB - wrA;
    
    const trA = typeof a.totalTrades === 'number' ? a.totalTrades : 0;
    const trB = typeof b.totalTrades === 'number' ? b.totalTrades : 0;
    if (trB !== trA) return trB - trA;

    return (a.id || a.username || '').localeCompare(b.id || b.username || '');
  });

  // Pick top 50 and assign strictly consecutive ranks 1 to 50
  return combined.slice(0, 50).map((entry, idx) => {
    const item: BaseLeaderboardEntry & { rank: number } = {
      ...entry,
      todayProfit: typeof entry.todayProfit === 'number' ? entry.todayProfit : 0,
      profitPercentage: typeof entry.profitPercentage === 'number' ? entry.profitPercentage : 0,
      winRate: typeof entry.winRate === 'number' ? entry.winRate : 0,
      totalTrades: typeof entry.totalTrades === 'number' ? entry.totalTrades : 0,
      rank: idx + 1,
    };
    if (!item.userId) {
      delete item.userId;
    }
    return item;
  });
}

/**
 * Backward compatibility alias: cleanAndRankTop20 now returns the clean ranked Top 50.
 */
export const cleanAndRankTop20 = cleanAndRankTop50;

export const DEFAULT_BENCHMARK_LIVE: BaseLeaderboardEntry[] = getDailyBenchmarkAccounts('live');
export const DEFAULT_BENCHMARK_BONUS: BaseLeaderboardEntry[] = getDailyBenchmarkAccounts('bonus');
