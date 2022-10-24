import { Tracks } from './Tracks'
import { SegmentTracksArgs } from './TrackType'
// 轨道内 segment 拖拽
export class SegmentTracks extends Tracks {
  scrollContainer: HTMLElement | null = null;
  constructor({
    trackCursor,
    scrollContainer,
    timeline,
    deleteableCheck,
  }: SegmentTracksArgs) {
    if (!scrollContainer) {
      return;
    }
    super({trackCursor, scrollContainer, timeline, deleteableCheck});
    const mousedown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if(timeline.playing){
        return;
      }
      const target = e.target as HTMLElement;
      if (!target) {
        return;
      }
      if (!target.classList.contains("segment")) {
        return;
      }
      const segment = target;
      this.removeSegmentActivedStatus();
      segment.classList.add("actived");
      this.dragStart(e, trackCursor, scrollContainer, segment);
    };
    this.scrollContainer = scrollContainer;
    // 代理 segment 鼠标事件
    scrollContainer.addEventListener("mousedown", mousedown);
    

  }
  scaleX(ratio: number) {
    if (!this.scrollContainer || !this.timeline) {
      return;
    }
    const segments: HTMLElement[] = Array.from(
      this.scrollContainer.querySelectorAll(".segment")
    );
    const frameWidth = this.timeline?.frameWidth;
    segments.forEach((dom: HTMLElement) => {
      if (
        !dom.dataset.framestart ||
        !dom.dataset.frameend ||
        !this.timeline
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