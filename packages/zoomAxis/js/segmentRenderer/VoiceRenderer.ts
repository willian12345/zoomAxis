
import type { ISegmentContentRenderer, SegmentConstructParams, ISegmentContentRendererClass} from '../TrackType';
import { SegmentRenderer } from './SegmentRenderer';
import { segmentRenderers } from '../SegmentRendererManager';
export class VoiceRenderer extends SegmentRenderer {
  static SegmentType = 2
  constructor(params:  SegmentConstructParams  ) {
    super(params);
    this.renderer()
  }
  renderer() {
    const div = document.createElement("div");
    div.innerHTML =`
    <div class="flex items-center text-12 w-full">
      <svg width="24" height="24" viewBox="0 0 24 24" class="ml-6">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M21.5 12C21.5 17.2467 17.2467 21.5 12 21.5C6.75329 21.5 2.5 17.2467 2.5 12C2.5 6.75329 6.75329 2.5 12 2.5C17.2467 2.5 21.5 6.75329 21.5 12ZM23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12ZM8.81802 15.182C8.52513 14.8891 8.05025 14.8891 7.75736 15.182C7.46447 15.4749 7.46447 15.9497 7.75736 16.2426C8.88258 17.3679 10.4087 18 12 18C13.5913 18 15.1174 17.3679 16.2426 16.2426C16.5355 15.9497 16.5355 15.4749 16.2426 15.182C15.9497 14.8891 15.4749 14.8891 15.182 15.182C14.3381 16.0259 13.1935 16.5 12 16.5C10.8065 16.5 9.66193 16.0259 8.81802 15.182ZM10 9.5C10 10.3284 9.32843 11 8.5 11C7.67157 11 7 10.3284 7 9.5C7 8.67157 7.67157 8 8.5 8C9.32843 8 10 8.67157 10 9.5ZM15.5 11C16.3284 11 17 10.3284 17 9.5C17 8.67157 16.3284 8 15.5 8C14.6716 8 14 8.67157 14 9.5C14 10.3284 14.6716 11 15.5 11Z"/>
      </svg>
      <div class="segment-name flex-1">${this.text ?? ''}</div>
      <svg width="68" height="18" viewBox="0 0 68 18" style="width: 68px;" class="text-18 mr-6">
        <g opacity="0.4">
        <path opacity="0.2" d="M1 8.5V9.5" stroke="white" stroke-linecap="round"/>
        <path opacity="0.4" d="M4 8V10" stroke="white" stroke-linecap="round"/>
        <path opacity="0.6" d="M7 7V11" stroke="white" stroke-linecap="round"/>
        <path opacity="0.8" d="M10 5V13" stroke="white" stroke-linecap="round"/>
        <path d="M13 7V11" stroke="white" stroke-linecap="round"/>
        <path opacity="0.8" d="M16 8V10" stroke="white" stroke-linecap="round"/>
        <path opacity="0.6" d="M19 8.5V9.5" stroke="white" stroke-linecap="round"/>
        <path opacity="0.4" d="M22 8V10" stroke="white" stroke-linecap="round"/>
        <path opacity="0.2" d="M25 8.5V9.5" stroke="white" stroke-linecap="round"/>
        <path opacity="0.4" d="M28 8V10" stroke="white" stroke-linecap="round"/>
        <path opacity="0.6" d="M31 7V11" stroke="white" stroke-linecap="round"/>
        <path opacity="0.8" d="M34 5V13" stroke="white" stroke-linecap="round"/>
        <path d="M37 7V11" stroke="white" stroke-linecap="round"/>
        <path opacity="0.8" d="M40 8V10" stroke="white" stroke-linecap="round"/>
        <path opacity="0.6" d="M43 8.5V9.5" stroke="white" stroke-linecap="round"/>
        <path opacity="0.4" d="M46 8V10" stroke="white" stroke-linecap="round"/>
        <path opacity="0.2" d="M49 8.5V9.5" stroke="white" stroke-linecap="round"/>
        <path opacity="0.4" d="M52 8V10" stroke="white" stroke-linecap="round"/>
        <path opacity="0.6" d="M55 7V11" stroke="white" stroke-linecap="round"/>
        <path opacity="0.8" d="M58 5V13" stroke="white" stroke-linecap="round"/>
        <path d="M61 7V11" stroke="white" stroke-linecap="round"/>
        <path opacity="0.8" d="M64 8V10" stroke="white" stroke-linecap="round"/>
        <path opacity="0.4" d="M67 8.5V9.5" stroke="white" stroke-linecap="round"/>
        </g>
      </svg>
    </div>
  `;
    this.content.appendChild(div);
    this.wrapper.style.background = 'rgba(198, 97, 54, 0.2)';
    return this
  }
}
segmentRenderers.add(VoiceRenderer.SegmentType, VoiceRenderer);