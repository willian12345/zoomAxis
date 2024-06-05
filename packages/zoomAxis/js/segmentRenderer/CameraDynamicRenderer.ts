
import type { ISegmentContentRenderer, SegmentConstructParams, ISegmentContentRendererClass} from '../TrackType';
import { SegmentRenderer } from './SegmentRenderer';
import { segmentRenderers } from '../SegmentRendererManager';
export class CameraDynamicRenderer extends SegmentRenderer {
  static SegmentType = 8
  constructor(params:  SegmentConstructParams  ) {
    super(params);
    this.renderer()
  }
  renderer() {
    const div = document.createElement("div");
    div.innerHTML =`
    <div class="flex items-center text-12">
    <svg width="24" height="24" viewBox="0 0 24 24" class="ml-6">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M6 3.5H18C19.3807 3.5 20.5 4.61929 20.5 6V18C20.5 19.1715 19.6941 20.1549 18.6065 20.4259L18.2127 18.8507C17.682 16.7278 16.126 15.0767 14.1526 14.372C15.2635 13.6613 16 12.4167 16 11C16 8.79086 14.2091 7 12 7C9.79083 7 7.99997 8.79086 7.99997 11C7.99997 12.4167 8.73644 13.6613 9.84741 14.372C7.87401 15.0767 6.31808 16.7278 5.78736 18.8507L5.39355 20.4259C4.30588 20.1549 3.5 19.1716 3.5 18V6C3.5 4.61929 4.61929 3.5 6 3.5ZM6.9212 20.5H17.0789L16.7575 19.2145C16.2117 17.0315 14.2503 15.5 12 15.5C9.7498 15.5 7.78833 17.0315 7.24257 19.2145L6.9212 20.5ZM5.02968 21.8815C3.28941 21.4479 2 19.8745 2 18V6C2 3.79086 3.79086 2 6 2H18C20.2091 2 22 3.79086 22 6V18C22 19.8745 20.7106 21.4478 18.9704 21.8815C18.9481 21.887 18.9258 21.8924 18.9033 21.8976C18.6131 21.9646 18.3107 22 18 22M14.5 11C14.5 12.3807 13.3807 13.5 12 13.5C10.6193 13.5 9.49997 12.3807 9.49997 11C9.49997 9.61929 10.6193 8.5 12 8.5C13.3807 8.5 14.5 9.61929 14.5 11Z" />
    </svg>
    <div class="segment-name">${this.text ?? ''}</div>
    </div>
  `;
    this.content.appendChild(div);
    this.wrapper.style.background = '#4767E8';
    return this
  }
}
segmentRenderers.add(CameraDynamicRenderer.SegmentType, CameraDynamicRenderer);