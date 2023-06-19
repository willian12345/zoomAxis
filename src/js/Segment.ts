/**
 * Segment 基础 dom 结构
 * <div class="segment segment-action actived" data-segment-id="2" data-track-id="" data-framestart="14" data-frameend="44">
 *  <div class="segment-handle segment-handle-left"></div>
 *  <div class="segment-handle segment-handle-right"></div>
 * </div>
 */
import { EventHelper } from "./EventHelper";
import { SegmentConstructInfo, SegmentType } from "./TrackType";
import { Track } from "./Track";
import { Keyframe } from "./Keyframe";
import {
  CLASS_NAME_SEGMENT_HANDLE,
  CLASS_NAME_SEGMENT_HANDLE_LEFT,
  CLASS_NAME_SEGMENT_HANDLE_RIGHT,
  CLASS_NAME_SEGMENT,
} from './trackUtils'

let segmentIdIndex = 0;
export class Segment extends EventHelper{
  origionTrackId = '' // 跨轨道拖动原轨道 trackId
  origionSegmentId = '' // 跨轨道拖动原轨道 segmentId
  origionParentTrack:Track|null = null; // 原轨道
  framestart = 0;
  frameend = 0;
  frames = 0;
  width: string | number = '80px';
  height: string | number = '24px';
  left: string | number = '0';
  segmentId = '';
  segmentStyle = '';
  dom = {} as HTMLElement;
  trackId = '';
  segmentType = SegmentType.BODY_ANIMATION;
  name = '';
  parentTrack: Track | null = null;
  actived = false;
  frameWidth = 0;
  extra = {};
  leftHandler = {} as HTMLElement
  rightHandler = {} as HTMLElement
  keyframes = [] as Keyframe[] // keyframes 内存储着关键帧，帧值是“相对帧”
  disabled = false
  // 内容渲染器，可传自定义的渲染内容，用于个性化
  contentRenderer: string|HTMLElement|null = null
  constructor(args: SegmentConstructInfo) {
    super();
    this.trackId = args.trackId;
    this.segmentId = args.segmentId ?? this.createSegmentId();
    this.framestart = args.framestart;
    this.frameend = args.frameend;
    this.frameWidth = args.frameWidth;
    
    if (args.width !== undefined) {
      this.width = args.width;
    }
    if (args.height !== undefined) {
      this.height = args.height;
    }
    if (args.left !== undefined) {
      this.left = args.left;
    }
    
    if(args.segmentStyle){
      this.segmentStyle = args.segmentStyle
    }
    // 内容渲染器
    if(args.contentRenderer){
      this.contentRenderer = args.contentRenderer;
    }
    this.segmentType = args.segmentType;
    this.name = args.name ?? "";
    this.dom = this.createDom();
    this.leftHandler = this.dom.querySelector(`.${CLASS_NAME_SEGMENT_HANDLE_LEFT}`) as HTMLElement;
    this.rightHandler = this.dom.querySelector(`.${CLASS_NAME_SEGMENT_HANDLE_RIGHT}`) as HTMLElement;
    // 额外其它信息
    if (args.extra) {
      this.extra = args.extra;
    }
    this.initEvents();
    this.setRange(this.framestart, this.frameend);
  }
  private initEvents() {
    this.dom.addEventListener('click', this.handleClick);
  }
  private handleClick = () => {
    
  }
  private createSegmentId() {
    return String(segmentIdIndex++);
  }

  private createDom() {
    const div = document.createElement("div");
    const defaultContentRenderer = `<div class="segment-name">${this.name}</div>`
    const contentRenderer = this.contentRenderer ? this.contentRenderer : defaultContentRenderer
    div.innerHTML = `
        <div 
          class="${CLASS_NAME_SEGMENT}" 
          data-segment-id="${this.segmentId}" 
          data-segment-type="${this.segmentType}" 
          data-track-id="${this.trackId}" 
          data-framestart="${this.framestart}" 
          data-frameend="${this.frameend}"
          style="width: ${this.width}; height: ${this.height}; left: ${this.left}; ${this.segmentStyle}">
          <div class="${CLASS_NAME_SEGMENT_HANDLE} ${CLASS_NAME_SEGMENT_HANDLE_LEFT}"></div>
          <div class="${CLASS_NAME_SEGMENT_HANDLE} ${CLASS_NAME_SEGMENT_HANDLE_RIGHT}"></div>
          <div class="segment-renderer">
            ${contentRenderer}
          </div>
        </div>
      `;
    return div.firstElementChild as HTMLElement;
  }
  private getSegmentLeft(framestart: number): number {
    return framestart * this.frameWidth;
  }
  private setHandleEnableStatus(dom: HTMLElement, enable: boolean){
    dom.style.pointerEvents = enable ? 'initial' : 'none';
  }
  
  // 设置帧范围
  setRange(framestart: number, frameend: number) {
    this.framestart = framestart;
    this.frameend = frameend;
    this.dom.dataset.framestart = String(framestart);
    this.dom.dataset.frameend = String(frameend);
    this.resize();
  }
  setTrackId(trackId: string) {
    this.trackId = trackId;
    this.dom.dataset.trackId = trackId;
  }
  // 设置父级
  setTrack(track: Track) {
    this.parentTrack = track;
    this.setTrackId(track.trackId);
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
  // 调整宽度值
  resize(
  ) {
    const segmentLeft = this.getSegmentLeft(this.framestart);
    const frames = this.frameend - this.framestart;
    this.frames = frames;
    this.dom.style.left = `${segmentLeft}px`;
    this.dom.style.width = `${this.frameWidth * frames}px`;
  }
  // 拖动手柄状态更新：是否响应拖动
  setHandleEnable(leftEnable: boolean, rightEnable: boolean){
    this.setHandleEnableStatus(this.leftHandler, leftEnable);
    this.setHandleEnableStatus(this.rightHandler, rightEnable);
  }
  setFrameWidth(width: number){
    this.frameWidth = width;
    this.resize();
    this.keyframes.forEach(keyframe => {
      keyframe.setFrameWidth(width);
    });
  }
  addKeyframe(frame: number){
    const keyframe = new Keyframe({
      segmentId: this.segmentId,
      frame,
      frameWidth: this.frameWidth,
    })
    this.keyframes.push(keyframe);
    this.dom.appendChild(keyframe.dom);
    keyframe.setParent(this);
  }
  deleteKeyframe(frame: number){
    const keyframe = this.keyframes.find( Keyframe => Keyframe.frame === frame);
    keyframe?.dom.parentElement?.removeChild(keyframe.dom);
    keyframe?.destroy();
    this.keyframes = this.keyframes.filter( keyframe => keyframe.frame !== frame);
  }
  deleteKeyframeAll(){
    this.keyframes.forEach( keyframe => {
      keyframe?.dom.parentElement?.removeChild(keyframe.dom);
      keyframe?.destroy();
    });
    this.keyframes = [];
  }
  // 删除不在可视范围内的关键帧
  deleteKeyframeOutOfRange(){
    const deletedArr = this.keyframes.filter(keyframe => {
      // 不在可视范围内
      return (this.framestart + keyframe.frame) > this.frameend
    })
    deletedArr.forEach( keyframe => {
      this.deleteKeyframe(keyframe.frame);
    });
    return deletedArr;
  }
  getActivedKeyframe(){
    return this.keyframes.find(keyframe => {
      return keyframe.actived
    })
  }
  getNextKeyframe(){
    const actived = this.getActivedKeyframe();
    
  }
  // 更新 自定义渲染器 renderer 用于渲染不同UI
  updateContentRenderer(renderer: string|HTMLElement){
    let div: HTMLElement;
    if(!renderer) return;
    if(typeof renderer === 'string'){
      div = document.createElement('div');
      div.innerHTML = renderer;
    }else{
      div = renderer;
    }
    const sr = this.dom.querySelector('.segment-renderer');
    if(!sr) return;
    const arr = Array.from(sr?.children) as HTMLElement[];
    arr.forEach((element) => {
      sr.removeChild(element)
    });
    sr.appendChild(div);
  }
  updateText(name: string){
    const sr = this.dom.querySelector('.segment-name');
    if(sr){
      sr.innerHTML = name;
    }
    this.name = name;
  }
  destroy(){
    this.dom.removeEventListener('click', this.handleClick);
    this.keyframes.forEach((keyframe)=> {
      keyframe.destroy();
    })
  }
}
