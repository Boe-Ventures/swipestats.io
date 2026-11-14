/**
 * Simple client-side image optimization utilities
 *
 * Keep this really simple - basic resize and compress only.
 * Avoid heavy dependencies and complex transformations.
 *
 * Future extensibility:
 * - WebP conversion (where supported)
 * - Smart aspect ratio cropping
 * - Progressive JPEG encoding
 * - EXIF data stripping for privacy
 */

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: "jpeg" | "png" | "webp" | "auto";
}

export interface OptimizedImage {
  file: File;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
}

/**
 * Simple image optimization using canvas
 * Only resize and compress - no complex transformations
 */
export async function optimizeImage(
  file: File,
  options: ImageOptimizationOptions = {},
): Promise<OptimizedImage> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    format = "auto",
  } = options;

  return new Promise((resolve, reject) => {
    // Only process images
    if (!file.type.startsWith("image/")) {
      reject(new Error("File is not an image"));
      return;
    }

    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Canvas context not available"));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      // Set canvas size
      canvas.width = width;
      canvas.height = height;

      // Draw and compress image
      ctx.drawImage(img, 0, 0, width, height);

      // Determine output format
      let outputFormat = file.type;
      if (format === "auto") {
        // Keep original format for simple optimization
        outputFormat = file.type;
      } else if (format === "webp" && supportsWebP()) {
        outputFormat = "image/webp";
      } else {
        outputFormat = `image/${format}`;
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to optimize image"));
            return;
          }

          const optimizedFile = new File([blob], file.name, {
            type: outputFormat,
            lastModified: Date.now(),
          });

          resolve({
            file: optimizedFile,
            originalSize: file.size,
            optimizedSize: optimizedFile.size,
            compressionRatio: file.size / optimizedFile.size,
            width,
            height,
          });
        },
        outputFormat,
        quality,
      );
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Check if browser supports WebP
 */
function supportsWebP(): boolean {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL("image/webp").indexOf("image/webp") === 5;
}

/**
 * Should we optimize this image?
 * Only optimize if image is larger than thresholds
 */
export function shouldOptimizeImage(
  file: File,
  options: { maxSize?: number; maxWidth?: number; maxHeight?: number } = {},
): boolean {
  const { maxSize = 2 * 1024 * 1024 } = options; // 2MB default

  // Skip optimization for small files
  if (file.size < maxSize) {
    return false;
  }

  // Skip GIFs (preserve animation)
  if (file.type === "image/gif") {
    return false;
  }

  return true;
}

/*
 * Example usage in upload components:
 *
 * ```tsx
 * const handleFileSelect = async (file: File) => {
 *   let fileToUpload = file;
 *
 *   if (shouldOptimizeImage(file, { maxSize: 2 * 1024 * 1024 })) {
 *     try {
 *       const optimized = await optimizeImage(file, {
 *         maxWidth: 800,
 *         maxHeight: 600,
 *         quality: 0.8,
 *         format: 'auto'
 *       });
 *
 *       console.log(`Optimized: ${optimized.originalSize} → ${optimized.optimizedSize} bytes`);
 *       fileToUpload = optimized.file;
 *     } catch (error) {
 *       console.warn('Image optimization failed, using original:', error);
 *       // Fallback to original file
 *     }
 *   }
 *
 *   // Proceed with upload
 *   await uploadImage(fileToUpload);
 * };
 * ```
 *
 * This keeps optimization simple and optional - if it fails, we just use the original.
 */
