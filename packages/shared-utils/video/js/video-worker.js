// video-worker.js - 专门处理图像编码的 Worker
// Worker 只进行简单的图像处理，避免传输复杂对象
self.onmessage = async (e) => {
  const { canvasData, timestamp, quality = 0.85 } = e.data;
  
  try {
    // canvasData 包含 canvas 的像素数据
    const { width, height, imageData } = canvasData;
    
    // 创建离屏画布
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // 如果有 ImageData，直接放入画布
    if (imageData) {
      ctx.putImageData(new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
      ), 0, 0);
    }
    
    // 转换为 Blob
    const frameBlob = await canvas.convertToBlob({ 
      type: 'image/webp', 
      quality: quality 
    });
    
    // 直接发送 Blob（不传输，让浏览器自动处理）
    self.postMessage({ 
      type: 'FRAME_ENCODED', 
      data: { timestamp, blob: frameBlob } 
    });
    
  } catch (error) {
    // 发送错误消息到主线程
    self.postMessage({ 
      type: 'ERROR', 
      error: error.message,
      timestamp 
    });
  }
};