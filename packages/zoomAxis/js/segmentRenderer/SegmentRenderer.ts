import {
  CLASS_NAME_SEGMENT,
} from '../trackUtils'
import {
  SegmentConstructParams,
} from "../TrackType";
export abstract class SegmentRenderer {
  segmentId: string
  trackId: string
  segmentType: number
  framestart: number
  frameend: number
  width: string | number = '80px';
  height: string | number = '24px';
  left: string | number = '0';
  segmentStyle: string
  text: string
  content: HTMLElement
  wrapper: HTMLElement
  constructor(params:  SegmentConstructParams  ){
    for(let k in params){
      this[k] = params[k];
    }
    this.setup();
  }
  getDefaultContent(){
    const div = document.createElement('div');
    div.className = 'segment-name';
    div.innerText = this.text
    return div;
  }
  getContentNode(){
    const div = document.createElement('div');
    div.className = 'segment-renderer';
    return div;
  }
  setup(){
    const node = document.createElement("div");
    node.innerHTML = `
        <div 
          class="${CLASS_NAME_SEGMENT}" 
          data-segment-id="${this.segmentId}" 
          data-segment-type="${this.segmentType}" 
          data-track-id="${this.trackId}" 
          data-framestart="${this.framestart}" 
          data-frameend="${this.frameend}"
          style="width: ${this.width}; height: ${this.height}; left: ${this.left}; ${this.segmentStyle}">
          
        </div>
      `;
    this.content = this.getContentNode();
    node.firstElementChild?.append(this.content);
    this.wrapper = node.firstElementChild as HTMLElement;;
  }
  abstract renderer(): this;
}