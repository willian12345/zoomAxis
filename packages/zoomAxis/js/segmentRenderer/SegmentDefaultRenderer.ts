
import type { TSegmentConstructParams } from '../TrackType';
import { SegmentRenderer } from './SegmentRenderer';
import { segmentRenderers } from '../SegmentRendererManager';
export class SegmentDefaultRenderer extends SegmentRenderer {
  static SegmentType = -1
  type = SegmentDefaultRenderer.SegmentType;
  constructor(params:  TSegmentConstructParams  ) {
    super(params);
    this.renderer()
  }
  renderer() {
    const div = document.createElement("div");
    div.innerHTML =`
    <div class="flex items-center text-12">
    <div class="segment-name">${this.text ?? ''}</div>
    </div>
  `;
    this.content.appendChild(div);
    return this
  }
}
segmentRenderers.add(SegmentDefaultRenderer.SegmentType, SegmentDefaultRenderer);