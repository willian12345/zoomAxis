/**
 * TrackMergeable
 * 此类型轨道内 Segment 可叠加
 */
import {
  CLASS_NAME_TRACK_DRAG_OVER,
  CLASS_NAME_TRACK_DRAG_OVER_ERROR,
  isContainSplitFromComma,
  getSegmentPlaceholder,
  getFrameRange,
} from "../trackUtils";
import { Segment } from '../Segment'
import { trackRenderers } from '../trackRendererManager';
import {
  ITrackArgs,
  DragingArgs,
} from "../TrackType";
import { Track } from "./Track";
export class TrackSegmentOverlap extends Track {
  static trackType = 'segmentOverlap'
  constructor({ trackId, segmentTypes, frameWidth, createSegmentCheck }: ITrackArgs) {
    super( {trackId, segmentTypes, frameWidth, createSegmentCheck} );
    
  }
  precheck(_scrollContainer: HTMLElement, segmentType: string) {
    // 如果轨道id 与 片断内存的轨道 id 不同，则说明不能拖到这条轨道
    if (!isContainSplitFromComma(this.segmentTypes, segmentType)) {
      return false;
    }
    // const placeHolder = getSegmentPlaceholder(this.dom, segment);
    // if (!placeHolder) {
    //   return false;
    // }
    return true;
  }
  draging({
    scrollContainer,
    segmentDom,
    segment,
  }: DragingArgs) {
    const placeHolder = getSegmentPlaceholder(this.dom, segment);
    if (!placeHolder) {
      return;
    }
    placeHolder.style.opacity = "1";
    this.dom.classList.add(CLASS_NAME_TRACK_DRAG_OVER);
    const segmentTypes = this.segmentTypes;
    const segmentType = segmentDom.dataset.segmentType ?? "";
    // 如果轨道id 与 片断内存的轨道 id 不同，则说明不能拖到这条轨道
    if (!isContainSplitFromComma(segmentTypes, segmentType)) {
      this.dom.classList.add(CLASS_NAME_TRACK_DRAG_OVER_ERROR);
    }
    const scrollContainerX = scrollContainer.getBoundingClientRect().left;
    const rect = segmentDom.getBoundingClientRect()
    // 拖动时轨道内占位元素
    placeHolder.style.width = `${rect.width}px`;
    placeHolder.style.left = `${rect.left - scrollContainerX + scrollContainer.scrollLeft}px`;

  }
  dragend({
    framestart,
    segment,
  }: {
    copy: boolean;
    framestart: number;
    segment: Segment;
  }): Segment|null {
    this.isDraging = false;
    const placeHolder = getSegmentPlaceholder(this.dom, segment);
    if (!placeHolder) {
      return null;
    }
    // placeHolder.style.opacity = "0";
    
    // 普通轨道
    const [fs, fd] = getFrameRange(segment.dom);
    segment.prevFrameStart = fs;
    segment.prevFrameEnd = fd;
    const frameend = framestart + (fd - fs);
    segment.setRange(framestart, frameend);
    this.addSegment(segment);
    return segment;
  }
  // segment 左侧手柄拖动
  leftHandleMove({
    framestart,
    segmentDom,
  }: {
    framestart: number;
    segmentDom: HTMLElement;
  }): Segment | undefined {
    const segment = this.getSegmentById(segmentDom.dataset.segmentId ?? "");
    if (!segment) return;
    const frameend = parseFloat(segmentDom.dataset.frameend ?? "0");
    if (framestart >= frameend - 2) {
      return;
    }
    if (!this.slideable(framestart, frameend)) return;
    if (framestart < 0) {
      framestart = 0;
    }
    segment.setRange(framestart, frameend);
    segment.setHover(true);
    // 左侧手柄被拖动时需要更新关键帧的 left 值以抵销相对定位导致关键帧的左右移动
    segment.syncKeyframesLeftPosition();
    return;
  }
  // segment 右侧手柄拖动
  rightHandleMove({
    frameend,
    segmentDom,
  }: {
    frameend: number;
    segmentDom: HTMLElement;
  }): Segment | undefined {
    const segment = this.getSegmentById(segmentDom.dataset.segmentId ?? "");
    const framestart = parseFloat(segmentDom.dataset.framestart ?? "0");
    if (!segment) return;
    if (frameend <= framestart + 2) return;
    if (!this.slideable(framestart, frameend)) return;
    this.triggerSlideEvent(segment, [], 1);
    segment.setRange(framestart, frameend);
    segment.setHover(true);
    return;
  }
}

trackRenderers.add(TrackSegmentOverlap.trackType, TrackSegmentOverlap)