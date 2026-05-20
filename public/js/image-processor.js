// Utilidad para redimensionar y convertir imágenes usando Canvas (Recorte central exacto a 800x800 px)
const ImageProcessor = {
  processImage: function(file, targetWidth = 800, targetHeight = 800) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          
          const ctx = canvas.getContext('2d');
          
          // Lógica de recorte central (center-crop) para mantener aspecto cuadrado de 800x800 px
          let srcX = 0;
          let srcY = 0;
          let srcWidth = img.width;
          let srcHeight = img.height;
          
          const imgRatio = img.width / img.height;
          const targetRatio = targetWidth / targetHeight;
          
          if (imgRatio > targetRatio) {
            // La imagen de origen es más ancha: se recortan los laterales
            srcWidth = img.height * targetRatio;
            srcX = (img.width - srcWidth) / 2;
          } else if (imgRatio < targetRatio) {
            // La imagen de origen es más alta: se recortan la parte superior e inferior
            srcHeight = img.width / targetRatio;
            srcY = (img.height - srcHeight) / 2;
          }
          
          // Dibujar la imagen recortada en el canvas
          ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, targetWidth, targetHeight);
          
          // Convertir a blob WebP
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("No se pudo generar el Blob de imagen WebP"));
            }
          }, 'image/webp', 0.8); // 80% calidad
        };
        
        img.onerror = (err) => reject(err);
      };
      
      reader.onerror = (err) => reject(err);
    });
  }
};
