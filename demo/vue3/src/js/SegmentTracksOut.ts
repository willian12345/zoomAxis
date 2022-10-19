import { Tracks } from './Tracks'
import {
  SegmentTracksOutArgs,
} from './trackType';
// 轨道外 segment 拖拽
export class SegmentTracksOut extends Tracks {
  constructor({
    trackCursor,
    scrollContainer,
    segmentDelegete,
    timelineAxis,
    dropableCheck,
  }: SegmentTracksOutArgs) {
    if (!scrollContainer || !timelineAxis) {
      return;
    }
    super({trackCursor, scrollContainer, timelineAxis, dropableCheck});
    this.dropableCheck = dropableCheck;
    const mousedown = (e: MouseEvent) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      if (!target) {
        return;
      }
      if (!target.classList.contains("segment-item")) {
        return;
      }
      const segment = target;
      this.dragStart(e, trackCursor, scrollContainer, segment, true);
    };
    // 代理 segment 鼠标事件
    segmentDelegete.addEventListener("mousedown", mousedown);
  }
}