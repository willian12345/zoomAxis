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
} from "./trackUtils";
import { TrackArgs, DragingArgs, TRACKS_EVENT_TYPES } from './TrackType'
import { EventHelper } from "./EventHelper";

export class Track  extends EventHelper{
  dom = {} as HTMLElement;
  trackId = "";
  trackClass = "";
  trackPlaceholderClass = "";
  dragoverClass = "dragover";
  dragoverErrorClass = "dragover-error";
  visibility = true;
  segments: Map<string, Segment> = new Map(); // 轨道内的 segment
  subTracks: Map<string, Track> = new Map(); // 子轨道
  frameWidth: number = 0;
  originFramestart = 0 // 拖动前 framestart
  originFrameend = 0 // 拖动前 frameend
  constructor({
    trackClass = "track",
    trackPlaceholderClass = "track-placeholder",
    dom,
    frameWidth,
  }: TrackArgs) {
    super();
    this.trackClass = trackClass;
    this.trackPlaceholderClass = trackPlaceholderClass;
    this.frameWidth = frameWidth;
    this.dom = dom;
    this.trackId = dom.dataset.trackId ?? "";
  }
  setFrameWidth(w: number){
    this.frameWidth = w;
  }
  private getFramestartByX(x: number): number {
    let currentFrame = Math.round(x / this.frameWidth);
    if (currentFrame < 0) {
      currentFrame = 0;
    }
    return currentFrame;
  }
  check(copy: boolean, segment: Segment){
    // copy 说明是非轨道内的 Segment 拖动，即拖入并新建 Segment
    // ！！！拖入后需要检测是否发生碰撞,如果发生碰撞则需要删除
    if (copy && collisionCheckFrame(segment.dom, this.dom)) {
      this.removeSegment(segment);
      return true;
    }
    return false;
  }
  // 删除 class 状态
  removeStatusClass(){
    const cl = this.dom.classList
    cl.remove(this.dragoverClass);
    cl.remove(this.dragoverErrorClass);
    const placeHolder = getSegmentPlaceholder(this.dom);
    if (!placeHolder) {
      return;
    }
    placeHolder.style.opacity = "0";
  }
  pointerdown(segment: Segment){
    this.originFramestart = segment.framestart;
    this.originFrameend = segment.frameend;
  }
  pointermove({
    scrollContainerX,
    segment,
    dragTrackContainerRect,
  }: DragingArgs){
    const placeHolder = getSegmentPlaceholder(this.dom);
    if (!placeHolder) {
      return;
    }
    this.dom.classList.add(this.dragoverClass);
    const trackType = this.dom.dataset.trackType ?? "";
    const segmentType = segment.dataset.segmentType ?? "";
    // 如果轨道id 与 片断内存的轨道 id 不同，则说明不能拖到这条轨道
    if (!isContainSplitFromComma(trackType, segmentType)) {
      this.dom.classList.add(this.dragoverErrorClass);
    }
    const x = dragTrackContainerRect.left + scrollContainerX;
    // 拖动时轨道内占位元素
    placeHolder.style.width = `${dragTrackContainerRect.width}px`;
    placeHolder.style.left = `${x}px`;
    // 利用各轨道内的 placeholder 与 轨道内所有现有存 segment进行x轴碰撞检测
    const [isCollistion] = collisionCheckX(placeHolder, this.dom);
    // 占位与其它元素如果碰撞则隐藏即不允许拖动到此处
    if (isCollistion) {
      placeHolder.style.opacity = "0";
    } else {
      placeHolder.style.opacity = "1";
    }
  }
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
    if(checkResult){
      this.removeSegment(segment);
      return null
    }
    const [isCollistion, magnet, magnetTo] = collisionCheckX(
      placeHolder,
      this.dom
    );
    // 普通轨道
    if (!isCollistion || magnet) {
      // 如果 x 轴磁吸，则需要根据磁吸的 segment 重新计算 framestart 与 segmentLeft 值
      if (magnet && magnetTo) {
        const magnetToRect: DOMRect = magnetTo.getBoundingClientRect();
        const magnetLeft: number = getLeftValue(magnetTo);
        const x = magnetLeft + magnetToRect.width;
        framestart = this.getFramestartByX(x);
      }
      const [fs, fd] = getFrameRange(segment.dom);
      const frameend = framestart + (fd - fs);
      segment.setRange(framestart, frameend);
      this.addSegment(segment);
      return segment
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
    this.segments.set(segment.segmentId, segment);
    this.dom.appendChild(segment.dom);
    segment.setTrack(this);
    this.updateSegmentHandler();
    this.dispatchEvent(
      { eventType: TRACKS_EVENT_TYPES.SEGMENT_ADDED },
      { segment }
    )
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
  updateSegmentHandler() {
    
  }
  setVisibility(visibility: boolean) {
    this.visibility = visibility;
    this.dom.style.visibility = this.visibility ? "visible" : "hidden";
  }
}
