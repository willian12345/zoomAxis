import { TimelineAxis } from "./TimelineAxis";

export function getTranslateXY(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  const matrix = new DOMMatrixReadOnly(style.transform);
  return {
    translateX: matrix.m41,
    translateY: matrix.m42,
  };
}
export enum CURSOR_POINTER_EVENT_TYPE {
  CURSOR_UPDATE,
}
interface EventCallbackCursorPointer {
  (currentFrame: number, cursorX: number): any;
}
export class CursorPointer {
  private _enable = true;
  cursorEl: HTMLElement | null = null;
  scrollContentDom: HTMLElement | null = null;
  timelineAxis: TimelineAxis | null = null;
  unscaleLeft = 0; // 未发生缩放时 原始 left 值
  preRatio = 0;
  currentRatio = 0;
  get enable() {
    return this._enable;
  }
  set enable(bool) {
    this._enable = bool;
  }
  private cursorUpdateCallbackSet: Set<EventCallbackCursorPointer> | null =
    null;
  constructor(
    scrollContentDom: HTMLElement,
    cursorEl: HTMLElement,
    timelineAxis: TimelineAxis
  ) {
    if (!scrollContentDom) {
      return;
    }
    if (!cursorEl) {
      return;
    }
    this.scrollContentDom = scrollContentDom;
    this.cursorEl = cursorEl;
    this.timelineAxis = timelineAxis;
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
        this.cursorUpdate(timelineAxis, this.getX(e.clientX, scrollContentDom));
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
      this.cursorUpdate(timelineAxis, this.getX(e.clientX, scrollContentDom));
    });
  }
  private getX(clientX: number, scrollContentDom: HTMLElement) {
    let x =
      clientX -
      scrollContentDom.getBoundingClientRect().left +
      scrollContentDom.scrollLeft;
    const rightBoundary = scrollContentDom.offsetWidth;
    const leftBoundary = 0;
    if (x < leftBoundary) {
      x = leftBoundary;
    } else if (x > rightBoundary) {
      x = rightBoundary;
    }
    return x;
  }
  private cursorUpdate(timelineAxis: TimelineAxis, x: number) {
    if (!this.cursorEl) {
      return;
    }
    const currentFrame = Math.round(x / timelineAxis.frameWidth);
    const left = timelineAxis.frameWidth * currentFrame;
    // 游标拖动的 left 值根据当前帧与每帧所占宽度计算
    this.cursorEl.style.transform = `translateX(${left}px)`;
    if (this.cursorUpdateCallbackSet?.size) {
      this.cursorUpdateCallbackSet.forEach((cb) => {
        if (!timelineAxis) {
          return;
        }

        cb(currentFrame, left);
      });
    }
  }
  addEventListener(
    eventType: CURSOR_POINTER_EVENT_TYPE,
    cb: EventCallbackCursorPointer
  ) {
    if (!this.cursorUpdateCallbackSet) {
      this.cursorUpdateCallbackSet = new Set();
    }
    this.cursorUpdateCallbackSet.add(cb);
    return this;
  }
  syncLeft() {
    if (!this.timelineAxis || !this.cursorEl) {
      return;
    }
    const left = this.timelineAxis.frameWidth * this.timelineAxis.currentFrame;
    console.log(this.timelineAxis.frameWidth)
    this.cursorEl.style.transform = `translateX(${left}px)`;
  }
  freeze() {
    this._enable = false;
  }
  unfreeze() {
    this._enable = true;
  }
  refresh() {}
}
