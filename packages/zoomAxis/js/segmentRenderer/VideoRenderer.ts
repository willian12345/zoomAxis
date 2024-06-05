
import type { ISegmentContentRenderer, SegmentConstructParams, ISegmentContentRendererClass} from '../TrackType';
import { SegmentRenderer } from './SegmentRenderer';
import { segmentRenderers } from '../SegmentRendererManager';
export class VideoRenderer extends SegmentRenderer {
  static SegmentType = 11
  constructor(params:  SegmentConstructParams  ) {
    super(params);
    this.renderer()
  }
  renderer() {
    const div = document.createElement("div");
    div.innerHTML =`
    <div class="flex items-center text-12">
      <svg width="24" height="24" viewBox="0 0 24 24" class="ml-6">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M2.25 3.25C1.83579 3.25 1.5 3.58579 1.5 4V6C1.5 6.41421 1.83579 6.75 2.25 6.75C2.66421 6.75 3 6.41421 3 6V4.75H8V19.25H5C4.58579 19.25 4.25 19.5858 4.25 20C4.25 20.4142 4.58579 20.75 5 20.75H8.75H12C12.4142 20.75 12.75 20.4142 12.75 20C12.75 19.5858 12.4142 19.25 12 19.25H9.5V4.75H14.5V6C14.5 6.41421 14.8358 6.75 15.25 6.75C15.6642 6.75 16 6.41421 16 6V4C16 3.58579 15.6642 3.25 15.25 3.25H8.75H2.25ZM17.75 3.25C17.3358 3.25 17 3.58579 17 4C17 4.41421 17.3358 4.75 17.75 4.75H19V19.25H17.75C17.3358 19.25 17 19.5858 17 20C17 20.4142 17.3358 20.75 17.75 20.75H19.75H21.75C22.1642 20.75 22.5 20.4142 22.5 20C22.5 19.5858 22.1642 19.25 21.75 19.25H20.5V4.75H21.75C22.1642 4.75 22.5 4.41421 22.5 4C22.5 3.58579 22.1642 3.25 21.75 3.25H19.75H17.75Z" />
      </svg>
      <div class="segment-name">${this.text ?? ''}</div>
    </div>
  `;
    this.content.appendChild(div);
    this.wrapper.style.background = '#bf3d4f';
    return this
  }
}
segmentRenderers.add(VideoRenderer.SegmentType, VideoRenderer);