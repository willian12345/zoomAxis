
import type { ISegmentContentRenderer, TSegmentConstructParams, ISegmentContentRendererClass} from '../TrackType';
import { SegmentRenderer } from './SegmentRenderer';
import { segmentRenderers } from '../SegmentRendererManager';
export class BodyAnimationRenderer extends SegmentRenderer {
  static SegmentType = 0
  constructor(params:  TSegmentConstructParams  ) {
    super(params);
    this.renderer()
  }
  renderer() {
    const div = document.createElement("div");
    div.innerHTML =`
    <div class="flex items-center text-12">
      <svg width="24" height="24" viewBox="0 0 24 24" class="ml-6" >
      <path fill-rule="evenodd" clip-rule="evenodd" d="M16.5 5.5C16.5 6.60457 15.6046 7.5 14.5 7.5C13.3955 7.5 12.5 6.60457 12.5 5.5C12.5 4.39543 13.3955 3.5 14.5 3.5C15.6046 3.5 16.5 4.39543 16.5 5.5ZM18 5.5C18 7.433 16.433 9 14.5 9C12.567 9 11 7.433 11 5.5C11 3.567 12.567 2 14.5 2C16.433 2 18 3.567 18 5.5ZM6.37035 11.5071C6.92467 10.5833 8.05609 10.1821 9.06861 10.5503L11.4882 11.4301L9.81863 15.1865C9.81574 15.1928 9.81295 15.1991 9.81025 15.2054L9.51476 15.8702C8.76224 17.5634 6.74867 18.2858 5.09143 17.4572L3.83545 16.8292C3.46497 16.6439 3.01446 16.7941 2.82922 17.1646C2.64398 17.5351 2.79415 17.9856 3.16463 18.1708L4.42061 18.7988C6.82888 20.0029 9.75201 18.966 10.8664 16.5217L12.4813 17.3292C13.5927 17.8849 14.0432 19.2364 13.4875 20.3479L12.8292 21.6646C12.6439 22.0351 12.7941 22.4856 13.1646 22.6708C13.5351 22.8561 13.9856 22.7059 14.1708 22.3354L14.8292 21.0187C15.7554 19.1663 15.0045 16.9137 13.1521 15.9875L11.4765 15.1497L12.9013 11.9439L15.5293 12.8996C17.1541 13.4904 18.9721 12.8939 19.9311 11.4555L20.624 10.416C20.8538 10.0714 20.7606 9.60572 20.416 9.37596C20.0713 9.1462 19.6057 9.23933 19.3759 9.58398L18.683 10.6234C18.1076 11.4865 17.0168 11.8444 16.0419 11.4899L12.762 10.2972L12.7492 10.2926L9.58122 9.14056C7.8937 8.52692 6.008 9.19565 5.08412 10.7354L4.85687 11.1141C4.64375 11.4693 4.75892 11.93 5.1141 12.1431C5.46928 12.3562 5.92998 12.2411 6.14309 11.8859L6.37035 11.5071Z"  />
      </svg>
    <div class="segment-name">${this.text ?? ''}</div>
    </div>
  `;
    this.content.appendChild(div);
    this.wrapper.style.background = 'rgba(198, 97, 54, 0.2)';
    return this
  }
}
segmentRenderers.add(BodyAnimationRenderer.SegmentType, BodyAnimationRenderer);