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
  segments: Map<string, Segment> = new Map()
  constructor({ 
    trackClass = 'track', 
    trackPlaceholderClass = 'track-placeholder' ,
    dom
  }: TrackArgs) {
    this.trackClass = trackClass
    this.trackPlaceholderClass = trackPlaceholderClass
    // dom  暂时写在 html 文件内
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
}