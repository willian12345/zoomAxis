/**
 * Segment 基础 dom 结构
 * <div class="segment segment-action actived" data-segment-id="2" data-track-id="" data-framestart="14" data-frameend="44">
 *  <div class="segment-handle segment-handle-left"></div>
 *  <div class="segment-handle segment-handle-right"></div>
 * </div>
 */
import { SegmentConstructInfo, SegmentType } from './TrackType'
import { Track } from './Track';
let segmentIdIndex = 0
export class Segment {
  framestart = 0
  frameend = 0
  frames = 0
  width:string|number = '80px'
  height:string|number = '24px'
  left:string|number = '0'
  segmentId = ''
  segmentClass = 'segment segment-action'
  dom = {} as HTMLElement
  trackId = ''
  segmentType = SegmentType.BODY_ANIMATION
  name = ''
  parentTrack:Track|null = null
  constructor(args: SegmentConstructInfo){
    this.trackId = args.trackId;
    this.segmentId = args.segmentId ?? this.createSegmentId();
    this.framestart = args.framestart
    this.frameend = args.frameend
    if(args.width !== undefined){
      this.width = args.width
    }
    if(args.height !== undefined){
      this.height = args.height
    }
    if(args.left !== undefined){
      this.left = args.left
    }
    this.framestart = args.framestart
    this.framestart = args.framestart
    this.segmentType = args.segmentType
    this.name = args.name ?? '';
    this.dom = this.createDom();
  }
  private createSegmentId() {
    return String(segmentIdIndex++);
  }
  private createDom () {
    const div = document.createElement('div');
    div.innerHTML = `
        <div 
          class="${this.segmentClass}" 
          data-segment-id="${this.segmentId}" 
          data-segment-type="${this.segmentType}" 
          data-track-id="${this.trackId}" 
          data-framestart="${this.framestart}" 
          data-frameend="${this.frameend}"
          style="width: ${this.width}; height: ${this.height}; left: ${this.left};">
          <div class="segment-handle segment-handle-left"></div>
          <div class="segment-handle segment-handle-right"></div>
          <div class="segment-name">${this.name}</div>
        </div>
      `;
    return div.firstElementChild as HTMLElement;
  }
  setTrackId(trackId: string){
    this.trackId = trackId
    this.dom.dataset.trackId = trackId
  }
  setTrack(track: Track){
    this.parentTrack = track
    this.setTrackId(track.trackId)
  }
}