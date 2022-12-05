import { SegmentType,SegmentBasicInfo } from "./trackType"

/**
 * Segment 基础 dom 结构
 * <div class="segment segment-action actived" data-segment-id="2" data-track-id="" data-framestart="14" data-frameend="44">
 *  <div class="segment-handle segment-handle-left"></div>
 *  <div class="segment-handle segment-handle-right"></div>
 * </div>
 */
 let segmentIdIndex = 0
 export type SegmentClassInfo = {
  startFrame: number
  endFrame: number
  trackId?: string
  segmentId?: string
 }
 export class Segment {
  _framestart = 0
  _frameend = 0
  frames = 0
  width = '80px'
  height = '24px'
  left = '0'
  segmentId = ''
  segmentClass = 'segment segment-action'
  dom = {} as HTMLElement
  trackId = ''
  type = 0
  constructor({type, trackId = '', segmentInfo}:{type: SegmentType, trackId?: string, segmentInfo?: SegmentClassInfo}){
    this.trackId = trackId
    this.type = type
    if(segmentInfo){
      this.setSegmentInfo(segmentInfo)
    }
    this.dom = this.renderer();
  }
  get framestart(){
    return this._framestart
  }
  set framestart(frame){
    this._framestart = frame;
    this.dom.dataset.framestart = `${frame}`;
  }
  get frameend(){
    return this._frameend
  }
  set frameend(frame){
    this._frameend = frame;
    this.dom.dataset.frameend = `${frame}`;
  }
  setSegmentInfo(segmentInfo: SegmentClassInfo){
    this._framestart = segmentInfo.startFrame
    this._frameend = segmentInfo.endFrame
    if(!segmentInfo.segmentId){
      this.segmentId = this.createSegmentId()
    }
    this.trackId = segmentInfo.trackId ?? ''
  }
  setTrackId(trackId: string){
    this.trackId = trackId
    this.dom.dataset.trackId = trackId
  }
  private createSegmentId() {
    return `${segmentIdIndex++}`;
  }
  private createDom () {
  const div = document.createElement('div');
  div.innerHTML = `
    <div 
      class="${this.segmentClass}" 
      data-segment-id="${this.segmentId}" 
      data-track-id="${this.trackId}" 
      data-framestart="${this._framestart}" 
      data-frameend="${this._frameend}"
      style="width: ${this.width}; height: ${this.height}; left: ${this.left};">
      <div class="segment-handle segment-handle-left"></div>
      <div class="segment-handle segment-handle-right"></div>
    </div>
  `;
  return div.firstElementChild as HTMLElement;
  }
  protected renderer(){
    return this.createDom();
  }
 }