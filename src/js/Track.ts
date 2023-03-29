/**
 * Track 基础 dom 结构
 * <div class="track">
 *  <div class="track-placeholder"></div>
 *  <div class="segment"></div>
 * </div>
 */
import { Segment } from "./Segment";
import {
  collisionCheckX,
  getFrameRange,
  getLeftValue,
  getSegmentPlaceholder,
  collisionCheckFrame,
  isContainSplitFromComma,
  findParentElementByClassName,
  getRightSideSegments,
  getLeftSideSegments,
  CLASS_NAME_TRACK_DRAG_OVER,
  CLASS_NAME_TRACK_DRAG_OVER_ERROR,
  CLASS_NAME_SEGMENT,
  CLASS_NAME_SEGMENT_HANDLE_LEFT,
  CLASS_NAME_SEGMENT_HANDLE_RIGHT,
} from "./trackUtils";
import { TrackArgs, DragingArgs, TRACKS_EVENT_TYPES } from "./TrackType";
import { EventHelper } from "./EventHelper";
import { TrackFlex } from "./TrackFlex";

type MoveFunctionArgs = {
  frameWidth: number;
  moveX: number;
  segmentleftOrigin: number;
  widthOrigin: number;
  segmentDom: HTMLElement;
};

export class Track extends EventHelper {
  dom!: HTMLElement;
  trackId = '';
  trackType = '';
  visibility = true;
  segments: Map<string, Segment> = new Map(); // 轨道内的 segment
  subTracks: Map<string, Track> = new Map(); // 子轨道
  parent: Track|null = null;// 父轨道
  frameWidth: number = 0;
  originFramestart = 0; // 拖动前 framestart
  originFrameend = 0; // 拖动前 frameend
  disabled = false;
  coordinateLines: HTMLElement[] = []; // 轨道所有辅助线
  coordinateLineLeft!: HTMLElement; // segment 左侧辅助线
  collapsed = false;
  subTracksCollapsed = false;
  private lastEffectSegments: Segment[] = [];
  constructor({
    dom,
    trackType,
    coordinateLines,
    frameWidth,
  }: TrackArgs) {
    super();
    this.frameWidth = frameWidth;
    this.dom = dom;
    this.trackType = trackType
    this.trackId = dom.dataset.trackId ?? "";
    // 辅助线
    if(coordinateLines) {
      this.coordinateLines = coordinateLines;
      this.coordinateLineLeft = coordinateLines[0];
    }
    this.initEvent();
  }
  initEvent() {
    this.dom.addEventListener("mousedown", this.mousedown);
    this.dom.addEventListener("click", this.click);
  }
  click = (e: MouseEvent) => {
    if(this.disabled){
      return;
    }
    let target = e.target as HTMLElement | null;
    if (!target) {
      return;
    }
    if (target.classList.contains(CLASS_NAME_SEGMENT_HANDLE_LEFT)) {
      e.stopPropagation();
      return;
    }
    if (target.classList.contains(CLASS_NAME_SEGMENT_HANDLE_RIGHT)) {
      e.stopPropagation();
      return;
    }
    if(!target.classList.contains(CLASS_NAME_SEGMENT)){
      let segmentDom = findParentElementByClassName(target, CLASS_NAME_SEGMENT);
      if(segmentDom){
        const segment = this.getSegmentById(segmentDom.dataset.segmentId ?? '')
        this.dispatchEvent(
          { eventType: TRACKS_EVENT_TYPES.SEGMENT_SELECTED },
          {
            segment,
          }
        );
        return;
      }
    } 
  }
  mousedown = (e: MouseEvent) => {
    if(this.disabled){
      return;
    }
    let target = e.target as HTMLElement | null;
    if (!target) {
      return;
    }
    if(e.button === 2){
      if(!target.classList.contains(CLASS_NAME_SEGMENT)){
        let segmentDom = findParentElementByClassName(target, CLASS_NAME_SEGMENT);
        if(segmentDom){
          const segment = this.getSegmentById(segmentDom.dataset.segmentId ?? '')
          this.dispatchEvent(
            { eventType: TRACKS_EVENT_TYPES.SEGMENT_RIGHT_CLICK },
            {
              segment,
            }
          );
          return;
        }
      } 
    }
    if (target.classList.contains(CLASS_NAME_SEGMENT_HANDLE_LEFT)) {
      e.stopPropagation();
      this.dragHandleStart(e, target, this.leftHandleMove, 0);
      return;
    }
    if (target.classList.contains(CLASS_NAME_SEGMENT_HANDLE_RIGHT)) {
      e.stopPropagation();
      this.dragHandleStart(e, target, this.rightHandleMove, 1);
      return;
    }
  }
  // 拖动手柄拖动开始
  private dragHandleStart = (
    e: MouseEvent,
    handle: HTMLElement,
    move: (args: MoveFunctionArgs) => void,
    handleCode: number
  ) => {
    const segmentDom: HTMLElement = findParentElementByClassName(
      handle,
      "segment"
    ) as HTMLElement;
    e.preventDefault();
    const left: number = getLeftValue(segmentDom) as number;
    const width = segmentDom.getBoundingClientRect().width;
    let startX = e.clientX;
    const mousemove = (e: MouseEvent) => {
      e.stopPropagation();
      const moveX = e.clientX - startX;
      move({
        frameWidth: this.frameWidth,
        moveX,
        segmentleftOrigin: left,
        widthOrigin: width,
        segmentDom,
      });
    };
    const mouseup = (e: MouseEvent) => {
      startX = e.clientX;
      const segment = this.getSegmentById(segmentDom.dataset.segmentId ?? "");
      if(segment){
        //注意： 宽度调节完毕后，影响到的相关 segment 不能同时调整需要另外再调用，所以使用了新的 SEGMENTS_SLIDE_END 事件
        this.triggerSlideEndEvent(segment, handleCode);
      }
      document.body.removeEventListener("mousemove", mousemove);
      document.body.removeEventListener("mouseup", mouseup);
    };
    // 在body上侦听事件，顶级事件留给 Tracks 全局，用于冒泡处理
    document.body.addEventListener("mousemove", mousemove);
    document.body.addEventListener("mouseup", mouseup);
  };
  // segment 左侧手柄拖动
  private leftHandleMove = ({
    frameWidth,
    moveX,
    segmentleftOrigin,
    segmentDom,
  }: MoveFunctionArgs) => {
    // 鼠标移动距离 x
    const x = segmentleftOrigin + moveX;
    // 需要定位到具体某一帧的位置
    let currentFrame = Math.round(x / frameWidth);
    const segment = this.getSegmentById(segmentDom.dataset.segmentId ?? "");
    if (!segment) return;
    const frameend = parseFloat(segmentDom.dataset.frameend ?? "0");
    if (currentFrame >= frameend) {
      return;
    }
    const segments = this.getSegmentsSelf();
    const result: Segment[] = [segment];
    // 伸缩轨道，左侧 segment frameend 设为当前调整的 segment 的 framestart
    const track = segment.parentTrack;
    if (track) {
      // 从拖动原点开始算找出最近的左侧 segment
      const segmentLeftSide = getLeftSideSegments(
        segments,
        getLeftValue(segmentDom)
      ).reverse()[0];
      // 如果是首个 segment
      if (!segmentLeftSide) {
        // 最小拖到 0
        if (currentFrame < 0) {
          currentFrame = 0;
        }
        segment.setRange(currentFrame, frameend);
      } else if ((track as TrackFlex)?.isFlex) {
        // 根据left
        const segmentLeftSide = getLeftSideSegments(
          segments,
          getLeftValue(segmentDom)
        ).reverse()[0];
        // 伸缩轨道
        const framestart = segmentLeftSide.framestart;
        segment.setRange(currentFrame, frameend);
        segmentLeftSide.setRange(framestart, currentFrame);
        result.push(segmentLeftSide);
      } else {
        // 左侧有 segment 的情况，最多拖到左侧 segment 的 frameend
        const sideSegmentFrameend = segmentLeftSide.frameend;
        // 小于左侧则等于左侧
        if (currentFrame < sideSegmentFrameend) {
          currentFrame = sideSegmentFrameend;
        }
        segment.setRange(currentFrame, frameend);
      }
      this.lastEffectSegments = this.triggerSlideEvent(segment, result, 0);
    }
  };
  // segment 右侧手柄拖动
  private rightHandleMove = ({
    frameWidth,
    moveX,
    segmentleftOrigin,
    widthOrigin,
    segmentDom,
  }: MoveFunctionArgs) => {
    const x = moveX;
    let frameend = Math.round(
      (segmentleftOrigin + widthOrigin + x) / frameWidth
    );
    const segment = this.getSegmentById(segmentDom.dataset.segmentId ?? "");
    const framestart = parseFloat(segmentDom.dataset.framestart ?? "0");
    if (!segment) return;
    if (frameend <= framestart) return;

    const result: Segment[] = [segment];
    const segments = this.getSegmentsSelf();
    // 伸缩轨道，右侧 segment framestart 设为当前调整的 segment 的 frameend
    const track = segment.parentTrack;

    if (track) {
      const segmentRightSide = getRightSideSegments(
        segments,
        segmentleftOrigin
      )[0];
      if (!segmentRightSide) {
        segment.setRange(framestart, frameend);
      } else if ((track as TrackFlex)?.isFlex) {
        const segmentRightSide = getRightSideSegments(
          segments,
          getLeftValue(segmentDom)
        )[0];
        if (segmentRightSide) {
          const segmentRightSideFrameend = segmentRightSide.frameend;
          segment.setRange(framestart, frameend);
          segmentRightSide.setRange(frameend, segmentRightSideFrameend);
          result.push(segmentRightSide);
        }
      } else {
        const sideBorderFrame = segmentRightSide.framestart;
        // 小于左侧则等于左侧
        if (frameend > sideBorderFrame) {
          frameend = sideBorderFrame;
          segment.setRange(framestart, frameend);
        } else {
          segment.setRange(framestart, frameend);
          this.setSegmentPosition(segmentDom, framestart, frameend);
        }
      }
      this.lastEffectSegments = this.triggerSlideEvent(segment, segments, 1);
    }
  };
  getSegmentLeft(framestart: number): number {
    const frameWidth = this.frameWidth ?? 0;
    return framestart * frameWidth;
  }
  setSegmentPosition(
    segment: HTMLElement,
    framestart: number,
    frameend: number
  ) {
    const segmentLeft = this.getSegmentLeft(framestart);
    segment.style.left = `${segmentLeft}px`;
    const frames = frameend - framestart;
    segment.style.width = `${this.frameWidth * frames}px`;
  }
  private triggerSlideEvent(segment:Segment, segments: Segment[], handleCode: number) {
    this.dispatchEvent(
      { eventType: TRACKS_EVENT_TYPES.SEGMENTS_SLIDED },
      {
        segment,
        segments,
        handleCode,
      }
    );
    return segments;
  }
  private triggerSlideEndEvent(segment: Segment, handleCode: number) {
    this.dispatchEvent(
      { eventType: TRACKS_EVENT_TYPES.SEGMENTS_SLIDE_END },
      {
        segment,
        segments: this.lastEffectSegments,
        handleCode,
      }
    );
  }
  setFrameWidth(w: number) {
    this.frameWidth = w;
  }
  check(copy: boolean, segment: Segment) {
    // copy 说明是非轨道内的 Segment 拖动，即拖入并新建 Segment
    // ！！！由于异步，拖入后需要检测是否发生碰撞,如果发生碰撞则需要删除
    if (copy && collisionCheckFrame(segment.dom, this.dom)) {
      this.removeSegment(segment);
      return true;
    }
    return false;
  }
  // 删除 class 状态
  removeStatusClass() {
    const cl = this.dom.classList;
    cl.remove(CLASS_NAME_TRACK_DRAG_OVER);
    cl.remove(CLASS_NAME_TRACK_DRAG_OVER_ERROR);
    const placeHolder = getSegmentPlaceholder(this.dom);
    if (!placeHolder) {
      return;
    }
    placeHolder.style.opacity = '0';
  }
  // 拖动开始
  pointerdown(segment: Segment) {
    this.originFramestart = segment.framestart;
    this.originFrameend = segment.frameend;
  }
  // 拖动中
  pointermove({
    scrollContainerX,
    segment,
    dragTrackContainerRect,
  }: DragingArgs) {
    const placeHolder = getSegmentPlaceholder(this.dom);
    if (!placeHolder) {
      return;
    }
    this.dom.classList.add(CLASS_NAME_TRACK_DRAG_OVER);
    const trackType = this.trackType;
    const segmentType = segment.dataset.segmentType ?? "";
    // 如果轨道id 与 片断内存的轨道 id 不同，则说明不能拖到这条轨道
    if (!isContainSplitFromComma(trackType, segmentType)) {
      this.dom.classList.add(CLASS_NAME_TRACK_DRAG_OVER_ERROR);
    }
    const x = dragTrackContainerRect.left + scrollContainerX;
    // 拖动时轨道内占位元素
    placeHolder.style.width = `${dragTrackContainerRect.width}px`;
    placeHolder.style.left = `${x}px`;
    // 利用各轨道内的 placeholder 与 轨道内所有现有存 segment进行x轴碰撞检测
    const isCollistion = collisionCheckX(placeHolder, this.dom);
    // 占位与其它元素如果碰撞则隐藏即不允许拖动到此处
    if (isCollistion) {
      placeHolder.style.opacity = "0";
    } else {
      placeHolder.style.opacity = "1";
    }
  }
  hidePlaceHolder(){
    const placeHolder = getSegmentPlaceholder(this.dom);
    if (!placeHolder) {
      return;
    }
    placeHolder.style.opacity = "0";
  }
  precheck(segmentType: string){
    // 如果轨道id 与 片断内存的轨道 id 不同，则说明不能拖到这条轨道
    if(!isContainSplitFromComma(this.trackType, segmentType)){
      return false;
    }
    const placeHolder = getSegmentPlaceholder(this.dom);
    if (!placeHolder) {
      return false;
    }
    const isCollistion = collisionCheckX(
      placeHolder,
      this.dom
    );
    if(isCollistion){
      return false;
    }
    return true;
  }
  // 拖动结束
  pointerup({
    copy,
    framestart,
    segment,
  }: {
    copy: boolean;
    framestart: number;
    segment: Segment;
  }): Segment | null {
    const placeHolder = getSegmentPlaceholder(this.dom);
    if (!placeHolder) {
      return null;
    }
    placeHolder.style.opacity = "0";
    // 如果不合法，则需要删除
    const checkResult = this.check(copy, segment);
    if (checkResult) {
      this.removeSegment(segment);
      return null;
    }
    const isCollistion = collisionCheckX(
      placeHolder,
      this.dom
    );
    // 普通轨道
    if (!isCollistion) {
      const [fs, fd] = getFrameRange(segment.dom);
      const frameend = framestart + (fd - fs);
      segment.setRange(framestart, frameend);
      this.addSegment(segment);
      return segment;
    }
    return null;
  }
  addSegment(segment: Segment) {
    const isAdded = this.segments.get(segment.segmentId);
    // 如果添加过了，则无需再添加
    if (isAdded) {
      // 如果拖动前与拖动后位置没有发生变化，则什么都不做
      if (
        this.originFramestart === segment.framestart &&
        this.originFrameend === segment.frameend
      ) {
        return;
      }
      // 拖动放回原处是异步，拖完也要延时
      setTimeout(() => {
        this.updateSegmentHandler();
        // 拖完后触发回调
        this.dispatchEvent(
          { eventType: TRACKS_EVENT_TYPES.DRAG_END },
          { segment }
        );
      }, 2);
      return;
    }
    // 如果是从别的轨道拖过来的，需要从原轨道移聊
    if(segment.parentTrack){
      segment.parentTrack.segments.delete(segment.segmentId);
    }
    this.segments.set(segment.segmentId, segment);
    this.dom.appendChild(segment.dom);
    segment.setTrack(this);
    this.updateSegmentHandler();
    this.dispatchEvent(
      { eventType: TRACKS_EVENT_TYPES.SEGMENT_ADDED },
      { segment }
    );
  }
  removeSegment(segment: Segment) {
    this.segments.delete(segment.segmentId);
    segment.dom.parentElement?.removeChild(segment.dom);
    this.dispatchEvent(
      { eventType: TRACKS_EVENT_TYPES.SEGMENT_DELETED },
      {
        segment,
      }
    );
  }
  // 获取非 segmentId 之外的所有 segment
  getOtherSegments(segmentId: string) {
    const segments = this.getSegments();
    return segments.filter((segment) => segment.segmentId !== segmentId);
  }
  // 仅获取自身轨道内的 segments
  getSegmentsSelf(){
    return Array.from(this.segments.values())
  }
  // 获取自身轨道及子轨道内的所有 segmetns 
  getSegments() {
    let result: Segment[] = Array.from(this.segments.values());
    if (this.subTracks) {
      for (const [_, subtrack] of this.subTracks) {
        result = [...result, ...subtrack.getSegments()];
      }
    }
    return result;
  }
  getSegmentById(segmentId: string) {
    return this.getSegments().find(
      (segment) => segment.segmentId === segmentId
    );
  }
  getLastSegment() {
    // 根据 frameend 值排序后获取最后一个 Segment
    const segments = this.getSegments().sort((a, b) => {
      // b 排在 a 后
      if (a.frameend < b.frameend) {
        return -1;
      }
      // b 排在 a 前
      if (a.frameend > b.frameend) {
        return 1;
      }
      return 0;
    });
    return segments[segments.length - 1];
  }
  updateSegmentHandler() {}
  setVisibility(visibility: boolean) {
    this.visibility = visibility;
    this.dom.style.visibility = this.visibility ? "visible" : "hidden";
  }
  getTracks(){
    return Array.from(this.subTracks.values());
  }
  addTrack(track: Track){
    this.subTracks.set(track.trackId, track);
  }
  removeTrack(track: Track){
    this.subTracks.delete(track.trackId);
  }
  // 折叠
  collapse(collapse: boolean){
    this.collapsed = collapse;
    this.dom.style.display = collapse ? 'none' : 'block';
  }
  // 折叠子轨道
  collapseSubTracks(collapse: boolean){
    this.subTracksCollapsed = collapse;
    this.subTracks.forEach( v => v.collapse(collapse));
  }
  destroy() {
    this.dom.removeEventListener("mousedown", this.mousedown);
    this.dom.removeEventListener("click", this.click);
  }
}
