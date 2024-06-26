/**
 * Segment 基础 dom 结构
 * <div class="segment segment-action actived" data-segment-id="2" data-track-id="" data-framestart="14" data-frameend="44">
 *  <div class="segment-handle segment-handle-left"></div>
 *  <div class="segment-handle segment-handle-right"></div>
 * </div>
 */
import { EventHelper } from "./EventHelper";
import { TSegmentConstructParams, SegmentType, SegmentRendererConstructor } from "./TrackType";
import { Track } from "./track/Track";
import { Keyframe } from "./Keyframe";
import { SegmentRenderer} from './segmentRenderer/SegmentRenderer'

let segmentIdIndex = 0;
export class Segment extends EventHelper{
  originTrackId = '' // 跨轨道拖动原轨道 trackId
  originSegmentId = '' // 跨轨道拖动原轨道 segmentId
  originParentTrack:Track|null = null; // 原轨道
  prevFrameStart = 0 // 上一次拖动
  prevFrameEnd = 0 // 上一次拖动
  framestart = 0;
  frameend = 0;
  frames = 0;
  width: string | number = '80px';
  height: string | number = '24px';
  left: string | number = '0';
  segmentId = '';
  segmentStyle = '';
  dom!:HTMLElement;
  trackId = '';
  segmentType = -1;
  name = '';
  parentTrack: Track | null = null;
  actived = false;
  frameWidth = 0;
  extra = {};
  /**
   * 左右调节手柄由所属轨道创建
   */
  leftHandler!: HTMLElement // 左调节手柄由轨道指定
  rightHandler!: HTMLElement // 右调节手柄由轨道指定
  keyframes = [] as Keyframe[] // keyframes 内存储着关键帧，帧值是“相对帧”
  disabled = false
  segmentRenderer!: SegmentRenderer
  constructor(args: TSegmentConstructParams) {
    super();
    args.segmentId = args.segmentId ?? this.createSegmentId();
    this.trackId = args.trackId ?? '';
    this.segmentId = args.segmentId;
    this.framestart = args.framestart;
    this.frameend = args.frameend;
    this.prevFrameStart = this.framestart;
    this.prevFrameEnd = this.frameend;
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
    this.segmentType = args.segmentType;
    this.name = args.name ?? "";
    this.dom = this.createUI({...args});
    // 额外其它信息
    if (args.extra) {
      this.extra = args.extra;
    }
    this.setRange(this.framestart, this.frameend);
  }
  
  private createSegmentId() {
    return String(segmentIdIndex++);
  }

  private createUI(args: TSegmentConstructParams) {
    this.segmentRenderer = new args.segmentRendererConstructor(args)
    return this.segmentRenderer.wrapper;
  }
  getSegmentLeft(framestart?: number): number {
    framestart = framestart ?? this.framestart
    return framestart * this.frameWidth;
  }
  private setHandleEnableStatus(dom: HTMLElement, enable: boolean){
    dom.style.pointerEvents = enable ? 'initial' : 'none';
  }
  setHandleVisible(b: boolean){
    const bgColor = b ? 'white' : 'rgba(255,255,255, 0)';
    this.leftHandler.style.backgroundColor = bgColor;
    this.rightHandler.style.backgroundColor = bgColor;
  }
  // 设置帧范围
  setRange(framestart: number, frameend: number) {
    this.framestart = framestart;
    this.frameend = frameend;
    this.dom.dataset.framestart = String(framestart);
    this.dom.dataset.frameend = String(frameend);
    this.resize();
    this.updateSegmentHandlerPos();
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
      this.leftHandler.classList.add('actived');
      this.rightHandler.classList.add('actived');
    } else {
      this.actived = false;
      this.dom.classList.remove("actived");
      this.leftHandler.classList.remove('actived');
      this.rightHandler.classList.remove('actived');
      this.keyframes.forEach(keyframe => {
        keyframe.setActived(false);
      });
    }
  }
  setHover(bool: boolean) {
    if (bool) {
      this.leftHandler.classList.add('actived');
      this.rightHandler.classList.add('actived');
    } else {
      this.leftHandler.classList.remove('actived');
      this.rightHandler.classList.remove('actived');
    }
  }
  setSlideStatus(bool: boolean){
    if (bool) {
      this.dom.classList.add("sliding");
    } else {
      this.dom.classList.remove("sliding");
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
  updateSegmentHandlerPos(){
    if(this.leftHandler){
      this.leftHandler.style.left = `${this.framestart * this.frameWidth}px`;
    }
    if(this.rightHandler){
      this.rightHandler.style.left = `${((this.framestart + (this.frameend - this.framestart)) * this.frameWidth) - 4}px`;
    }
  }
  /**
   * 实时更新keyframe的关键帧位置，但不更新 frame
   * 用于手柄拖动时临时更新相对位置以保持关键帧位置不动
   */
  syncKeyframesLeftPosition(){
    const offset = this.framestart - this.prevFrameStart;
    if(this.keyframes){
      this.keyframes.forEach((keyframe) => {
        const newFrame = keyframe.frame - offset
        keyframe.dom.style.left = `${(newFrame) * this.frameWidth}px`;
      });
    }
  }
  /**
   * 更新 keyframe 帧数
   */
  updateSegmentKeyframesFrame(){
    const offset = this.framestart - this.prevFrameStart;
    if(this.keyframes){
      this.keyframes.forEach((keyframe) => {
        keyframe.frame = keyframe.frame - offset
      });
    }
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
    this.updateSegmentHandlerPos();
  }
  addKeyframe(frame: number){
    const exist = this.keyframes.find(keyframe => keyframe.frame === frame)
    if(exist){
      return;
    }
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
      const absFrame = this.framestart + keyframe.frame
      // 不在可视范围内
      return (absFrame) > this.frameend || (absFrame) < this.framestart;
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
  // 更新 自定义渲染器 renderer 用于渲染不同UI
  updatesegmentRenderer(renderer: string|HTMLElement){
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
    this.keyframes.forEach((keyframe)=> {
      keyframe.destroy();
    })
  }
}
