/**
 * Segment 基础 dom 结构
 * <div class="segment segment-action actived" data-segment-id="2" data-track-id="" data-framestart="14" data-frameend="44">
 *  <div class="segment-handle segment-handle-left"></div>
 *  <div class="segment-handle segment-handle-right"></div>
 * </div>
 */


export class Segment {
  framestart = 0
  frameend = 0
  frames = 0
  dom = {} as HTMLElement
  constructor(dom: HTMLElement){
    this.dom = dom;
  }
}