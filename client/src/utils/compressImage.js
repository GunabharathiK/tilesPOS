/**
 * Compresses an image file using Canvas API before converting to base64.
 * @param {File} file - The image file from input
 * @param {number} maxWidth - Max width in px (default 400)
 * @param {number} quality - JPEG quality 0-1 (default 0.6)
 * @returns {Promise<string>} - Compressed base64 string
 */
const compressImage = (file, maxWidth = 400, quality = 0.6) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions keeping aspect ratio
        let width  = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width  = maxWidth;
        }

        // Draw on canvas at reduced size
        const canvas    = document.createElement("canvas");
        canvas.width    = width;
        canvas.height   = height;
        const ctx       = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Export as compressed JPEG base64
        const compressed = canvas.toDataURL("image/jpeg", quality);
        resolve(compressed);
      };
      img.onerror = reject;
      img.src     = e.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default compressImage;