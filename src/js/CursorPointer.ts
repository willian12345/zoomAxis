import { TimelineAxis } from "./TimelineAxis";
import { EventHelper } from './EventHelper';

export function getTranslateXY(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  const matrix = new DOMMatrixReadOnly(style.transform);
  return {
    translateX: matrix.m41,
    translateY: matrix.m42,
  };
}
export enum CURSOR_POINTER_EVENT_TYPE {
  UPDATE,
  DRAG_END,
}
export interface CursorEvent{
  (e: {frame:number, left: number, x: number}): any
}
export interface CursorPointer {
  addEventListener<EventType extends CURSOR_POINTER_EVENT_TYPE>(
    eventType: EventType,
    callback: CursorEvent
  ):void
}
// todo: 剥离掉 timeline 
export class CursorPointer extends EventHelper{
  private _enable = true;
  cursorEl: HTMLElement | null = null;
  scrollContentDom: HTMLElement | null = null;
  timeline: TimelineAxis | null = null;
  preRatio = 0;
  currentRatio = 0;
  get enable() {
    return this._enable;
  }
  set enable(bool) {
    this._enable = bool;
  }
  constructor(
    scrollContentDom: HTMLElement,
    cursorEl: HTMLElement,
    timeline: TimelineAxis
  ) {
    super();
    if (!scrollContentDom) {
      return;
    }
    if (!cursorEl) {
      return;
    }
    this.scrollContentDom = scrollContentDom;
    this.cursorEl = cursorEl;
    this.timeline = timeline;
    // 游标拖动
    cursorEl.addEventListener("mousedown", (e: MouseEvent) => {
      e.preventDefault();
      if (!this._enable || this.timeline?.playing) {
        return;
      }
      let startX = e.clientX;
      const handleMouseup = (e: MouseEvent) => {
        e.stopPropagation();
        startX = e.clientX;
        cursorEl.removeEventListener("mouseup", handleMouseup);
        document.removeEventListener("mouseup", handleMouseup);
        document.removeEventListener("mousemove", handleMousemove);
        this.triggerDragEnd(timeline, this.getX(e.clientX, scrollContentDom));
        
      };
      const handleMousemove = (e: MouseEvent) => {
        this.cursorUpdate(timeline, this.getX(e.clientX, scrollContentDom));
        startX = e.clientX;
      };
      document.addEventListener("mouseup", handleMouseup);
      cursorEl.addEventListener("mouseup", handleMouseup);
      document.addEventListener("mousemove", handleMousemove);
    });

    // 滚动区域 mouseup 移动游标
    scrollContentDom.addEventListener("click", (e: MouseEvent) => {
      console.log('click')
      if (!this._enable || this.timeline?.playing) {
        return;
      }
      const target = e.target as HTMLElement;
      if(target && target.classList.contains('segment')){
        return;
      }
      this.cursorUpdate(timeline, this.getX(e.clientX, scrollContentDom));
      this.triggerDragEnd(timeline, this.getX(e.clientX, scrollContentDom));
    });
  }
  private triggerDragEnd(timelineAxis: TimelineAxis, x){
    const frame = Math.round(x / timelineAxis.frameWidth);
    const left = timelineAxis.frameWidth * frame;
    this.dispatchEvent({ eventType: CURSOR_POINTER_EVENT_TYPE.DRAG_END }, {frame, left});
  }
  private getX(clientX: number, scrollContentDom: HTMLElement) {
    let x =
      clientX -
      scrollContentDom.getBoundingClientRect().left +
      scrollContentDom.scrollLeft;
    const rightBoundary = scrollContentDom.scrollLeft + scrollContentDom.scrollWidth;
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
    let frame = Math.round(x / timelineAxis.frameWidth);
    if(frame > timelineAxis.totalFrames){
      frame = timelineAxis.totalFrames;
    }
    const left = timelineAxis.frameWidth * frame;
    // 游标拖动的 left 值根据当前帧与每帧所占宽度计算
    this.cursorEl.style.transform = `translateX(${left}px)`;
    this.dispatchEvent({ eventType: CURSOR_POINTER_EVENT_TYPE.UPDATE }, {frame, left, x});
  }
  sync() {
    if (!this.timeline || !this.cursorEl) {
      return;
    }
    const left = this.timeline.frameWidth * this.timeline.currentFrame;
    this.cursorEl.style.transform = `translateX(${left}px)`;
    this.dispatchEvent({ eventType: CURSOR_POINTER_EVENT_TYPE.UPDATE }, {frame:this.timeline.currentFrame, left});
  }
  freeze() {
    this._enable = false;
  }
  unfreeze() {
    this._enable = true;
  }
  refresh() {}
  destroy(){
    
  }
}
