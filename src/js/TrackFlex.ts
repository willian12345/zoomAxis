/**
 * TrackFlex 伸缩轨道
 */

import { Segment } from "./Segment";
import { TimelineAxis } from "./TimelineAxis";
import { Track } from "./Track";
import { TRACKS_EVENT_TYPES, TrackArgs, DragingArgs } from "./TrackType";
import {
  isContainSplitFromComma,
  getSegmentPlaceholder,
  getLeftValue,
  sortByLeftValue,
  getRightSideSegments,
  getLeftSideSegments,
} from "./trackUtils";
interface TrackFlexArgs {
  totalFrames: number
}
const DEFAULT_SEGMENT_FRAMES = 150;
export class TrackFlex extends Track {
  totalFrames = 0
  isFlex = true;
  framestart = 0; // 当前轨道拖动的 segment  framestart
  frameend = 0; // 当前轨道拖动的 segment frameend
  frames = 0; // 当前轨道拖动的 segment frames 
  constructor(args: TrackArgs & TrackFlexArgs) {
    super(args);
    this.totalFrames = args.totalFrames;
  }
  getCollisionByFrame(frame: number) {
    return (
      this.getSegments().find((segment: Segment) => {
        const segmentFramestart = segment.framestart;
        const segmentFrameend = segment.frameend;
        // 碰撞检测（通过计算开始帧与结束帧）且不是自身
        if (frame >= segmentFramestart && frame < segmentFrameend) {
          return true;
        }
        return false;
      }) ?? null
    );
  }
  sliceSegment(track: Track, framestart: number): [Segment | null, number] {
    let collisionSegmentFrameend = -1;
    // 过滤出重叠的 segment (在可伸展轨道)
    let segments = track.getSegments();
    // 如果只有刚拖入的 segment 则不需要额外处理
    if (segments.length === 0) {
      return [null, collisionSegmentFrameend];
    }
    const collisionSegment = this.getCollisionByFrame(framestart);
    if (collisionSegment) {
      let sFramestart = collisionSegment.framestart;
      let sFrameend = collisionSegment.frameend;
      collisionSegmentFrameend = sFrameend;
      if (sFrameend > framestart && sFramestart < framestart) {
        sFrameend = framestart;
        collisionSegment.setRange(sFramestart, framestart);
      } else if (sFramestart >= framestart) {
        // 如果是完全覆盖则需要删除覆盖下的segment
        this.removeSegment(collisionSegment);
      }
    }
    return [collisionSegment, collisionSegmentFrameend];
  }
  pointerdown(segment: Segment){
    this.framestart = segment.framestart;
    this.frameend = segment.frameend;
    this.frames = segment.frameend - segment.framestart;
  }
  pointermove({
    isCopy,
    scrollContainerX,
    segment,
    dragTrackContainerRect,
  }: DragingArgs) {
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
    const virtualSegment = this.getSegmentById(segment.dataset.segmentId ?? "");
    // 轨道内拖动实时变更 segment 信息
    virtualSegment &&
      this.collisionHorizontal(isCopy, virtualSegment, placeHolder);
  }
  // 轨道内横向碰撞检测
  collisionHorizontal(
    isCopy: boolean,
    currentSegment: Segment,
    placeholder: HTMLElement,
  ) {
    if (isCopy) {
      return;
    }
    const virtualSegments = this.getSegments();
    const placeholderLeft = getLeftValue(placeholder);
    const onRightSegments = getRightSideSegments(
      virtualSegments,
      placeholderLeft
    );
    const onLeftSegments = getLeftSideSegments(
      virtualSegments,
      placeholderLeft
    );
    // 从左往右拖时，把原右边的往左边挤
    for (let segment of onLeftSegments) {
      const segmentFramestart = segment.framestart;
      const segmentFrameend = segment.frameend;
      // console.log(segmentFramestart, this.frames)
      // 如果左侧片断的左侧有空格(this.framestart 空格开始帧，this.frameend 空格结束帧)
      if (segmentFramestart > this.framestart) {
        // 向左移动一个片断
        const framestartMoved = segmentFramestart - this.frames;
        const frameendMoved = segmentFrameend - this.frames;
        segment.setRange(framestartMoved, frameendMoved);
        this.framestart = frameendMoved;
        this.frameend = frameendMoved + this.frames;
      }
    }
    // 从右往左拖时，把原左边的往右边挤
    // 判断右侧片断时，需要先将片断反转从右边头上开始判断一步步向右移动
    for (let segment of onRightSegments.reverse()) {
      const segmentFramestart = segment.framestart;
      const segmentFrameend = segment.frameend;
      // 如果右侧片断的右侧有空格(this.framestart 空格开始帧，this.frameend 空格结束帧)
      if (segmentFramestart < this.framestart) {
        // 向右移动一个片断
        const framestartMoved = segmentFramestart + this.frames;
        const frameendMoved = segmentFrameend + this.frames;
        segment.setRange(framestartMoved, frameendMoved);
        this.framestart = segmentFramestart;
        this.frameend = segmentFramestart + this.frames;
      }
    }
    currentSegment.setRange(this.framestart, this.frameend);
  }
  pointerup({
    copy,
    framestart,
    segment,
  }: {
    copy: boolean;
    framestart: number;
    segment: Segment;
  }): Segment|null{
    // 如果是轨道内的拖动，则不需要裁剪功能
    if (!copy) {
      this.addSegment(segment);
      return null;
    }
    // 裁剪轨道内的相关 segments 功能
    const segments = this.getSegments() ?? [];
    let frameend = this.totalFrames;
    // 如果轨道内只有一个 segment 则铺满整个轨道
    if (segments.length === 0) {
      framestart = 0;
    } else if (framestart > this.totalFrames) {
      // 如果是拖到了伸缩轨道最后，则往后加长
      framestart = this.totalFrames;
      frameend = framestart + DEFAULT_SEGMENT_FRAMES;
    }
    segment.setRange(framestart, frameend);
    // 切割碰上的 segment
    const [effectSegment, effectSegmentOriginFrameend] = this.sliceSegment(
      this,
      framestart
    );
    this.addSegment(segment);
    if (effectSegment) {
      frameend = effectSegmentOriginFrameend;
      segment.setRange(framestart, frameend);
      this.dispatchEvent(
        { eventType: TRACKS_EVENT_TYPES.DROP_EFFECT },
        {
          segment: effectSegment,
        }
      );
    }
    this.framestart = framestart;
    this.frameend = frameend;
    return segment;
  }
  removeSegment(segment: Segment): void {
    const frames = segment.frameend - segment.framestart;
    const segments = this.getSegments();
    // 获取紧邻右侧的邻居
    const segmentRightSide = getRightSideSegments(
      segments,
      getLeftValue(segment.dom)
    )[0];
    // 如果右侧有 segment 则将右侧segment 起始帧移到被删除segment的起始帧
    if (segmentRightSide) {
      const framestart = segmentRightSide.framestart - frames;
      const frameend = segmentRightSide.frameend;
      segmentRightSide.setRange(framestart, frameend);
    } else {
      // 右侧没有且左侧有，则将左侧 segment 结束帧移到被删除 segment 结束帧
      const segmentLeftSide = getLeftSideSegments(
        segments,
        getLeftValue(segment.dom)
      ).reverse()[0];
      if (segmentLeftSide) {
        const framestart = segmentLeftSide.framestart;
        const frameend = segmentLeftSide.frameend + frames;
        segmentLeftSide.setRange(framestart, frameend);
      }
    }
    // 调用父类执行删除操作
    super.removeSegment(segment);
  }
  // 更新可拖动手柄
  updateSegmentHandler(){
    const segments = this.getSegments().sort(sortByLeftValue);
    console.log(segments);
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
  setTotalFrames(n: number){
    this.totalFrames = n;
  }
}
