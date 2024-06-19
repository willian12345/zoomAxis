
import type { TSegmentConstructParams } from '../TrackType';
import { SegmentRenderer } from './SegmentRenderer';
import { segmentRenderers } from '../SegmentRendererManager';
export class VoiceRenderer extends SegmentRenderer {
  static SegmentType = 2
  constructor(params:  TSegmentConstructParams  ) {
    super(params);
    this.renderer()
  }
  renderer() {
    const div = document.createElement("div");
    div.innerHTML =`
    <div class="flex items-center text-12 w-full relative">
      <div class="segment-name flex-1">${this.text ?? ''}</div>
      <div class="absolute left-0 top-0 bg-orange-900 w-full h-full">
        
      </div>
    </div>
  `;
    this.content.appendChild(div);
    this.wrapper.style.background = 'rgba(198, 97, 54, 0.2)';
    return this
  }
  // 长短拖动结束事件
  onslidedown(){

  }
  // 渲染背景音频数据
  renderBackground(){

  }
}
segmentRenderers.add(VoiceRenderer.SegmentType, VoiceRenderer);