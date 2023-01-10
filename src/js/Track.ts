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
  }
  addSegment(segment: Segment){
    this.segments.set(segment.segmentId, segment);
    this.dom.appendChild(segment.dom);
    segment.setTrack(this);
  }
  removeSegment(segment: Segment){
    this.segments.delete(segment.segmentId)
    this.segments.set(segment.segmentId, segment);
    this.dom.removeChild(segment.dom);
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