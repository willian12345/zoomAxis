import { Tracks } from "./Tracks";
import { findParentElementByClassName } from "./trackUtils";
import { SegmentTracksArgs, MouseHandle } from "./TrackType";
import { CursorPointer } from "./CursorPointer";

// 轨道内 segment 拖拽
// todo 抽取 Track 类
export class SegmentTracks extends Tracks {
  scrollContainer: HTMLElement = {} as HTMLElement;
  scrollContainerRect: DOMRect = {} as DOMRect;
  private segmentDelegate: HTMLElement = document.body;
  private mousedownTimer = 0
  constructor({
    trackCursor,
    tracks,
    scrollContainer,
    timeline,
    segmentDelegate,
    deleteableCheck,
    dropableCheck,
  }: SegmentTracksArgs) {
    if (!scrollContainer) {
      return;
    }
    super({tracks, trackCursor, scrollContainer, timeline, segmentDelegate, deleteableCheck, dropableCheck });
    this.scrollContainer = scrollContainer;
    this.scrollContainerRect = scrollContainer.getBoundingClientRect();
    this.dropableCheck = dropableCheck;
    if (segmentDelegate) {
      this.segmentDelegate = segmentDelegate;
    }
    scrollContainer.addEventListener("click", this.clickHandle.bind(this));
    // 代理 segment 鼠标事件
    this.segmentDelegate.addEventListener("mousedown", this.mousedownDelegateHandle.bind(this));
    // 代理 segment 鼠标事件
    scrollContainer.addEventListener("mousedown", this.mousedownHandle.bind(this));
    scrollContainer.addEventListener('mouseup', this.mouseupHandle.bind(this))
  }
  private checkClickedOnSegment(e: MouseEvent){
    let target = e.target as HTMLElement | null;
    if (!target) {
      return null;
    }
    // 找到事件对应的 segment 元素，如果当前不是，则冒泡往上找
    if(!target.classList.contains("segment")){
      target = findParentElementByClassName(target, 'segment');
    }
    if(target){
      return target;
    }
    return null;
  }
  private clickHandle(e: MouseEvent){
    const result = this.checkClickedOnSegment(e)
    if(result){
      e.stopPropagation();
    }
  }
  private mouseupHandle(){
    this.clearTimer();
  }
  private clearTimer(){
    if(this.mousedownTimer){
      clearTimeout(this.mousedownTimer);
    }
  }
  private mousedownHandle: MouseHandle = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (this?.timeline?.playing) {
      return;
    }
    const result = this.checkClickedOnSegment(e)
    if (result && this.trackCursor && this.scrollContainer) {
      this.segmentDragStart(e, this.trackCursor, this.scrollContainer, result);
    }
  };
  private mousedownDelegateHandle = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    // 右健点击忽略
    if(e.button === 2){
      return;
    }
    if (!target) {
      return;
    }
    if (!target.classList.contains("segment-item")) {
      return;
    }
    const segment = target;
    if (this.trackCursor && this.scrollContainer) {
      this.dragStart(e, this.trackCursor, this.scrollContainer, segment, true);
    }
  }
  private segmentDragStart(
    e: MouseEvent,
    trackCursor: CursorPointer,
    scrollContainer: HTMLElement,
    segment: HTMLElement
  ) {
    this.select(segment.dataset.segmentId ?? '');
    this.clearTimer();
    this.mousedownTimer = setTimeout(()=> {
      this.dragStart(e, trackCursor, scrollContainer, segment);  
    }, 300);
  }
  override destroy(): void {
    this?.scrollContainer?.removeEventListener("mouseup", this.mouseupHandle);
    this?.scrollContainer?.removeEventListener("click", this.clickHandle);
    this?.scrollContainer?.removeEventListener("mousedown", this.mousedownHandle);
    this.segmentDelegate.removeEventListener("mousedown", this.mousedownDelegateHandle);
  }
}
