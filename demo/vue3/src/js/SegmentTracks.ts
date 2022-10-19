import { Tracks } from './Tracks'
import { SegmentTracksArgs } from './TrackType'
// 轨道内 segment 拖拽
export class SegmentTracks extends Tracks {
  scrollContainer: HTMLElement | null = null;
  constructor({
    trackCursor,
    scrollContainer,
    timelineAxis,
  }: SegmentTracksArgs) {
    if (!scrollContainer) {
      return;
    }
    super({trackCursor, scrollContainer, timelineAxis});
    const mousedown = (e: MouseEvent) => {
      e.preventDefault();
      // e.stopPropagation();
      const target = e.target as HTMLElement;
      if (!target) {
        return;
      }
      if (!target.classList.contains("segment")) {
        return;
      }
      const segment = target;
      segment.classList.add("actived");
      this.dragStart(e, trackCursor, scrollContainer, segment);
    };
    this.scrollContainer = scrollContainer;
    // 代理 segment 鼠标事件
    scrollContainer.addEventListener("mousedown", mousedown);
  }
  scaleX(ratio: number) {
    if (!this.scrollContainer || !this.timelineAxis) {
      return;
    }
    const segments: HTMLElement[] = Array.from(
      this.scrollContainer.querySelectorAll(".segment")
    );
    const frameWidth = this.timelineAxis?.frameWidth;
    segments.forEach((dom: HTMLElement) => {
      if (
        !dom.dataset.framestart ||
        !dom.dataset.frameend ||
        !this.timelineAxis
      ) {
        return;
      }
      const framestart = parseFloat(dom.dataset.framestart);
      const frameend = parseFloat(dom.dataset.frameend);
      const left = framestart * frameWidth;
      dom.style.left = `${left}px`;
      dom.style.width = `${frameWidth * (frameend - framestart)}px`;
    });
  }
}