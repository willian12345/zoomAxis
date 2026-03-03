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
  cursorEl!: HTMLElement;
  scrollContentDom: HTMLElement | null = null;
  timeline!: TimelineAxis;
  preRatio = 0;
  currentRatio = 0;
  left = 0;
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
      e.stopPropagation();
      if (!this._enable || this.timeline?.playing) {
        return;
      }
      const handleMouseup = (e: MouseEvent) => {
        e.stopPropagation();
        cursorEl.removeEventListener("mouseup", handleMouseup);
        document.removeEventListener("mouseup", handleMouseup);
        document.removeEventListener("mousemove", handleMousemove);
        this.triggerDragEnd(timeline, this.getX(e.clientX, scrollContentDom));
        
      };
      const handleMousemove = (e: MouseEvent) => {
        this.cursorUpdate(timeline, this.getX(e.clientX, scrollContentDom));
      };
      document.addEventListener("mouseup", handleMouseup);
      cursorEl.addEventListener("mouseup", handleMouseup);
      document.addEventListener("mousemove", handleMousemove);
    });

    cursorEl.addEventListener('click', this.clickHandle);
    // 滚动区域 mouseup 移动游标
    // scrollContentDom.addEventListener("click", this.scrollContentDomHandle);
  }
  private clickHandle = (e: MouseEvent) => {
    e.stopPropagation();
  }
  private scrollContentDomHandle =  (e: MouseEvent) => {
    if (!this.timeline || !this._enable || this.timeline?.playing || !this.scrollContentDom) {
      return;
    }
    this.cursorUpdate(this.timeline, this.getX(e.clientX, this.scrollContentDom));
    this.triggerDragEnd(this.timeline, this.getX(e.clientX, this.scrollContentDom));
  }
  private triggerDragEnd(timeline: TimelineAxis, x){
    const frame = Math.round(x / timeline.frameWidth);
    const left =  Math.round(timeline.frameWidth * frame);
    this.left = left;
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
  private cursorUpdate(timeline: TimelineAxis, x: number) {
    if (!this.cursorEl) {
      return;
    }
    let frame = Math.round(x / timeline.frameWidth);
    if(frame > timeline.totalFrames){
      frame = timeline.totalFrames;
    }
    const left = timeline.frameWidth * frame;
    // 游标拖动的 left 值根据当前帧与每帧所占宽度计算
    this.cursorEl.style.transform = `translateX(${left}px)`;
    this.left = left;
    this.dispatchEvent({ eventType: CURSOR_POINTER_EVENT_TYPE.UPDATE }, {frame, left, x});
  }
  sync() {
    const left = this.syncPositon();
    this.dispatchEvent({ eventType: CURSOR_POINTER_EVENT_TYPE.UPDATE }, {frame:this.timeline.currentFrame, left});
  }
  syncPositon(){
    const left = Math.round(this.timeline.frameWidth * this.timeline.currentFrame);
    this.left = left;
    this.cursorEl.style.transform = `translateX(${left}px)`;
    return left
  }
  freeze() {
    this._enable = false;
  }
  unfreeze() {
    this._enable = true;
  }
  refresh() {}
  destroy(){
    this.scrollContentDom?.removeEventListener("click", this.scrollContentDomHandle);
    this.cursorEl?.removeEventListener('click', this.clickHandle);
  }
}
