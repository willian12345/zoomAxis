import { Tracks } from "./Tracks";
import { findParentElementByClassName, getLeftValue } from "./trackUtils";
import { SegmentTracksArgs, MouseHandle } from "./TrackType";
import { CursorPointer } from "./CursorPointer";
interface MoveFunctionArgs {
  frameWidth: number;
  moveX: number;
  segmentleftOrigin: number;
  widthOrigin: number;
  segment: HTMLElement;
}

// 轨道内 segment 拖拽
export class SegmentTracks extends Tracks {
  scrollContainer: HTMLElement | null = null;
  scrollContainerRect: DOMRect | null = null;
  private mouseDownHandle: MouseHandle = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (this?.timeline?.playing) {
      return;
    }
    const target = e.target as HTMLElement;
    if (!target) {
      return;
    }
    // segment 左侧手柄拖动
    if (target.classList.contains("segment-handle-left")) {
      // this.handleLeftDragStart(e, target);
      this.dragHandleStart(e, target, this.leftHandleMove);
    }
    // segment 右侧手柄拖动
    if (target.classList.contains("segment-handle-right")) {
      this.dragHandleStart(e, target, this.rightHandleMove);
    }
    if (target.classList.contains("segment") && this.trackCursor && this.scrollContainer) {
      this.segmentDragStart(e, this.trackCursor, this.scrollContainer, target);
    }
  };
  constructor({
    trackCursor,
    scrollContainer,
    timeline,
    deleteableCheck,
  }: SegmentTracksArgs) {
    if (!scrollContainer) {
      return;
    }
    super({ trackCursor, scrollContainer, timeline, deleteableCheck });
    const mousedown = 
    this.scrollContainer = scrollContainer;
    this.scrollContainerRect = scrollContainer.getBoundingClientRect();
    // 代理 segment 鼠标事件
    scrollContainer.addEventListener("mousedown", this.mouseDownHandle);
  }
  // segment 左侧手柄拖动
  private leftHandleMove({
    frameWidth,
    moveX,
    segmentleftOrigin,
    widthOrigin,
    segment,
  }: MoveFunctionArgs) {
    // 鼠标移动距离 x
    const x = segmentleftOrigin + moveX;
    // 需要定位到具体某一帧的位置
    let currentFrame = Math.round(x / frameWidth);
    if (currentFrame < 0) {
      currentFrame = 0;
    }
    const segmentLeft: number = frameWidth * currentFrame;
    const frameend = parseFloat(segment.dataset.frameend ?? "0");
    const width = (frameend - currentFrame) * frameWidth;
    // 宽度 = 原宽度 - 帧计算后的left值 与原 left 差
    segment.style.width = `${width}px`;
    segment.style.left = `${segmentLeft}px`;
    segment.dataset.framestart = `${currentFrame}`;
  }
  // segment 右侧手柄拖动
  private rightHandleMove({
    frameWidth,
    moveX,
    segmentleftOrigin,
    widthOrigin,
    segment,
  }: MoveFunctionArgs) {
    const x = moveX;
    const frameend = Math.round(
      (segmentleftOrigin + widthOrigin + x) / frameWidth
    );
    const framestart = parseFloat(segment.dataset.framestart ?? "0");
    const width = (frameend - framestart) * frameWidth;
    // 宽度 = 原宽度 - 帧计算后的left值 与原 left 差
    segment.style.width = `${width}px`;
    segment.dataset.frameend = `${frameend}`;
  }
  private dragHandleStart(
    e: MouseEvent,
    handle: HTMLElement,
    move: (args: MoveFunctionArgs) => void
  ) {
    const segment: HTMLElement = findParentElementByClassName(
      handle,
      "segment"
    ) as HTMLElement;
    const left: number = getLeftValue(segment) as number;
    const width = segment.getBoundingClientRect().width;
    let startX = e.clientX;
    const frameWidth = this.timeline?.frameWidth ?? 0;
    const mousemove = (e: MouseEvent) => {
      e.stopPropagation();
      const moveX = e.clientX - startX;
      move({
        frameWidth,
        moveX,
        segmentleftOrigin: left,
        widthOrigin: width,
        segment,
      });
    };
    const mouseup = (e: MouseEvent) => {
      e.stopPropagation();
      startX = e.clientX;
      document.removeEventListener("mousemove", mousemove);
      document.removeEventListener("mouseup", mouseup);
    };
    document.addEventListener("mousemove", mousemove);
    document.addEventListener("mouseup", mouseup);
  }
  private segmentDragStart(
    e: MouseEvent,
    trackCursor: CursorPointer,
    scrollContainer: HTMLElement,
    segment: HTMLElement
  ) {
    this.removeSegmentActivedStatus();
    segment.classList.add("actived");
    this.dragStart(e, trackCursor, scrollContainer, segment);
  }
  scaleX(ratio: number) {
    if (!this.scrollContainer || !this.timeline) {
      return;
    }
    const segments: HTMLElement[] = Array.from(
      this.scrollContainer.querySelectorAll(".segment")
    );
    const frameWidth = this.timeline?.frameWidth;
    segments.forEach((dom: HTMLElement) => {
      if (!dom.dataset.framestart || !dom.dataset.frameend || !this.timeline) {
        return;
      }
      const framestart = parseFloat(dom.dataset.framestart);
      const frameend = parseFloat(dom.dataset.frameend);
      const left = framestart * frameWidth;
      dom.style.left = `${left}px`;
      dom.style.width = `${frameWidth * (frameend - framestart)}px`;
    });
  }
  override destroy(): void {
    this?.scrollContainer?.removeEventListener("mousedown", this.mouseDownHandle);
  }
}
