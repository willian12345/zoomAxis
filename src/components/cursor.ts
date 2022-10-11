
export function getTranslateXY(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  const matrix = new DOMMatrixReadOnly(style.transform);
  return {
    translateX: matrix.m41,
    translateY: matrix.m42,
  };
}
// 游标控制
export const useCursor = (scrollContentDom: HTMLElement, cursorEl: HTMLElement) => {
  if (!cursorEl) {
    return;
  }
  const rightBoundary = scrollContentDom.offsetWidth - 1;
  const leftBoundary = 0;
  // 游标拖动
  cursorEl.addEventListener("mousedown", (e: MouseEvent) => {
    e.preventDefault();
    let startX = e.clientX;
    const handleMouseup = (e: MouseEvent) => {
      e.stopPropagation();
      startX = e.clientX;
      cursorEl.removeEventListener("mouseup", handleMouseup);
      document.removeEventListener("mouseup", handleMouseup);
      document.removeEventListener("mousemove", handleMousemove);
    };
    const handleMousemove = (e: MouseEvent) => {
      const movedX = e.clientX - startX;
      const { translateX } = getTranslateXY(cursorEl);
      let x = translateX + movedX;
      if (x < leftBoundary) {
        x = leftBoundary;
      } else if (x > rightBoundary) {
        x = rightBoundary;
      }
      cursorEl.style.transform = `translateX(${x}px)`;
      startX = e.clientX;
    };
    document.addEventListener("mouseup", handleMouseup);
    cursorEl.addEventListener("mouseup", handleMouseup);
    document.addEventListener("mousemove", handleMousemove);
  });
  // 滚动区域点击
  scrollContentDom.addEventListener("mouseup", (e: MouseEvent) => {
    // if (segmentDragging) {
    //   return;
    // }
    let x = e.clientX - scrollContentDom.getBoundingClientRect().left;
    if (x < leftBoundary) {
      x = leftBoundary;
    } else if (x > rightBoundary) {
      x = rightBoundary;
    }
    cursorEl.style.transform = `translateX(${x}px)`;
  });
};