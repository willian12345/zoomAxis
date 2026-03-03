
import type { ISegmentContentRenderer, TSegmentConstructParams, ISegmentContentRendererClass} from '../TrackType';
import { SegmentRenderer } from './SegmentRenderer';
import { segmentRenderers } from '../SegmentRendererManager';
export class CameraRenderer extends SegmentRenderer {
  static SegmentType = 4
  constructor(params:  TSegmentConstructParams  ) {
    super(params);
    this.renderer()
  }
  renderer() {
    const div = document.createElement("div");
    div.innerHTML =`
    <div class="flex items-center text-12">
      <svg width="24" height="24" viewBox="0 0 24 24" class="ml-6">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M4 4.5H14C14.8284 4.5 15.5 5.17157 15.5 6V8V12V14C15.5 14.8284 14.8284 15.5 14 15.5H4C3.17157 15.5 2.5 14.8284 2.5 14V6C2.5 5.17157 3.17157 4.5 4 4.5ZM17 13.2V14C17 15.6569 15.6569 17 14 17H12.5078L14.1964 21.2215C14.3502 21.606 14.1631 22.0425 13.7785 22.1964C13.394 22.3502 12.9575 22.1631 12.8036 21.7785L10.8922 17H7.10778L5.19636 21.7785C5.04252 22.1631 4.60604 22.3502 4.22146 22.1964C3.83687 22.0425 3.64981 21.606 3.80364 21.2215L5.49222 17H4C2.34315 17 1 15.6569 1 14V6C1 4.34315 2.34315 3 4 3H14C15.6569 3 17 4.34315 17 6V6.8L19.7506 4.59951C21.0601 3.55189 23 4.48424 23 6.16125V13.8388C23 15.5158 21.0601 16.4481 19.7506 15.4005L17 13.2ZM17 11.2791L20.6877 14.2292C21.015 14.4911 21.5 14.258 21.5 13.8388V6.16125C21.5 5.742 21.015 5.50891 20.6877 5.77082L17 8.72094V11.2791Z"/>
      </svg>
      <div class="segment-name">${this.text ?? ''}</div>
    </div>
  `;
    this.content.appendChild(div);
    this.wrapper.style.background = '#4767E8';
    return this
  }
}
segmentRenderers.add(CameraRenderer.SegmentType, CameraRenderer);