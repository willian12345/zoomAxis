
export function getTranslateXY(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  const matrix = new DOMMatrixReadOnly(style.transform);
  return {
    translateX: matrix.m41,
    translateY: matrix.m42,
  };
}
export class CursorPointer{
  private _enable = true
  cursorEl: HTMLElement|null = null
  unscaleLeft = 0 // 未发生缩放时 原始 left 值 
  preRatio = 0
  currentRatio = 0
  get enable(){
    return this._enable
  }
  set enable(bool){
    this._enable = bool
  }
  constructor(scrollContentDom: HTMLElement, cursorEl: HTMLElement){
    if (!cursorEl) {
      return;
    }
    this.cursorEl = cursorEl
    const leftBoundary = 0;
    // 游标拖动
    cursorEl.addEventListener("mousedown", (e: MouseEvent) => {
      e.preventDefault();
      if (!this._enable) {
        return;
      }
      let startX = e.clientX;
      const handleMouseup = (e: MouseEvent) => {
        e.stopPropagation();
        startX = e.clientX;
        cursorEl.removeEventListener("mouseup", handleMouseup);
        document.removeEventListener("mouseup", handleMouseup);
        document.removeEventListener("mousemove", handleMousemove);
      };
      const handleMousemove = (e: MouseEvent) => {
        const rightBoundary = scrollContentDom.offsetWidth;
        const movedX = e.clientX - startX;
        const { translateX } = getTranslateXY(cursorEl);
        let x = translateX + movedX;
        if (x < leftBoundary) {
          x = leftBoundary;
        } else if (x > rightBoundary) {
          x = rightBoundary;
        }
        cursorEl.style.transform = `translateX(${x}px)`;
        // this.unscaleLeft = x;
        startX = e.clientX;
      };
      document.addEventListener("mouseup", handleMouseup);
      cursorEl.addEventListener("mouseup", handleMouseup);
      document.addEventListener("mousemove", handleMousemove);
    });
    // 滚动区域 mouseup 移动游标
    scrollContentDom.addEventListener("mouseup", (e: MouseEvent) => {
      if (!this._enable) {
        return;
      }
      let x = e.clientX - scrollContentDom.getBoundingClientRect().left + scrollContentDom.scrollLeft; 
      const rightBoundary = scrollContentDom.offsetWidth;
      if (x < leftBoundary) {
        x = leftBoundary;
      } else if (x > rightBoundary) {
        x = rightBoundary;
      }
      cursorEl.style.transform = `translateX(${x}px)`;
      // this.unscaleLeft = x;
      // this.preRatio = this.currentRatio;
      // console.log(this.currentRatio)
    });
  }
  scaleXByRatio(ratio: number){

  }
  freeze(){
    this._enable = false;
  }
  unfreeze(){
    this._enable = true;
  }
  refresh(){

  }
}
