/**
 * 이미지 압축 유틸리티 (Canvas API 활용)
 * 1. 지정된 최대 크기로 리사이즈
 * 2. WebP/JPEG 변환 및 화질 조절을 통해 용량 최적화
 */
export async function compressImage(file: File, maxWidth = 1024, quality = 0.7): Promise<{ blob: Blob; url: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // 가로 너비 기준 비율 유지 리사이징
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas context not available');

        ctx.drawImage(img, 0, 0, width, height);

        // WebP 지원 시 WebP 사용, 아니면 JPEG
        const type = 'image/webp';
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({
                blob,
                url: URL.createObjectURL(blob),
              });
            } else {
              reject('Blob generation failed');
            }
          },
          type,
          quality
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}
