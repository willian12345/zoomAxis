/**
 * Track 基础 dom 结构
 * <div class="track">
 *  <div class="track-placeholder"></div>
 *  <div class="segment"></div>
 * </div>
 */
import { Segment } from './Segment';
import { sortByLeftValue } from './trackUtils';
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
  getLastSegment(){
    // 根据 frameend 值排序后获取最后一个 Segment
    const segments = this.getSegments().sort((a, b)=> {
      // b 排在 a 后
      if(a.frameend < b.frameend){
        return -1
      }
      // b 排在 a 前
      if(a.frameend > b.frameend){
        return 1;
      }
      return  0;
    });
    return segments[segments.length - 1];
  }
  updateSegmentHandler(){
    if(!this.isStretchTrack) return;
    const segments = this.getSegments().sort(sortByLeftValue);
    // 如果只有一个 segment 则不允许左右手柄拖动
    if (segments.length === 1) {
      return segments[0].setHandleEnable(false, false);
    }
    const l = segments.length - 1
    segments.forEach( (segment, index) => {
      if(index === 0){
        // 最左侧不允许拖动
        return segment.setHandleEnable(false, true);
      }
      if(l === index){
        // 最右侧手柄不允许拖动
        return segment.setHandleEnable(true, false);
      }
      segment.setHandleEnable(true, true)
    });
  }
}