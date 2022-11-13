import { ZoomAxis } from './js/ZoomAxis'
export function setupAxis(horizontal: HTMLButtonElement, vertical: HTMLButtonElement) {
  let zoomRatio = 1;
  let contrlKey = false;
  // 初始化时间轴
  const zoomAxisHorizontal = new ZoomAxis({
    el: horizontal,
    totalMarks: 500,
  });
  const zoomAxisVertical = new ZoomAxis({
    el: vertical,
    totalMarks: 500,
    vertical: true,
  });
  const zoomIn = () => {
    zoomRatio += 0.1;
  };
  const zoomOut = () => {
    zoomRatio -= 0.1;
  };
  const syncByZoom = (zoom: number) => {
    // 根据缩放比较，减小滚动宽度
    if (zoom) {
      zoomAxisHorizontal?.zoom(zoom);
      zoomAxisVertical?.zoom(zoom);
    }
  }
  const handleWheel = (e: WheelEvent) => {
    console.log(contrlKey)
    if(!contrlKey){
      return
    }
    e.preventDefault();
    e.deltaY > 0 ? zoomOut() : zoomIn();
    if (zoomRatio <= 0.1 || zoomRatio >= 1.4) {
      return;
    }
    syncByZoom(zoomRatio)
  };
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if(e.ctrlKey){
      contrlKey = true      
    }
    console.log(e.ctrlKey, contrlKey)
  })
  document.addEventListener('keyup', (e: KeyboardEvent) => {
    if(!e.ctrlKey){
      contrlKey = false
    }
  })
  document.addEventListener('wheel', handleWheel, { passive: false });
}
