// Image conversion utilities for client-side processing

export interface ImageConversionResult {
  blob: Blob;
  dataUrl: string;
  format: 'avif' | 'webp';
  originalSize: number;
  convertedSize: number;
}

export interface ImageConversionOptions {
  maxSizeKB?: number; // Default 50KB
  maxWidth?: number; // Default 1200px
  maxHeight?: number; // Default 1200px
  quality?: number; // Default 0.8
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'djelhfrfw';
const CLOUDINARY_UPLOAD_PRESET = 'syntxt-next';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Upload image to Cloudinary
 */
export async function uploadToCloudinary(file: File): Promise<CloudinaryUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'syntxt-posts');

  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }

  const data = await response.json();
  return {
    secure_url: data.secure_url,
    public_id: data.public_id,
    format: data.format,
    width: data.width,
    height: data.height,
    bytes: data.bytes,
  };
}

/**
 * Convert and upload image to Cloudinary
 * First resizes/optimizes locally, then uploads
 */
export async function convertAndUploadToCloudinary(
  file: File,
  options: ImageConversionOptions = {}
): Promise<{ url: string; dataUrl: string }> {
  const {
    maxSizeKB = 50,
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
  } = options;

  // Create image from file
  const img = await createImageFromFile(file);

  // Calculate dimensions while maintaining aspect ratio
  let width = img.width;
  let height = img.height;

  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw image
  ctx.drawImage(img, 0, 0, width, height);

  // Convert to blob for upload
  const useAvif = supportsAvif();
  const format = useAvif ? 'avif' : 'webp';
  const mimeType = useAvif ? 'image/avif' : 'image/webp';

  // Try to get under max size
  let currentQuality = quality;
  let blob: Blob | null = null;
  let dataUrl = '';
  let attempts = 0;
  const maxAttempts = 10;
  const maxBytes = maxSizeKB * 1024;

  while (attempts < maxAttempts) {
    dataUrl = canvas.toDataURL(mimeType, currentQuality);
    const response = await fetch(dataUrl);
    blob = await response.blob();

    if (blob.size <= maxBytes) {
      break;
    }

    currentQuality -= 0.1;
    attempts++;

    if (currentQuality < 0.1) {
      // Reduce dimensions
      canvas.width = Math.round(width * 0.8);
      canvas.height = Math.round(height * 0.8);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      currentQuality = quality;
      width = canvas.width;
      height = canvas.height;
    }
  }

  if (!blob) {
    dataUrl = canvas.toDataURL(mimeType, 0.1);
    const response = await fetch(dataUrl);
    blob = await response.blob();
  }

  // Upload to Cloudinary
  const fileToUpload = new File([blob], `image.${format}`, { type: mimeType });
  const result = await uploadToCloudinary(fileToUpload);

  return {
    url: result.secure_url,
    dataUrl,
  };
}

/**
 * Check if browser supports AVIF
 */
export function supportsAvif(): boolean {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/avif').startsWith('data:image/avif');
}

/**
 * Check if browser supports WebP
 */
export function supportsWebp(): boolean {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').startsWith('data:image/webp');
}

/**
 * Convert image file to AVIF/WebP format with size constraints
 */
export async function convertImage(
  file: File,
  options: ImageConversionOptions = {}
): Promise<ImageConversionResult> {
  const {
    maxSizeKB = 50,
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
  } = options;

  const maxBytes = maxSizeKB * 1024;
  const originalSize = file.size;

  // Create image from file
  const img = await createImageFromFile(file);

  // Calculate dimensions while maintaining aspect ratio
  let width = img.width;
  let height = img.height;

  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw image
  ctx.drawImage(img, 0, 0, width, height);

  // Determine format
  const useAvif = supportsAvif();
  const format = useAvif ? 'avif' : 'webp';
  const mimeType = useAvif ? 'image/avif' : 'image/webp';

  // Try different quality levels to get under max size
  let currentQuality = quality;
  let blob: Blob | null = null;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const dataUrl = canvas.toDataURL(mimeType, currentQuality);
    
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    blob = await response.blob();

    if (blob.size <= maxBytes) {
      return {
        blob,
        dataUrl,
        format,
        originalSize,
        convertedSize: blob.size,
      };
    }

    // Reduce quality and try again
    currentQuality -= 0.1;
    attempts++;

    if (currentQuality < 0.1) {
      // If quality is too low, try reducing dimensions
      canvas.width = Math.round(width * 0.8);
      canvas.height = Math.round(height * 0.8);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      currentQuality = quality;
      width = canvas.width;
      height = canvas.height;
    }
  }

  // If still too large, return the smallest version
  const dataUrl = canvas.toDataURL(mimeType, 0.1);
  const response = await fetch(dataUrl);
  blob = await response.blob();

  return {
    blob,
    dataUrl,
    format,
    originalSize,
    convertedSize: blob.size,
  };
}

/**
 * Create HTMLImageElement from File
 */
function createImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
  
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please upload JPEG, PNG, GIF, WebP, or AVIF.' };
  }

  const maxSizeMB = 10; // Max original file size
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File too large. Maximum size is ${maxSizeMB}MB.` };
  }

  return { valid: true };
}

/**
 * Generate image placeholder (blur data URL)
 */
export function generatePlaceholder(width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);
  }
  
  return canvas.toDataURL('image/jpeg', 0.1);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
