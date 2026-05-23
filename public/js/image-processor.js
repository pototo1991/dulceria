// Utilidad para redimensionar y convertir imágenes usando Canvas.
// Redimensiona la imagen para que encaje completa dentro de un lienzo de 800x800 px (modo "contain"),
// rellenando los bordes sobrantes con fondo transparente para no recortar ni deformar la imagen.
const ImageProcessor = {
  processImage: function(file, targetSize = 800) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');
          
          // Limpiar canvas (fondo transparente)
          ctx.clearRect(0, 0, targetSize, targetSize);
          
          let dx = 0;
          let dy = 0;
          let dWidth = targetSize;
          let dHeight = targetSize;
          
          // Calcular dimensiones en modo "contain" (mantener relación de aspecto dentro del cuadrado)
          if (img.width > img.height) {
            dHeight = Math.round(img.height * (targetSize / img.width));
            dy = Math.round((targetSize - dHeight) / 2);
          } else if (img.height > img.width) {
            dWidth = Math.round(img.width * (targetSize / img.height));
            dx = Math.round((targetSize - dWidth) / 2);
          }
          
          // Dibujar la imagen escalada y centrada
          ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dWidth, dHeight);
          
          // Convertir a blob WebP
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('No se pudo generar el Blob de imagen WebP'));
            }
          }, 'image/webp', 0.85); // 85% calidad
        };
        
        img.onerror = (err) => reject(err);
      };
      
      reader.onerror = (err) => reject(err);
    });
  }
};
