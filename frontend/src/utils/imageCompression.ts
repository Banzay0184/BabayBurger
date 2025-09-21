/**
 * Утилиты для сжатия изображений перед загрузкой
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * Сжимает изображение с заданными параметрами
 */
export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> => {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    maxSizeKB = 500 // 500KB максимум
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        // Вычисляем новые размеры с сохранением пропорций
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        // Устанавливаем размеры canvas
        canvas.width = width;
        canvas.height = height;

        // Рисуем изображение на canvas
        ctx?.drawImage(img, 0, 0, width, height);

        // Конвертируем в blob с заданным качеством
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Не удалось сжать изображение'));
              return;
            }

            // Проверяем размер сжатого файла
            const compressedSizeKB = blob.size / 1024;
            
            if (compressedSizeKB > maxSizeKB) {
              // Если размер все еще слишком большой, уменьшаем качество
              const newQuality = Math.max(0.1, quality * (maxSizeKB / compressedSizeKB));
              canvas.toBlob(
                (finalBlob) => {
                  if (!finalBlob) {
                    reject(new Error('Не удалось сжать изображение до нужного размера'));
                    return;
                  }
                  
                  const compressedFile = new File([finalBlob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                  });

                  resolve({
                    file: compressedFile,
                    originalSize: file.size,
                    compressedSize: finalBlob.size,
                    compressionRatio: (1 - finalBlob.size / file.size) * 100
                  });
                },
                'image/jpeg',
                newQuality
              );
            } else {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });

              resolve({
                file: compressedFile,
                originalSize: file.size,
                compressedSize: blob.size,
                compressionRatio: (1 - blob.size / file.size) * 100
              });
            }
          },
          'image/jpeg',
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Не удалось загрузить изображение'));
    };

    // Загружаем изображение
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Проверяет, нужно ли сжимать изображение
 */
export const shouldCompressImage = (file: File, maxSizeKB: number = 500): boolean => {
  const fileSizeKB = file.size / 1024;
  return fileSizeKB > maxSizeKB;
};

/**
 * Получает оптимальные параметры сжатия на основе размера файла
 */
export const getOptimalCompressionOptions = (file: File): CompressionOptions => {
  const fileSizeMB = file.size / (1024 * 1024);
  
  if (fileSizeMB > 2) {
    // Очень большие файлы (>2MB)
    return {
      maxWidth: 800,
      maxHeight: 800,
      quality: 0.6,
      maxSizeKB: 300
    };
  } else if (fileSizeMB > 1) {
    // Большие файлы (1-2MB)
    return {
      maxWidth: 1000,
      maxHeight: 1000,
      quality: 0.7,
      maxSizeKB: 400
    };
  } else if (fileSizeMB > 0.5) {
    // Средние файлы (0.5-1MB)
    return {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.8,
      maxSizeKB: 500
    };
  } else {
    // Маленькие файлы (<0.5MB)
    return {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.9,
      maxSizeKB: 500
    };
  }
};

/**
 * Основная функция для сжатия изображения с автоматическим выбором параметров
 */
export const autoCompressImage = async (file: File): Promise<CompressionResult> => {
  if (!shouldCompressImage(file)) {
    // Если файл уже достаточно маленький, возвращаем его как есть
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 0
    };
  }

  const options = getOptimalCompressionOptions(file);
  return compressImage(file, options);
};
