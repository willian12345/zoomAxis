import { Tracks } from "./Tracks";
import { findParentElementByClassName, getLeftValue, getDatasetNumberByKey, findEndestSegmentOnTrack, getFrameRange, createSegmentToTrack, isContainSplitFromComma} from "./trackUtils";
import { SegmentTracksArgs, MouseHandle, TRACKS_EVENT_CALLBACK_TYPES, SegmentBasicInfo, SegmentType } from "./TrackType";
import { CursorPointer } from "./CursorPointer";
interface MoveFunctionArgs {
  frameWidth: number;
  moveX: number;
  segmentleftOrigin: number;
  widthOrigin: number;
  segment: HTMLElement;
}

// 轨道内 segment 拖拽
// todo 抽取 Track 类
export class SegmentTracks extends Tracks {
  scrollContainer: HTMLElement = {} as HTMLElement;
  scrollContainerRect: DOMRect = {} as DOMRect;
  private segmentDelegate: HTMLElement = document.body;
  private lastEffectSegments: SegmentBasicInfo [] = [];
  private mousedownTimer = 0
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
    scrollContainer.addEventListener('mouseup', () => {
      this.clearTimer();
    })
  }
  private clearTimer(){
    if(this.mousedownTimer){
      clearTimeout(this.mousedownTimer);
    }
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
    // segment.classList.add("actived");
    // this.removeSegmentActivedStatus(e, segment);
    this.clearTimer();
    this.mousedownTimer = setTimeout(()=> {
      this.dragStart(e, trackCursor, scrollContainer, segment);  
    }, 300);
    // this.triggerSelected();
  }
  private syncScaleKeyframes(segment: HTMLElement, frameWidth: number, framestart: number){
    const keyframes = this.getKeyframes(segment);
    keyframes.forEach((keyframeDom: HTMLElement)=> {
      const frame = getDatasetNumberByKey(keyframeDom, 'frame');
      keyframeDom.style.left = `${frameWidth * (frame - framestart)}px`;
    })
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
      this.syncScaleKeyframes(dom, frameWidth, framestart);
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
    const frameend = parseFloat(segment.dataset.frameend ?? "0");
    if(currentFrame >= frameend){
      return
    }
    const result: HTMLElement[] = [segment];
    // 伸缩轨道，左侧 segment frameend 设为当前调整的 segment 的 framestart
    const trackDom = findParentElementByClassName(segment, 'track');
    if(trackDom){
      // 从拖动原点开始算找出最近的左侧 segment 
      const segmentLeftSide: HTMLElement | undefined = this.getLeftSideSegmentsInTrack(trackDom, x).reverse()[0];
      // 如果是首个 segment
      if(!segmentLeftSide){
        // 最小拖到 0
        if(currentFrame < 0){
          currentFrame = 0;
        }
        this.setSegmentPosition(segment, currentFrame, frameend);
        segment.dataset.framestart = `${currentFrame}`;
      }else if(this.isStretchTrack(trackDom)){
        // 根据left 
        const segmentLeftSide: HTMLElement | undefined = this.getLeftSideSegmentsInTrack(trackDom, getLeftValue(segment)).reverse()[0];
        // 伸缩轨道
        const framestart = getDatasetNumberByKey(segmentLeftSide, 'framestart');
        this.setSegmentPosition(segment, currentFrame, frameend);
        segment.dataset.framestart = `${currentFrame}`;
        console.log(currentFrame, segmentLeftSide);
        this.setSegmentPosition(segmentLeftSide, framestart, currentFrame);
        segmentLeftSide.dataset.frameend = `${currentFrame}`;
        result.push(segmentLeftSide);
      }else{
        // 左侧有 segment 的情况，最多拖到左侧 segment 的 frameend
        const sideSegmentFrameend = getDatasetNumberByKey(segmentLeftSide, 'frameend');
        // 小于左侧则等于左侧
        if(currentFrame < sideSegmentFrameend){
          currentFrame = sideSegmentFrameend
          this.setSegmentPosition(segment, currentFrame, frameend);
          segment.dataset.framestart = `${currentFrame}`;
        }else{
          this.setSegmentPosition(segment, currentFrame, frameend);
          segment.dataset.framestart = `${currentFrame}`;  
        }
      }
      this.lastEffectSegments = this.triggerSlideEvent(result, trackDom);
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
    let frameend = Math.round(
      (segmentleftOrigin + widthOrigin + x) / frameWidth
    );
    const framestart = parseFloat(segment.dataset.framestart ?? "0");
    if(frameend <= framestart){
      return
    }
    const segments: HTMLElement[] = [segment];
    // 伸缩轨道，右侧 segment framestart 设为当前调整的 segment 的 frameend
    const trackDom = findParentElementByClassName(segment, 'track');
    if(trackDom){
      const segmentRightSide: HTMLElement | undefined = this.getRightSideSegmentsInTrack(trackDom, segmentleftOrigin)[0];
      if(!segmentRightSide){
        this.setSegmentPosition(segment, framestart, frameend);
        segment.dataset.frameend = `${frameend}`;
      }else if(this.isStretchTrack(trackDom)){
        const segmentRightSide: HTMLElement | undefined = this.getRightSideSegmentsInTrack(trackDom, getLeftValue(segment))[0];
        if(segmentRightSide){
          const segmentRightSideFrameend = getDatasetNumberByKey(segmentRightSide, 'frameend');
          this.setSegmentPosition(segment, framestart, frameend);
          segment.dataset.frameend = `${frameend}`;
          this.setSegmentPosition(segmentRightSide, frameend, segmentRightSideFrameend);
          segmentRightSide.dataset.framestart = `${frameend}`;
          segments.push(segmentRightSide)
        }
      }else{
        const sideBorderFrame = getDatasetNumberByKey(segmentRightSide, 'framestart');
        // 小于左侧则等于左侧
        if(frameend > sideBorderFrame){
          frameend = sideBorderFrame
          this.setSegmentPosition(segment, framestart, frameend);
          segment.dataset.frameend = `${frameend}`;
        }else{
          this.setSegmentPosition(segment, framestart, frameend);
          segment.dataset.frameend = `${frameend}`;
        }
      }
      // todo 节流
      this.lastEffectSegments = this.triggerSlideEvent(segments, trackDom);
    }
  }
  private triggerSlideEvent(segments: HTMLElement[], track: HTMLElement){
    const result: SegmentBasicInfo[] = segments.map((r):SegmentBasicInfo => {
      const [ startFrame, endFrame ] = getFrameRange(r);
      return {
        trackId: r.dataset.trackId ?? '',
        segmentId: r.dataset.segmentId ?? '', 
        startFrame,
        endFrame,
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
    return result;
  }
  private triggerSlideEndEvent(){
    this.segmentsSlideEndCallback?.forEach( cb => {
      cb({
        segments: this.lastEffectSegments,
        eventType: TRACKS_EVENT_CALLBACK_TYPES.SEGMENTS_SLIDE_END
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
    e.stopPropagation();
    e.preventDefault();
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
      //注意： 宽度调节完毕后，影响到的相关 segment 不能同时调整需要另外再调用，所以使用了新的 SEGMENTS_SLIDE_END 事件
      this.triggerSlideEndEvent();
      document.body.removeEventListener("mousemove", mousemove);
      document.body.removeEventListener("mouseup", mouseup);
    };
    // 在body上侦听事件，顶级事件留给 Tracks 全局，用于冒泡处理
    document.body.addEventListener("mousemove", mousemove);
    document.body.addEventListener("mouseup", mouseup);
  }
  // 伸缩轨道内最后一个 segment 结束帧对齐整个轨道最后一帧
  stretchSegmentToEnd(endFrame: number){
    if(!endFrame){
      return
    }
    // 获取所有轨道
    this.getTracks().forEach( track => {
      if(this.isStretchTrack(track)){
        const [ segment ] = findEndestSegmentOnTrack(track);
        if(segment){
          const [framestart, frameend] = getFrameRange(segment);
          if(frameend < endFrame){
            this.setSegmentPosition(segment, framestart, endFrame);
            segment.dataset.frameend = `${endFrame}`;
            this.triggerSlideEvent([segment], track);
          }
        }
      }
    })
  }
  override destroy(): void {
    this?.scrollContainer?.removeEventListener("mousedown", this.mouseDownHandle);
    this.segmentDelegate.removeEventListener("mousedown", this.mousedownDelegateHandle);
  }
}
