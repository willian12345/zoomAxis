/**
 * Track 基础 dom 结构
 * <div class="track">
 *  <div class="track-placeholder"></div>
 *  <div class="segment"></div>
 * </div>
 */
import { Segment } from './Segment';
interface TrackArgs {
  trackClass?: string
  trackPlaceholderClass?: string
  dom: HTMLElement
}
export class Track {
  dom = {} as HTMLElement
  trackId = ''
  trackClass = ''
  trackPlaceholderClass = ''
  isStretchTrack = false // 是否是伸缩轨道
  segments: Map<string, Segment> = new Map() // 轨道内的 segment 
  subTracks: Map<string, Track> = new Map() // 子轨道
  constructor({
    trackClass = 'track', 
    trackPlaceholderClass = 'track-placeholder' ,
    dom
  }: TrackArgs) {
    this.trackClass = trackClass
    this.trackPlaceholderClass = trackPlaceholderClass
    // todo: dom 抽取至此类中
    this.dom = dom;
    this.trackId = dom.dataset.trackId ?? ''
    this.isStretchTrack = dom.classList.contains("track-stretch");
  }
  addSegment(segment: Segment){
    this.segments.set(segment.segmentId, segment);
    this.dom.appendChild(segment.dom);
    segment.setTrack(this);
  }
  removeSegment(segment: Segment){
    this.segments.delete(segment.segmentId);
    this.dom.removeChild(segment.dom);
  }
  // 获取非 segmentId 之外的所有 segment
  getOtherSegments(segmentId: string){
    const segments = this.getSegments();
    return segments.filter( segment => segment.segmentId !== segmentId)
  }
  getSegments(){
    let result: Segment[] = Array.from(this.segments.values())
    if(this.subTracks){
      for(const [_, subtrack] of this.subTracks){
        result = [...result, ...subtrack.getSegments()];
      }
    }
    return result;
  }
}