
import type { ISegmentContentRenderer, TSegmentConstructParams, ISegmentContentRendererClass} from '../TrackType';
import { SegmentRenderer } from './SegmentRenderer';
import { segmentRenderers } from '../SegmentRendererManager';
export class DecorationRenderer extends SegmentRenderer {
  static SegmentType = 10
  constructor(params:  TSegmentConstructParams  ) {
    super(params);
    this.renderer()
  }
  renderer() {
    const div = document.createElement("div");
    div.innerHTML =`
    <div class="flex items-center text-12">
      <svg width="24" height="24" viewBox="0 0 24 24" class="ml-6">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M6 3.5H18C19.3807 3.5 20.5 4.61929 20.5 6V18C20.5 19.3807 19.3807 20.5 18 20.5H6C4.61929 20.5 3.5 19.3807 3.5 18V6C3.5 4.61929 4.61929 3.5 6 3.5ZM2 6C2 3.79086 3.79086 2 6 2H18C20.2091 2 22 3.79086 22 6V18C22 20.2091 20.2091 22 18 22H6C3.79086 22 2 20.2091 2 18V6ZM17.5303 7.53033C17.8232 7.23744 17.8232 6.76256 17.5303 6.46967C17.2374 6.17678 16.7626 6.17678 16.4697 6.46967L6.46967 16.4697C6.17678 16.7626 6.17678 17.2374 6.46967 17.5303C6.76256 17.8232 7.23744 17.8232 7.53033 17.5303L17.5303 7.53033ZM11.5303 6.46967C11.8232 6.76256 11.8232 7.23744 11.5303 7.53033L7.53033 11.5303C7.23744 11.8232 6.76256 11.8232 6.46967 11.5303C6.17678 11.2374 6.17678 10.7626 6.46967 10.4697L10.4697 6.46967C10.7626 6.17678 11.2374 6.17678 11.5303 6.46967ZM17.5303 13.5303C17.8232 13.2374 17.8232 12.7626 17.5303 12.4697C17.2374 12.1768 16.7626 12.1768 16.4697 12.4697L12.4697 16.4697C12.1768 16.7626 12.1768 17.2374 12.4697 17.5303C12.7626 17.8232 13.2374 17.8232 13.5303 17.5303L17.5303 13.5303Z"/>
      </svg>
      <div class="segment-name">${this.text ?? ''}</div>
    </div>
  `;
    this.content.appendChild(div);
    this.wrapper.style.background = 'rgba(108, 74, 205, 0.20)';
    return this
  }
}
segmentRenderers.add(DecorationRenderer.SegmentType, DecorationRenderer);