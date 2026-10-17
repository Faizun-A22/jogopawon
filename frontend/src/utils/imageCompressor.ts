/**
 * Image Optimizer & WebP Compressor for JogoPawon
 * Mengompres foto kamera/galeri menjadi format WebP beresolusi tajam & ukuran ultra-ringan (~80% lebih kecil).
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 - 1.0 (default 0.85 untuk kejernihan optimal)
}

export interface CompressResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<CompressResult> {
  const { maxWidth = 1280, maxHeight = 1280, quality = 0.85 } = options;

  // Jika sudah SVG, pertahankan vektor aslinya
  if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 0,
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak didukung'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Hitung skala rasio agar tidak pecah/terdistorsi
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve({
            file,
            originalSize: file.size,
            compressedSize: file.size,
            compressionRatio: 0,
          });
        }

        // Setting rendering kualitas tinggi & jernih
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Gambar ke canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Ekspor ke WebP (format modern Google yang sangat ringan & tajam)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve({
                file,
                originalSize: file.size,
                compressedSize: file.size,
                compressionRatio: 0,
              });
            }

            // Ganti ekstensi nama file menjadi .webp
            const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            const newFileName = `${baseName}.webp`;

            const optimizedFile = new File([blob], newFileName, {
              type: 'image/webp',
              lastModified: Date.now(),
            });

            const ratio = Math.round(((file.size - optimizedFile.size) / file.size) * 100);

            console.log(
              `[ImageCompressor] ${file.name} (${(file.size / 1024).toFixed(1)} KB) -> ${newFileName} (${(optimizedFile.size / 1024).toFixed(1)} KB) [-${ratio}%]`
            );

            resolve({
              file: optimizedFile,
              originalSize: file.size,
              compressedSize: optimizedFile.size,
              compressionRatio: ratio,
            });
          },
          'image/webp',
          quality
        );
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
