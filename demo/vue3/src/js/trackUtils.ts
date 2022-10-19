// 创建 segment
import { SegmentType } from './TrackType'
const CLOSE_ENOUPH_DISTANCE = 10; // 距离是否够近
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
  dom.className = "segment-fake";
  dom.style.width = `${rect.width}px`;
  dom.style.borderRadius = "4px";
  return dom;
};
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
export const collisionCheckX = (
  placeholder: HTMLElement,
  track: HTMLElement
) => {
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
export const isCloseEnouphToY = (track: HTMLElement, mouseY: number) => {
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
export const findEndestSegment = function (): [HTMLElement | null, number] {
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