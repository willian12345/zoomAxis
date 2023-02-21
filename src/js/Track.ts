/**
 * Track 基础 dom 结构
 * <div class="track">
 *  <div class="track-placeholder"></div>
 *  <div class="segment"></div>
 * </div>
 */
import { Segment } from "./Segment";
import {
  sortByLeftValue,
  collisionCheckX,
  getFrameRange,
  getLeftValue,
  getSegmentPlaceholder,
  collisionCheckFrame,
} from "./trackUtils";
import { TrackArgs } from './TrackType'
import { EventHelper } from "./EventHelper";

export class Track  extends EventHelper{
  dom = {} as HTMLElement;
  trackId = "";
  trackClass = "";
  trackPlaceholderClass = "";
  isStretchTrack = false; // 是否是伸缩轨道
  visibility = true;
  segments: Map<string, Segment> = new Map(); // 轨道内的 segment
  subTracks: Map<string, Track> = new Map(); // 子轨道
  frameWidth: number = 0;
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
    this.isStretchTrack = dom.classList.contains("track-stretch");
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
  drop({
    copy,
    framestart,
    segment,
  }: {
    copy: boolean;
    framestart: number;
    segment: Segment;
  }) {
    const placeHolder = getSegmentPlaceholder(this.dom);
    if (!placeHolder) {
      return;
    }
    placeHolder.style.opacity = "0";
    // 如果不合法，则需要删除
    const checkResult = this.check(copy, segment);
    if(checkResult){
      this.removeSegment(segment);
      return
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
    }
  }
  addSegment(segment: Segment) {
    this.segments.set(segment.segmentId, segment);
    this.dom.appendChild(segment.dom);
    segment.setTrack(this);
  }
  removeSegment(segment: Segment) {
    this.segments.delete(segment.segmentId);
    segment.dom.parentElement?.removeChild(segment.dom);
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
    if (!this.isStretchTrack) return;
    const segments = this.getSegments().sort(sortByLeftValue);
    // 如果只有一个 segment 则不允许左右手柄拖动
    if (segments.length === 1) {
      return segments[0].setHandleEnable(false, false);
    }
    const l = segments.length - 1;
    segments.forEach((segment, index) => {
      if (index === 0) {
        // 最左侧不允许拖动
        return segment.setHandleEnable(false, true);
      }
      if (l === index) {
        // 最右侧手柄不允许拖动
        return segment.setHandleEnable(true, false);
      }
      segment.setHandleEnable(true, true);
    });
  }
  setVisibility(visibility: boolean) {
    this.visibility = visibility;
    this.dom.style.visibility = this.visibility ? "visible" : "hidden";
  }
}
