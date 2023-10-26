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
} from "./trackUtils";
import { Segment } from './Segment'
import {
  ITrackArgs,
  DragingArgs,
} from "./TrackType";
import { Track } from "./Track";
export type TMoveFunctionArgs = {
  frameWidth: number;
  segmentDom: HTMLElement;
  framestart: number;
  frameend: number;
};
export class TrackChildOverlap extends Track {
  constructor({ trackId, trackType, frameWidth, createSegmentCheck }: ITrackArgs) {
    super( {trackId, trackType, frameWidth, createSegmentCheck} );
    
  }
  precheck(segmentType: string) {
    // 如果轨道id 与 片断内存的轨道 id 不同，则说明不能拖到这条轨道
    if (!isContainSplitFromComma(this.trackType, segmentType)) {
      return false;
    }
    const placeHolder = getSegmentPlaceholder(this.dom);
    if (!placeHolder) {
      return false;
    }
    return true;
  }
  draging({
    scrollContainer,
    segmentDom,
    segmentId,
  }: DragingArgs) {
    const placeHolder = getSegmentPlaceholder(this.dom, segmentId);
    if (!placeHolder) {
      return;
    }
    placeHolder.style.opacity = "1";
    this.dom.classList.add(CLASS_NAME_TRACK_DRAG_OVER);
    const trackType = this.trackType;
    const segmentType = segmentDom.dataset.segmentType ?? "";
    // 如果轨道id 与 片断内存的轨道 id 不同，则说明不能拖到这条轨道
    if (!isContainSplitFromComma(trackType, segmentType)) {
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
    const placeHolder = getSegmentPlaceholder(this.dom);
    if (!placeHolder) {
      return null;
    }
    placeHolder.style.opacity = "0";
    
    // 普通轨道
    const [fs, fd] = getFrameRange(segment.dom);
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
