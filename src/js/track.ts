import { CursorPointer } from "./cursorPointer";

export enum SegmentType {
  BODY_ANIMATION,
  FACE_ANIMATION,
}

const CLOSE_ENOUPH_DISTANCE = 10; // 距离是否够近

// 创建 segment
export const createSegment = (type: SegmentType) => {
  const dom = document.createElement("div");
  dom.className = "segment segment-action";
  dom.style.width = "80px";
  dom.style.height = "24px";
  dom.style.left = "0";
  return dom;
};
export const createSegmentFake = (rect: DOMRect) => {
  const dom = document.createElement("div");
  dom.className = 'segment-fake';
  dom.style.width = `${rect.width}px`;
  dom.style.borderRadius = '4px';
  return dom;
}
export const getLeftValue = (dom: HTMLElement | undefined) => {
  if (!dom) {
    return 0;
  }
  return parseFloat(dom.style.left) ?? 0;
};
export const createDragTrackContainer = () => {
  const div = document.createElement("div");
  div.className = "track-drag-container";
  document.body.appendChild(div);
  return div;
};
export const getDragTrackCotainer = () => {
  let div =
    Array.from(document.body.children).find((element) => {
      return element.className === "track-drag-container";
    }) ?? createDragTrackContainer();
  return div;
};

// 创建 segment 点位器
export const createSegmentPlaceHolder = () => {
  const dom = document.createElement("div");
  dom.className = "segment-placeholder";
  return dom;
};
// 获取轨道内 segment 占位器
export const getSegmentPlaceholder = (track: HTMLElement) => {
  const trackPlaceholder: HTMLElement | null =
    track.querySelector(".track-placeholder");
  let dom;
  if (trackPlaceholder) {
    dom = trackPlaceholder.querySelector(".segment-placeholder") as HTMLElement;
    if (!dom) {
      dom = createSegmentPlaceHolder();
      trackPlaceholder?.appendChild(dom);
    }
  }
  return dom;
};

// 轨道内 segment x 轴横向碰撞检测
export const collisionCheckX = (placeholder: HTMLElement, track: HTMLElement) => {
  const placeholderRect = placeholder.getBoundingClientRect();
  const segments: HTMLElement[] = Array.from(
    track.querySelectorAll(".segment")
  );
  const segmentsLength = segments.length;
  if (!segmentsLength) {
    return false;
  }
  for (let segment of segments) {
    const segmentRect = segment.getBoundingClientRect();
    // placeholder与 segment 都属于轨道内，left 值取 style内的值 即相对坐标
    const segmentLeft = getLeftValue(segment);
    const placeholderLeft = getLeftValue(placeholder);
    // x 轴碰撞检测
    if (
      placeholderLeft + placeholderRect.width > segmentLeft &&
      placeholderLeft < segmentLeft + segmentRect.width
    ) {
      return true;
    }
  }
  return false;
};

// 离Y轴是否足够近
export const isCloseEnouphToY = (
  track: HTMLElement,
  mouseY: number
) => {
  const trackRect = track.getBoundingClientRect();
  const distanceY = Math.abs(trackRect.top + trackRect.height * 0.5 - mouseY);
  return distanceY < CLOSE_ENOUPH_DISTANCE;
};

// 轨道 y 轴 碰撞检测
export const trackCollisionCheckY = (
  dragTrackContainerRect: DOMRect,
  tracks: HTMLElement[],
  scrollContainerX: number,
  mouseY: number
) => {
  let collision = false;
  tracks.forEach((track) => {
    // 离轨道足够近
    const placeHolder = getSegmentPlaceholder(track);
    if (isCloseEnouphToY(track, mouseY)) {
      if (!placeHolder) {
        return;
      }
      tracks.forEach((element: HTMLElement) => {
        element.classList.remove("dragover");
      });
      track.classList.add("dragover");
      // 拖动时轨道内占位元素
      placeHolder.style.width = `${dragTrackContainerRect.width}px`;
      placeHolder.style.left = `${
        dragTrackContainerRect.left + scrollContainerX
      }px`;
      const isCollistion = collisionCheckX(placeHolder, track);
      // 占位与其它元素如果碰撞则隐藏即不允许拖动到此处
      if (isCollistion) {
        placeHolder.style.opacity = "0";
      } else {
        placeHolder.style.opacity = "1";
      }
      collision = true;
    } else {
      if (placeHolder) {
        placeHolder.style.opacity = "0";
      }
    }
  });
  return collision;
};

// 最右侧 segment 片断
export const findEndestSegment = function ():[HTMLElement|null,number] {
  let end: HTMLElement | null = null;
  let max: number = 0;
  const segments: HTMLElement[] = Array.from(
    document.querySelectorAll(".segment")
  );
  segments.forEach((segment) => {
    const rect = segment.getBoundingClientRect();
    const right = getLeftValue(segment) + rect.width;
    if (right > max) {
      max = right;
      end = segment;
    }
  });
  return [end, max];
};

export enum TRACKS_EVENT_CALLBACK_TYPES {
  DRAG_END
}
export interface TracksEventCallback {
  (instance:Tracks, eventType: TRACKS_EVENT_CALLBACK_TYPES): any
}
// 轨道
class Tracks {
  private dragEndCallback: Set<TracksEventCallback>|null = null;
  constructor(trackCursor: InstanceType<typeof CursorPointer>, scrollContainer: HTMLElement){}
  addEventListener(eventType: TRACKS_EVENT_CALLBACK_TYPES, callback: TracksEventCallback){
    if(eventType === TRACKS_EVENT_CALLBACK_TYPES.DRAG_END){
      if(!this.dragEndCallback){
        this.dragEndCallback = new Set()
      }
      this.dragEndCallback.add(callback)
      return 
    }
  }
  dragStart(e: MouseEvent,
    trackCursor: InstanceType<typeof CursorPointer>,
    scrollContainer: HTMLElement,
    segment: HTMLElement,
    isCopySegment: boolean = false,){
    // segment 拖拽
    if (!scrollContainer) {
      return;
    }
    // 获取所有轨道
    const tracks: HTMLElement[] = Array.from(document.querySelectorAll(".track"));
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
        dragTrackContainerRect,
        tracks,
        scrollContainerX,
        e.clientY
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
      startX = e.clientX;
      startY = e.clientY;
      const scrollContainerScrollLeft = scrollContainer.scrollLeft;
      const { left, top } = dragTrackContainer.getBoundingClientRect();
      dragTrackContainer.style.transition = "none";
      // segmentLeft = 拖动示意 left - 轨道总体 left 偏移 + 轨道容器 left 滚动偏移
      const segmentLeft =
        left - scrollContainerRect.left + scrollContainerScrollLeft;
      // 判断所有轨道与鼠标当前Y轴距离
      tracks.forEach((track) => {
        // 如果足够近代表用户想拖到此轨道上
        if (isCloseEnouphToY(track, e.clientY)) {
          const placeHolder = getSegmentPlaceholder(track);
          if (!placeHolder) {
            return;
          }
          placeHolder.style.opacity = "0";
          const isCollistion = collisionCheckX(placeHolder, track);
          if (!isCollistion) {
            let dom;
            if (isCopySegment) {
              dom = createSegment(SegmentType.BODY_ANIMATION);
            } else {
              dom = segment;
            }
            dom.style.left = `${segmentLeft}px`;
            track.appendChild(dom);
          }
        }
      });
      // 如果没有跨轨道拖动成功，则 x 轴移动
      setTimeout(() => {
        if (dragTrackContainer.children.length) {
          // 如果是复制
          if (isCopySegment) {
            dragTrackContainer.removeChild(segmentCopy);
          }
          if (!originTrack) {
            return;
          }
          originTrack.appendChild(segment);
  
          const placeHolder = getSegmentPlaceholder(originTrack);
          if (!placeHolder) {
            return;
          }
          placeHolder.style.opacity = "0";
          const isCollistion = collisionCheckX(placeHolder, originTrack);
          if (!isCollistion) {
            segment.style.left = `${segmentLeft}px`;
          }
        }
      }, 0);
      trackCursor.enable = true;
      this.dragEndCallback?.forEach( cb => cb(this, TRACKS_EVENT_CALLBACK_TYPES.DRAG_END));
      
      document.removeEventListener("mouseup", mouseup);
      document.removeEventListener("mousemove", mousemove);
    };
    document.addEventListener("mousemove", mousemove);
    document.addEventListener("mouseup", mouseup);
  };
}

interface SegmentTracksArgs {
  trackCursor: InstanceType<typeof CursorPointer>
  scrollContainer: HTMLElement
}
// 轨道内 segment 拖拽
export  class SegmentTracks extends Tracks{
  constructor({trackCursor, scrollContainer}: SegmentTracksArgs){
    if (!scrollContainer) {
      return;
    }
    super(trackCursor, scrollContainer)
    const mousedown = (e: MouseEvent) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      if (!target) {
        return;
      }
      if (!target.classList.contains("segment")) {
        return;
      }
      const segment = target;
      this.dragStart(e, trackCursor, scrollContainer, segment);
    };
    // 代理 segment 鼠标事件
    scrollContainer.addEventListener("mousedown", mousedown);
  } 
}

interface SegmentTracksOutArgs extends SegmentTracksArgs{
  segmentDelegete: HTMLElement
}
// 轨道外 segment 拖拽
export class SegmentTracksOut extends Tracks{
  constructor({trackCursor, scrollContainer, segmentDelegete}: SegmentTracksOutArgs){
    if (!scrollContainer) {
      return;
    }
    super(trackCursor, scrollContainer)
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

