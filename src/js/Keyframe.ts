/**
 * Keyframe 基础 dom 结构
 * <div class="segment-keyframe" data-frame="0" style="left: 0px;"></div>
 */
import { KeyframeConstructInfo, SegmentType } from "./TrackType";
import { createNodeWidthClass, CLASS_NAME_SEGMENT_KEYFRAME, CLASS_NAME_SEGMENT_KEYFRAME_ACTIVED } from './trackUtils'
import { Segment } from "./Segment";

export class Keyframe {
  frame = 0
  frameWidth = 0
  segmentId = "";
  dom = {} as HTMLElement;
  parent: Segment | null = null;
  actived = false;
  constructor(args: KeyframeConstructInfo) {
    this.segmentId = args.segmentId;
    this.frameWidth = args.frameWidth;
    this.frame = args.frame
    this.dom = createNodeWidthClass(CLASS_NAME_SEGMENT_KEYFRAME);
    this.dom.dataset.frame = String(this.frame);
    this.resize();
  }
  // 设置父级
  setParent(segment: Segment) {
    this.parent = segment;
  }
  // 是否是当前选中状态
  setActived(bool: boolean) {
    if (bool) {
      this.actived = true;
      this.dom.classList.add(CLASS_NAME_SEGMENT_KEYFRAME_ACTIVED);
    } else {
      this.actived = false;
      this.dom.classList.remove(CLASS_NAME_SEGMENT_KEYFRAME_ACTIVED);
    }
  }
  setFrameWidth(width: number){
    this.frameWidth = width;
    this.resize();
  }
  resize(){
    this.dom.style.left = `${this.frameWidth * (this.frame)}px`;
  }
  destroy(){
    
  }
}
