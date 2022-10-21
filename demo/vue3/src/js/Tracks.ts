import {
  TRACKS_EVENT_CALLBACK_TYPES,
  TracksEventCallback,
  DeleteableCheck,
  SegmentType,
  DropableCheck,
  TracksArgs,
} from './TrackType';

import { CursorPointer } from "./cursorPointer";
import { TimelineAxis } from "./TimelineAxis";

import {
  createSegmentName,
  createSegment,
  createSegmentFake,
  getDragTrackCotainer,
  collisionCheckX,
  trackCollisionCheckY,
  isCloseEnouphToY,
  getSegmentPlaceholder,
  findParentElementByClassName,
} from './trackUtils';

// 轨道
export class Tracks {
  private dragEndCallback: Set<TracksEventCallback> | null = null;
  protected scrollContainer: HTMLElement | null = null;
  protected dragoverClass = 'dragover';
  protected dragoverErrorClass = 'dragover-error';
  timeline: TimelineAxis | null = null;
  dropableCheck?: DropableCheck;
  deleteableCheck?: DeleteableCheck;
  constructor({trackCursor, scrollContainer, timeline, dropableCheck, deleteableCheck}: TracksArgs) {
    if (!timeline || !scrollContainer) {
      return;
    }
    this.timeline = timeline;
    if (dropableCheck) {
      this.dropableCheck = dropableCheck;
    }
    if (deleteableCheck) {
      this.deleteableCheck = deleteableCheck;
    }
    this.scrollContainer = scrollContainer;
    this.initEvent();
  }
  initEvent(){
    // 点击轨道外部时清除选中过的 segment 状态
    document.body.addEventListener(
      "click",
      this.removeSegmentActivedStatus.bind(this)
    );
    // Delete 键删除当前选中的 segment 
    document.body.addEventListener('keydown', this.removeActivedSegment.bind(this));
  }
  addEventListener(
    eventType: TRACKS_EVENT_CALLBACK_TYPES,
    callback: TracksEventCallback
  ) {
    if (eventType === TRACKS_EVENT_CALLBACK_TYPES.DRAG_END) {
      if (!this.dragEndCallback) {
        this.dragEndCallback = new Set();
      }
      this.dragEndCallback.add(callback);
      return;
    }
  }
  removeActivedSegment(event: KeyboardEvent){
    if(event.key !== 'Delete'){
      return
    }
    this.deleteCurrentActiveSegment(); 
  }
  removeSegmentActivedStatus() {
    this.scrollContainer?.querySelectorAll(".segment").forEach((segment) => {
      segment.classList.remove("actived");
    });
  }
  async deleteCurrentActiveSegment(){
    const activedSegment: HTMLElement = this.scrollContainer?.querySelector(".segment.actived") as HTMLElement;
    if(!activedSegment){
      return
    }
    if(this.deleteableCheck){
      const trackDom = findParentElementByClassName(activedSegment, 'track');
      const trackId = trackDom?.dataset.trackId;
      const segmentId = activedSegment.dataset.segmentId;
      if(trackId && segmentId){
        const result = await this.deleteableCheck(trackId, segmentId)
        if(!result){
          console.warn('删除失败');
          return;
        }
      }
    }
    activedSegment.parentElement?.removeChild(activedSegment)
  }
  destroy() {
    document.body.removeEventListener(
      "mousedown",
      this.removeSegmentActivedStatus
    );
    document.body.removeEventListener(
      "keydown",
      this.removeActivedSegment
    );
  }
  dragStart(
    e: MouseEvent,
    trackCursor: InstanceType<typeof CursorPointer>,
    scrollContainer: HTMLElement,
    segment: HTMLElement,
    isCopySegment: boolean = false
  ) {
    // segment 拖拽
    if (!scrollContainer) {
      return;
    }
    // 获取所有轨道
    const tracks: HTMLElement[] = Array.from(
      document.querySelectorAll(".track")
    );
    // 全局拖动容器
    const dragTrackContainer = getDragTrackCotainer() as HTMLElement;
    // 拖动前原轨道
    let originTrack: HTMLElement | null = isCopySegment
      ? null
      : segment.parentElement;
    let startX = e.clientX;
    let startY = e.clientY;
    const { left, top } = segment.getBoundingClientRect();
    dragTrackContainer.style.left = `${left}px`;
    dragTrackContainer.style.top = `${top}px`;
    let segmentCopy: HTMLElement;
    const segmentRect = segment.getBoundingClientRect();
    // 如果拖动是复制
    if (isCopySegment) {
      segmentCopy = createSegmentFake(segmentRect);
      dragTrackContainer.appendChild(segmentCopy);
    } else {
      // 将 segment 暂时放到 dragTracContainer 内
      dragTrackContainer.appendChild(segment);
    }
    // 高度变为正在拖动的 segment 高度
    dragTrackContainer.style.height = `${segmentRect.height}px`;
    setTimeout(() => {
      dragTrackContainer.style.transition = "height .2s ease .1s";
    }, 0);

    const scrollContainerRect = scrollContainer.getBoundingClientRect();

    const mousemove = (e: MouseEvent) => {
      // 拖动时拖动的是 dragTrackContainer
      const movedX = e.clientX - startX;
      const movedY = e.clientY - startY;
      const dragTrackContainerRect = dragTrackContainer.getBoundingClientRect();
      let left = dragTrackContainerRect.left + movedX;
      let top = dragTrackContainerRect.top + movedY;
      dragTrackContainer.style.left = `${left}px`;
      dragTrackContainer.style.top = `${top}px`;
      const scrollContainerScrollLeft = scrollContainer.scrollLeft;
      const scrollContainerX =
        scrollContainerScrollLeft - scrollContainerRect.left;
      const isCollisionY = trackCollisionCheckY(
        segment,
        dragTrackContainerRect,
        tracks,
        scrollContainerX,
        e.clientY,
        this.dragoverClass,
        this.dragoverErrorClass,
      );
      if (isCopySegment) {
        // 如果是复制，则需要形变成标准轨道内 segment 形状
        if (isCollisionY) {
          dragTrackContainer.style.left = `${e.clientX}px`;
          dragTrackContainer.style.top = `${e.clientY - 14}px`;
          dragTrackContainer.style.height = "24px";
        } else {
          dragTrackContainer.style.height = `${segmentRect.height}px`;
        }
      }
      trackCursor.enable = false;
      startX = e.clientX;
      startY = e.clientY;
    };

    const mouseup = (e: MouseEvent) => {
      e.stopPropagation();
      if (!this.timeline) {
        return;
      }
      startX = e.clientX;
      startY = e.clientY;
      const scrollContainerScrollLeft = scrollContainer.scrollLeft;
      const { left, top } = dragTrackContainer.getBoundingClientRect();
      dragTrackContainer.style.transition = "none";
      // segmentLeft = 拖动示意 left - 轨道总体 left 偏移 + 轨道容器 left 滚动偏移
      const x = left - scrollContainerRect.left + scrollContainerScrollLeft;
      let currentFrame = Math.round(x / this.timeline.frameWidth);
      if (currentFrame < 0) {
        currentFrame = 0;
      }
      const segmentLeft = this.timeline.frameWidth * currentFrame;
      // 判断所有轨道与鼠标当前Y轴距离
      tracks.forEach(async (track) => {
        // 如果足够近代表用户想拖到此轨道上
        if (isCloseEnouphToY(track, e.clientY)) {
          
          const placeHolder = getSegmentPlaceholder(track);
          if (!placeHolder) {
            return;
          }
          placeHolder.style.opacity = "0";
          // 轨道 id
          const trackId = track.dataset.trackId ?? ''
          const segmentTrackId = segment.dataset.trackId ?? ''
          // 轨道 id 必须相同才能拖动进去
          if(trackId !== segmentTrackId){
            return ;
          }
          const isCollistion = collisionCheckX(placeHolder, track);
          if (!isCollistion) {
            let dom;
            let framestart = currentFrame;
            if (isCopySegment) {
              if(this.dropableCheck){
                const { dropable, segmentData, segmentName } = await this.dropableCheck(segmentTrackId, currentFrame)
                if(dropable && segmentData){
                  dom = createSegment(SegmentType.BODY_ANIMATION);
                  dom.appendChild(createSegmentName(segmentName));
                  framestart = segmentData.startFrame
                  dom.dataset.framestart = `${framestart}`;
                  dom.dataset.frameend = `${segmentData.endFrame}`;
                  dom.dataset.frames = segmentData.endFrame - framestart;
                  dom.dataset.segmentId = segmentData.sectionId;
                  dom.dataset.trackId = segmentTrackId;
                }
              }else{
                dom = createSegment(SegmentType.BODY_ANIMATION);
              }
            } else {
              dom = segment;
            }
            if(!dom){
              return
            }
            track.appendChild(dom);
            
            const frames = parseFloat(dom.dataset.frames) ?? 0
            dom.dataset.framestart = `${framestart}`;
            if(!dom.dataset.frameend){
              const frameend = framestart + 30; // 默认
              dom.dataset.frameend = `${frameend}`;
            }else{
              dom.dataset.frameend = `${framestart + frames}`;
            }
          
            dom.dataset.trackId = trackId;
            dom.style.left = `${segmentLeft}px`;
            // todo
            if(this.timeline){
              dom.style.width = `${this.timeline?.frameWidth * frames}px`;
            }
          }
        }
        track.classList.remove(this.dragoverClass);
        track.classList.remove(this.dragoverErrorClass);
      });
      // 如果没有跨轨道拖动成功，则 x 轴移动
      setTimeout(() => {
        if (dragTrackContainer.children.length) {
          // 如果是复制
          if (isCopySegment) {
            dragTrackContainer.removeChild(segmentCopy);
          }
          if (originTrack) {
            originTrack.appendChild(segment);
            const placeHolder = getSegmentPlaceholder(originTrack);
            if (placeHolder) {
              placeHolder.style.opacity = "0";
            }
            const isCollistion = collisionCheckX(placeHolder, originTrack);
            if (!isCollistion) {
              segment.style.left = `${segmentLeft}px`;
              segment.dataset.left = String(segmentLeft);

              segment.dataset.width = String(
                segment.getBoundingClientRect().width
              );
            }  
          }
        }
        // 重新允许游标交互
        trackCursor.enable = true;
        const segmentId = segment.dataset.segmentId ?? ''
        const trackId = segment.dataset.trackId ?? ''
        const startFrame = parseFloat(segment.dataset.framestart ?? '0');
        const endFrame = parseFloat(segment.dataset.frameend ?? '0') ;

        // 拖完后触发回调
        this.dragEndCallback?.forEach((cb) =>
          cb(this, TRACKS_EVENT_CALLBACK_TYPES.DRAG_END, {trackId, segmentId, startFrame, endFrame})
        );
        
      }, 0);
      document.removeEventListener("mouseup", mouseup);
      document.removeEventListener("mousemove", mousemove);
    };
    document.addEventListener("mousemove", mousemove);
    document.addEventListener("mouseup", mouseup);
  }
}