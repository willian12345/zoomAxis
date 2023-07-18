/**
 * TrackMergeable
 * Segment 可叠加
 * Track 基础 dom 结构
 * <div class="track">
 *  <div class="track-placeholder"></div>
 *  <div class="segment"></div>
 * </div>
 */
import {
  CLASS_NAME_TRACK_DRAG_OVER,
  CLASS_NAME_TRACK_DRAG_OVER_ERROR,
  isContainSplitFromComma,
  getSegmentPlaceholder,
  getFrameRange,
  createContainer,
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
  segmentHandleContainer: HTMLElement
  constructor({ trackId, trackType, frameWidth, createSegmentCheck }: ITrackArgs) {
    super( {trackId, trackType, frameWidth, createSegmentCheck} );
    const div = createContainer('segment-handle-container', 'height:100%; z-index: 100;');
    this.dom.appendChild(div);
    this.segmentHandleContainer = div;
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
  pointermove({
    scrollContainerX,
    segment,
    dragTrackContainerRect,
  }: DragingArgs) {
    const placeHolder = getSegmentPlaceholder(this.dom);
    if (!placeHolder) {
      return;
    }
    placeHolder.style.opacity = "1";
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
  }
  pointerup({
    framestart,
    segment,
  }: {
    copy: boolean;
    framestart: number;
    segment: Segment;
  }): Segment|null {
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
  protected leftHandleMove({
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
    this.updateSegmentHandlerPos(segment);
    return;
  }
  // segment 右侧手柄拖动
  protected rightHandleMove({
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
    this.updateSegmentHandlerPos(segment);
    return;
  }
  addSegment(segment: Segment): Segment | null {
    const result = super.addSegment(segment)
    result && this.updateSegmentHandlerFloat(result);
    this.updateSegmentHandlerPos(segment)
    return result
  }
  updateSegmentHandlerPos(segment: Segment){
    segment.leftHandler.style.left = `${segment.framestart * this.frameWidth}px`;
    segment.rightHandler.style.left = `${(segment.framestart + (segment.frameend - segment.framestart)) * this.frameWidth}px`;
  }
  // 让拖动手柄脱离 segment 浮在轨道上
  updateSegmentHandlerFloat(segment: Segment): void {
    segment.setHandleVisible(true);
    this.segmentHandleContainer.append(segment.leftHandler);
    segment.leftHandler.addEventListener('mousedown', (e)=> {
      this.dragHandleStart(e, segment.leftHandler, this.leftHandleMove.bind(this), 0);
    }, true);
    this.segmentHandleContainer.append(segment.rightHandler);
    segment.rightHandler.addEventListener('mousedown', (e)=> {
      this.dragHandleStart(e, segment.rightHandler, this.rightHandleMove.bind(this), 0);
    }, true);

    console.log(segment.rightHandler)
  }
}
