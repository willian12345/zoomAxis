/**
 * Keyframe 基础 dom 结构
 * <div class="segment-keyframe" data-frame="0" style="left: 0px;"></div>
 */
import { EventHelper } from "./EventHelper";
import { KeyframeConstructInfo, SegmentType, TRACKS_EVENT_TYPES } from "./TrackType";
import { createNodeWidthClass, CLASS_NAME_SEGMENT_KEYFRAME, CLASS_NAME_SEGMENT_KEYFRAME_ACTIVED, getLeftValue } from './trackUtils'
import { Segment } from "./Segment";

export class Keyframe extends EventHelper  {
  frame = 0
  frameWidth = 0
  segmentId = "";
  dom = {} as HTMLElement;
  parent: Segment | null = null;
  actived = false;
  constructor(args: KeyframeConstructInfo) {
    super();
    this.segmentId = args.segmentId;
    this.frameWidth = args.frameWidth;
    this.frame = args.frame
    this.dom = createNodeWidthClass(CLASS_NAME_SEGMENT_KEYFRAME);
    this.dom.dataset.frame = String(this.frame);
    this.resize();
    this.initEvent();
  }
  initEvent(){
    this.dom.addEventListener('click', this.click)
    this.dom.addEventListener('mousedown', this.pointerDown)
    this.dom.addEventListener('mouseup', this.pointerUp)
  }
  click = (e: MouseEvent) => {
    if(!this.parent){
      return;
    }
    // 先移除所有关键帧actived样式
    this.parent.keyframes.forEach(keyframe=> keyframe.setActived(false));
    this.setActived(true);
    this.parent?.parentTrack?.triggerEvent(
      TRACKS_EVENT_TYPES.KEYFRAME_CLICK,
      {
        keyframe: this.parent.framestart + this.frame,
      }
    );
  }
  pointerUp = (e: MouseEvent) => {
    // e.stopPropagation();
  }
  // 拖动关键帧
  pointerDown = (e:MouseEvent) => {
    e.stopPropagation();
    if(!this.parent) return;
    if(!this.parent.actived){
      // 父级的 segment 必须是选中状态才能操作
      return
    }
    const segmentDom = this.parent.dom;
    const left: number = getLeftValue(segmentDom) as number;
    let startX = e.clientX;
    const origionFrame = this.frame;
    const mousemove = (e: MouseEvent) => {
      e.stopPropagation();
      if(!this.parent) return;
      const moveX = e.clientX - startX;
      const x = left + moveX;
      // 需要定位到具体某一帧的位置
      const frame =  origionFrame + Math.round(x / this.frameWidth);
      
      if(frame - this.parent.framestart < 0){
        return
      }
      if(frame > this.parent.frameend ){
        return;
      }
      console.log(frame)
      this.frame = frame - this.parent.framestart;
      this.parent?.parentTrack?.triggerEvent(TRACKS_EVENT_TYPES.KEYFRAME_MOVING, {frame})
      this.resize();
    };
    const mouseup = (e: MouseEvent) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
      startX = e.clientX;
      if(origionFrame !== this.frame){
        this.parent?.parentTrack?.triggerEvent(TRACKS_EVENT_TYPES.KEYFRAME_MOVE_END, {from: origionFrame, to: this.frame})
      }
      document.body.removeEventListener("mousemove", mousemove);
      document.body.removeEventListener("mouseup", mouseup);
    };
    // 在body上侦听事件，顶级事件留给 Tracks 全局，用于冒泡处理
    document.body.addEventListener("mousemove", mousemove);
    document.body.addEventListener("mouseup", mouseup);
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
    this.dom.removeEventListener('mousedown', this.pointerDown);
    this.dom.removeEventListener('mouseup', this.pointerUp);
  }
}
