import { Tracks } from "./Tracks";
import { findParentElementByClassName, getLeftValue, getDatasetNumberByKey, } from "./trackUtils";
import { SegmentTracksArgs, MouseHandle, TRACKS_EVENT_CALLBACK_TYPES, SegmentBasicInfo } from "./TrackType";
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
  scrollContainer: HTMLElement = {} as HTMLElement;
  scrollContainerRect: DOMRect = {} as DOMRect;
  private segmentDelegate: HTMLElement = document.body;
  constructor({
    trackCursor,
    scrollContainer,
    timeline,
    segmentDelegate,
    deleteableCheck,
    dropableCheck,
  }: SegmentTracksArgs) {
    if (!scrollContainer) {
      return;
    }
    super({ trackCursor, scrollContainer, timeline, segmentDelegate, deleteableCheck, dropableCheck });
    this.scrollContainer = scrollContainer;
    this.scrollContainerRect = scrollContainer.getBoundingClientRect();
    this.dropableCheck = dropableCheck;
    if (segmentDelegate) {
      this.segmentDelegate = segmentDelegate;
    }
    // 代理 segment 鼠标事件
    this.segmentDelegate.addEventListener("mousedown", this.mousedownDelegateHandle);
    // 代理 segment 鼠标事件
    scrollContainer.addEventListener("mousedown", this.mouseDownHandle);
  }
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
    // todo: 手柄事件处理抽象至Segment 类
    // segment 左侧手柄拖动
    if (target.classList.contains("segment-handle-left")) {
      this.dragHandleStart(e, target, this.leftHandleMove);
      return
    }
    // segment 右侧手柄拖动
    if (target.classList.contains("segment-handle-right")) {
      this.dragHandleStart(e, target, this.rightHandleMove);
      return
    }

    if (target.classList.contains("segment") && this.trackCursor && this.scrollContainer) {
      this.segmentDragStart(e, this.trackCursor, this.scrollContainer, target);
    }
  };
  private mousedownDelegateHandle = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
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
    this.removeSegmentActivedStatus();
    segment.classList.add("actived");
    this.dragStart(e, trackCursor, scrollContainer, segment);
  }
  syncScale() {
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
  // segment 左侧手柄拖动
  private leftHandleMove = ({
    frameWidth,
    moveX,
    segmentleftOrigin,
    segment,
  }: MoveFunctionArgs) =>  {
    this.trackCursor?.freeze();
    // 鼠标移动距离 x
    const x = segmentleftOrigin + moveX;
    // 需要定位到具体某一帧的位置
    let currentFrame = Math.round(x / frameWidth);
    if (currentFrame < 0) {
      currentFrame = 0;
    }
    const frameend = parseFloat(segment.dataset.frameend ?? "0");
    if(currentFrame >= frameend){
      return
    }
    const segmentLeft: number = frameWidth * currentFrame;
    const width = (frameend - currentFrame) * frameWidth;
    // 宽度 = 原宽度 - 帧计算后的left值 与原 left 差
    segment.style.width = `${width}px`;
    segment.style.left = `${segmentLeft}px`;
    segment.dataset.framestart = `${currentFrame}`;
    const result: HTMLElement[] = [segment];
    // 伸缩轨道，左侧 segment frameend 设为当前调整的 segment 的 framestart
    const trackDom = findParentElementByClassName(segment, 'track');
    if(trackDom){
      if(this.isStretchTrack(trackDom)){
        const segmentLeftSide: HTMLElement | undefined = this.getLeftSideSegmentsInTrack(trackDom, segmentLeft).reverse()[0];
        if(segmentLeftSide){
          const framestart = getDatasetNumberByKey(segmentLeftSide, 'framestart');
          this.setSegmentPosition(segmentLeftSide, framestart, currentFrame);
          segmentLeftSide.dataset.frameend = `${currentFrame}`;
          result.push(segmentLeftSide);
        }
      }
      this.triggerSlideEvent(result, trackDom);
    }
  }
  // segment 右侧手柄拖动
  private rightHandleMove = ({
    frameWidth,
    moveX,
    segmentleftOrigin,
    widthOrigin,
    segment,
  }: MoveFunctionArgs) => {
    this.trackCursor?.freeze();
    const x = moveX;
    const frameend = Math.round(
      (segmentleftOrigin + widthOrigin + x) / frameWidth
    );
    const framestart = parseFloat(segment.dataset.framestart ?? "0");
    if(frameend <= framestart){
      return
    }
    const width = (frameend - framestart) * frameWidth;
    // 宽度 = 原宽度 - 帧计算后的left值 与原 left 差
    segment.style.width = `${width}px`;
    segment.dataset.frameend = `${frameend}`;
    const segments: HTMLElement[] = [segment];
    // 伸缩轨道，右侧 segment framestart 设为当前调整的 segment 的 frameend
    const trackDom = findParentElementByClassName(segment, 'track');
    if(trackDom){
      if(this.isStretchTrack(trackDom)){
        const segmentRightSide: HTMLElement | undefined = this.getRightSideSegmentsInTrack(trackDom, getLeftValue(segment))[0];
        if(segmentRightSide){
          const segmentRightSideFrameend = getDatasetNumberByKey(segmentRightSide, 'frameend');
          this.setSegmentPosition(segmentRightSide, frameend, segmentRightSideFrameend);
          segmentRightSide.dataset.framestart = `${frameend}`;
          segments.push(segmentRightSide)
        }
      }
      // todo 节流
      this.triggerSlideEvent(segments, trackDom);
    }
  }
  private triggerSlideEvent(segments: HTMLElement[], track: HTMLElement){
    const result: SegmentBasicInfo[] = segments.map((r):SegmentBasicInfo => {
      return {
        trackId: r.dataset.trackId ?? '',
        segmentId: r.dataset.segmentId ?? '', 
        startFrame: getDatasetNumberByKey(r, 'framestart'),
        endFrame:  getDatasetNumberByKey(r, 'frameend'),
        track,
        segment: r,
      }
    })
    this.segmentsSlidedCallback?.forEach( cb => {
      cb({
        segments: result,
        eventType: TRACKS_EVENT_CALLBACK_TYPES.SEGMENTS_SLIDED
      });
    })
  }
  private dragHandleStart = (
    e: MouseEvent,
    handle: HTMLElement,
    move: (args: MoveFunctionArgs) => void
  )  => {
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
      setTimeout(() => {
        this.trackCursor.unfreeze();  
      }, 0);
      document.body.removeEventListener("mousemove", mousemove);
      document.body.removeEventListener("mouseup", mouseup);
    };
    // 在body上侦听事件，顶级事件留给 Tracks 全局，用于冒泡处理
    document.body.addEventListener("mousemove", mousemove);
    document.body.addEventListener("mouseup", mouseup);
  }
  override destroy(): void {
    this?.scrollContainer?.removeEventListener("mousedown", this.mouseDownHandle);
    this.segmentDelegate.removeEventListener("mousedown", this.mousedownDelegateHandle);
  }
}
