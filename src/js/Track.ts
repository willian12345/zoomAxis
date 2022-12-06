import { Segment } from "./Segment"

/**
 * Track 基础 dom 结构
 * <div class="track">
 *  <div class="track-placeholder"></div>
 *  <div class="segment"></div>
 * </div>
 */
interface TrackArgs {
  trackId: string
  trackClass?: string
  trackPlaceholderClass?: string
}
export class Track {
  dom = {} as HTMLElement
  trackId = ''
  trackClass = ''
  trackPlaceholderClass = ''
  childs:Map<string, Segment> = new Map()
  constructor({ 
    trackId,
    trackClass = 'track', 
    trackPlaceholderClass = 'track-placeholder' 
  }: TrackArgs) {
    this.trackId = trackId
    this.trackClass = trackClass
    this.trackPlaceholderClass = trackPlaceholderClass
    this.dom = this.createDom();
  }
  private createDom(): HTMLElement {
    const div = document.createElement('div');
    div.innerHTML = `
      div class="${this.trackClass}" data-track-id="${this.trackId}">
        <div class="${this.trackPlaceholderClass}"></div>
      </div>
      `;
    return div.firstElementChild as HTMLElement;
  }
  addChild(segment: Segment){
    segment.setTrackId(this.trackId);
    this.childs.set(segment.segmentId, segment);
    // const exist = this.childs.find((child: Segment)=> child.segmentId === segment.segmentId);
    // if(!exist){
    //   this.childs.push(segment);
    // }
  }
  removeChild(segment: Segment){
    this.childs.delete(segment.segmentId);
    // const exist = this.childs.find((child: Segment)=> child.segmentId === segment.segmentId);
    // if(!exist){
    //   this.childs.push(segment);
    // }
  }
}