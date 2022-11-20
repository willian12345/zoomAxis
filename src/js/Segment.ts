/**
 * Segment 基础 dom 结构
 * <div class="segment segment-action actived" data-segment-id="2" data-track-id="" data-framestart="14" data-frameend="44">
 *  <div class="segment-handle segment-handle-left"></div>
 *  <div class="segment-handle segment-handle-right"></div>
 * </div>
 */
let segmentIdIndex = 0

export class Segment {
  framestart = 0
  frameend = 0
  frames = 0
  width = '80px'
  height = '24px'
  left = '0'
  segmentId = ''
  segmentClass = 'segment segment-action'
  dom = {} as HTMLElement
  trackId = ''
  constructor({trackId = ''}){
    this.trackId = trackId
    this.dom = this.createDom();
  }
  private createSegmentId() {
    return segmentIdIndex++;
  }
  private createDom () {
    const div = document.createElement('div');
    div.innerHTML = `
        <div 
          class="${this.segmentClass}" 
          data-segment-id="${this.createSegmentId()}" 
          data-track-id="${this.trackId}" 
          data-framestart="${this.framestart}" 
          data-frameend="${this.frameend}"
          style="width: ${this.width}; height: ${this.height}; left: ${this.left};">
          <div class="segment-handle segment-handle-left"></div>
          <div class="segment-handle segment-handle-right"></div>
        </div>
      `;
    return div.firstElementChild as HTMLElement;
  }
}