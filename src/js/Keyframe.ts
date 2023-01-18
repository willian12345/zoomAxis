/**
 * Segment 基础 dom 结构
 * <div class="segment segment-action actived" data-segment-id="2" data-track-id="" data-framestart="14" data-frameend="44">
 *  <div class="segment-handle segment-handle-left"></div>
 *  <div class="segment-handle segment-handle-right"></div>
 * </div>
 */
import { KeyframeConstructInfo, SegmentType } from "./TrackType";
import { createNodeWidthClass } from './trackUtils'
import { Segment } from "./Segment";

export class Keyframe {
  frame = 0
  frameWidth = 0
  segmentId = "";
  className = "segment-keyframe";
  dom = {} as HTMLElement;
  parent: Segment | null = null;
  actived = false;
  constructor(args: KeyframeConstructInfo) {
    this.segmentId = args.segmentId;
    this.frameWidth = args.frameWidth;
    this.frame = args.frame
    this.dom = createNodeWidthClass(this.className);
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
      this.dom.classList.add("actived");
    } else {
      this.actived = false;
      this.dom.classList.remove("actived");
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
