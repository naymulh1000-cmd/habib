import { doc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth, isQuotaExceeded } from './firebase';

export const LEADERBOARD_DEFAULT_AVATARS: string[] = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1528892952291-009c663ce843?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
];

/**
 * Validates uploaded image file format and size
 */
export function validateAvatarFile(file: File): { valid: boolean; error?: string } {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  const fileNameLower = file.name.toLowerCase();
  const hasValidExt = allowedExtensions.some(ext => fileNameLower.endsWith(ext));
  const hasValidMime = allowedMimeTypes.includes(file.type);

  if (!hasValidExt && !hasValidMime) {
    return {
      valid: false,
      error: 'Please upload a valid image file (JPG, PNG, or WebP).'
    };
  }

  // Max 10MB original file before client compression
  const maxSizeBytes = 10 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: 'Image is too large. Please choose an image smaller than 10MB.'
    };
  }

  return { valid: true };
}

/**
 * Compresses and resizes an uploaded image file into a lightweight base64 WebP/JPEG data URL (approx 15-40 KB)
 */
export async function compressAndResizeAvatar(
  file: File,
  maxWidth = 320,
  maxHeight = 320,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Crop or scale to square
          const minDim = Math.min(width, height);
          const startX = (width - minDim) / 2;
          const startY = (height - minDim) / 2;

          const targetSize = Math.min(minDim, Math.max(maxWidth, maxHeight));
          canvas.width = targetSize;
          canvas.height = targetSize;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          // Smooth high quality scaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          ctx.drawImage(
            img,
            startX,
            startY,
            minDim,
            minDim,
            0,
            0,
            targetSize,
            targetSize
          );

          // Try WebP first for optimal compression, fallback to JPEG
          let dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl || dataUrl.startsWith('data:image/png')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(dataUrl);
        } catch (err) {
          console.warn('Canvas compression fallback to raw data url:', err);
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image for compression.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Saves the selected avatar URL to Firestore user document and Firebase Auth profile
 */
export async function saveUserAvatar(userUid: string, photoURL: string): Promise<boolean> {
  if (!userUid) return false;

  // 1. Save in localStorage immediately for local reactivity
  try {
    localStorage.setItem(`forex_user_avatar_${userUid}`, photoURL);
    localStorage.setItem('forex_pro_user_avatar', photoURL);
  } catch (_) {}

  // 2. Update Firebase Auth Profile if current user is logged in
  try {
    if (auth.currentUser && auth.currentUser.uid === userUid) {
      await updateProfile(auth.currentUser, { photoURL });
    }
  } catch (authErr) {
    console.warn('Firebase Auth updateProfile notice:', authErr);
  }

  // 3. Save to Firestore
  if (!isQuotaExceeded()) {
    try {
      const userRef = doc(db, 'users', userUid);
      await setDoc(userRef, {
        photoURL: photoURL,
        avatarUrl: photoURL,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (fsErr) {
      console.warn('Firestore user avatar update note:', fsErr);
    }
  }

  return true;
}
