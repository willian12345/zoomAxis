// 创建 segment
import {
  SegmentBasicInfo,
  SegmentType,
  SegmentConstructInfo,
} from "./TrackType";
import { Segment } from "./Segment";
import { getContentRenderer, getSegmentStyle } from "./SegmentRenderers";
import { Track } from "./Track";
const CLOSE_ENOUPH_DISTANCE_Y = 15; // 距离 y 是否够近
const CLOSE_ENOUPH_SEGMENT_X = 20; // 距离 segment x是否够

export const CLASS_NAME_TRACK = 'track';
export const CLASS_NAME_TRACK_FLEX = 'track-flexible';
export const CLASS_NAME_TRACK_DRAG_CONTAINER = 'track-drag-container';
export const CLASS_NAME_TRACK_PLACEHOLDER = 'track-placeholder';
export const CLASS_NAME_TRACK_DRAG_OVER = 'dragover';
export const CLASS_NAME_TRACK_DRAG_OVER_ERROR = 'dragover-error';
export const CLASS_NAME_NEW_SEGMENT = 'segment-item';
export const CLASS_NAME_SEGMENT = 'segment';
export const CLASS_NAME_SEGMENT_FAKE = 'segment-fake';
export const CLASS_NAME_SEGMENT_PLACEHOLDER = 'segment-placeholder'
export const CLASS_NAME_SEGMENT_HANDLE = 'segment-handle';
export const CLASS_NAME_SEGMENT_HANDLE_LEFT = 'segment-handle-left';
export const CLASS_NAME_SEGMENT_HANDLE_RIGHT = 'segment-handle-right';

export const createSegment = (segmentInfo: SegmentConstructInfo) => {
  segmentInfo.contentRenderer = getContentRenderer(segmentInfo);
  segmentInfo.segmentStyle = getSegmentStyle(segmentInfo);
  const segment = new Segment(segmentInfo);
  return segment;
};
export const createNodeWidthClass = (className: string) => {
  const dom = document.createElement("div");
  dom.className = className;
  return dom;
};
export const createSegmentFake = (rect: DOMRect) => {
  const dom = document.createElement("div");
  dom.className = CLASS_NAME_SEGMENT_FAKE;
  dom.style.width = `${rect.width}px`;
  dom.style.borderRadius = "4px";
  return dom;
};
export const createSegmentToTrack = (
  segmentName: string,
  segmentType: SegmentType,
  segmentInfo: SegmentBasicInfo,
  frameWidth: number
): Segment => {
  const segment = createSegment({
    trackId: segmentInfo.trackId,
    framestart: segmentInfo.startFrame,
    frameend: segmentInfo.endFrame,
    name: segmentName,
    segmentId: segmentInfo.segmentId,
    segmentType,
    frameWidth,
  });
  return segment;
};
export const findParentElementByClassName = (
  dom: HTMLElement,
  parentClassName: string
) => {
  let parent = dom.parentElement;
  while (parent && !parent.classList.contains(parentClassName)) {
    parent = parent.parentElement;
  }
  return parent;
};
export const getLeftValue = (dom: HTMLElement | undefined) => {
  if (!dom) {
    return 0;
  }
  return parseFloat(dom.style.left) ?? 0;
};
export const createDragTrackContainer = () => {
  const div = document.createElement("div");
  div.className = CLASS_NAME_TRACK_DRAG_CONTAINER;
  document.body.appendChild(div);
  return div;
};
export const getDragTrackCotainer = () => {
  let div =
    Array.from(document.body.children).find((element) => {
      return element.className === CLASS_NAME_TRACK_DRAG_CONTAINER;
    }) ?? createDragTrackContainer();
  return div;
};

// 创建 segment 点位器
export const createSegmentPlaceHolder = () => {
  const dom = document.createElement("div");
  dom.className = CLASS_NAME_SEGMENT_PLACEHOLDER;
  return dom;
};
// 获取轨道内 segment 占位器
export const getSegmentPlaceholder = (track: HTMLElement) => {
  // segment 点位器在单独的占位容器内
  const trackPlaceholder: HTMLElement | null =
    track.querySelector(`.${CLASS_NAME_TRACK_PLACEHOLDER}`);
  let dom: HTMLElement | null = null;
  if (trackPlaceholder) {
    dom = trackPlaceholder.querySelector(`.${CLASS_NAME_SEGMENT_PLACEHOLDER}`) as HTMLElement;
    if (!dom) {
      dom = createSegmentPlaceHolder();
      trackPlaceholder?.appendChild(dom);
    }
  }
  return dom;
};

// 同轨道内 segment x 轴横向碰撞检测
export const collisionCheckX = (
  target: HTMLElement, // placeholder
  track: HTMLElement
): boolean => {
  // target 即轨道内的 当前拖动 segment 的 placeholder 替身
  const targetRect = target.getBoundingClientRect();
  const segments: HTMLElement[] = Array.from(
    track.querySelectorAll(`.${CLASS_NAME_SEGMENT}`)
  );
  const segmentsLength = segments.length;
  if (!segmentsLength) {
    return false
  }
  for (let segment of segments) {
    const segmentRect = segment.getBoundingClientRect();
    // placeholder与 segment 都属于轨道内，left 值取 style内的值 即相对坐标
    const segmentLeft = getLeftValue(segment);
    let targetLeft = getLeftValue(target);
    // 如果值是负数说明拖到超出轨道左侧需要修正为 0
    targetLeft = targetLeft < 0 ? 0 : targetLeft;
    // x 轴碰撞检测，判断如果targetLeft值处于 segment 位置有重叠则表示碰撞了
    if (
      targetLeft + targetRect.width > segmentLeft &&
      targetLeft < segmentLeft + segmentRect.width
    ) {
      return true;
    }
  }
  return false;
};
const getFrameByWidth = (width: number, frameWidth: number): number => {
  let frame = Math.round(width / frameWidth);
  if (frame < 0) {
    frame = 0;
  }
  return frame;
};
const getframes = (rect: DOMRect, frameWidth: number,  segment?: Segment) => {
  if(segment){
    return segment.frameend - segment.frameend;
  }
  return getFrameByWidth(rect.width, frameWidth)
}
/**
 * 检测辅助线吸附 checkCoordinateLine
 * @param dragingDom 当前拖动的 dom
 * @param segments 所有轨道上所有 segment
 * @param frameWidth 当前帧宽
 * @returns [是否有吸附，吸附后 dom 的 framestart, 辅助线 style left 值]
 */
export const checkCoordinateLine = (
  dragingDom: HTMLElement,
  segments: HTMLElement[],
  frameWidth: number,
  dragingSegment?: Segment,
): [boolean, number, number, HTMLElement|null] => {
  if (!segments.length) {
    return [false, 0, 0, null];
  }
  const dragingDomRect = dragingDom.getBoundingClientRect();
  // 与轨道内的所有 segments 进行距离碰撞对比
  for (let segment of segments) {
    // 如果拖动的是自己（拖动手柄时）
    if(segment.dataset.segmentId === dragingDom.dataset.segmentId){
      continue
    }
    // 拖动 segment 时
    const rect = segment.getBoundingClientRect();
    const [framestart, frameend] = getFrameRange(segment);
    if (
      Math.abs(dragingDomRect.left - rect.right) <= CLOSE_ENOUPH_SEGMENT_X
    ) {
      // console.log("adsorb!!!吸至右侧", frameend);
      return [true, frameend, frameend * frameWidth, segment];
    }
    if (
      Math.abs(dragingDomRect.right - rect.left) <= CLOSE_ENOUPH_SEGMENT_X
    ) {
      // console.log("adsorb!!!吸至左侧", framestart);
      const frames =  getframes(dragingDomRect, frameWidth, dragingSegment);
      return [
        true,
        framestart - frames,
        framestart * frameWidth,
        segment
      ];
    }
    if(Math.abs(dragingDomRect.right - rect.right) <= CLOSE_ENOUPH_SEGMENT_X){
      // console.log("adsorb!!!吸至同右侧", framestart);
      const frames =  getframes(dragingDomRect, frameWidth, dragingSegment);
      return [
        true,
        frameend - frames,
        frameend * frameWidth,
        segment
      ];
    }
    if(Math.abs(dragingDomRect.left - rect.left) <= CLOSE_ENOUPH_SEGMENT_X ){
      // console.log("adsorb!!!吸至同左侧", framestart);
      return [
        true,
        framestart,
        framestart * frameWidth,
        segment
      ];
    }
    
  }
  return [false, 0, 0, null];
};
export const getSegmentsByTrack = (track: HTMLElement): HTMLElement[] => {
  const segments: HTMLElement[] = Array.from(
    track.querySelectorAll(`.${CLASS_NAME_SEGMENT}`)
  );
  return segments;
};
export const collisionCheckFrame = (
  target: HTMLElement,
  track: HTMLElement
): boolean => {
  const [framestart, frameend] = getFrameRange(target);
  const segments = getSegmentsByTrack(track);
  for (let segment of segments) {
    const [start, end] = getFrameRange(segment);
    if (
      (framestart < start && frameend > end) || // 完整覆盖
      (framestart > start && framestart < end) ||
      (frameend < end && frameend > start)
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
  return distanceY < CLOSE_ENOUPH_DISTANCE_Y;
};

export const isContainSplitFromComma = (trackIds: string, trackId: string) => {
  if (trackIds === trackId) {
    return true;
  }
  return trackIds.split(",").find((splitTrackId) => {
    return splitTrackId === trackId;
  });
};

// 轨道 y 轴 碰撞检测
export const trackCollisionCheckY = <T extends Track>(
  tracks: T[],
  mouseY: number
): T | undefined => {
  for (let track of tracks) {
    if (isCloseEnouphToY(track.dom, mouseY)) {
      return track;
    }
  }
  return undefined;
};

// 最右侧 segment 片断
export const findEndestSegment = function (
  container: HTMLElement = document.body
): [HTMLElement | null, number] {
  let end: HTMLElement | null = null;
  let max: number = 0;
  const segments: HTMLElement[] = Array.from(
    container.querySelectorAll(`.${CLASS_NAME_SEGMENT}`)
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
// 找到某条轨道最右侧的片断
export const findEndestSegmentOnTrack = (track: HTMLElement) => {
  return findEndestSegment(track);
};
// 获取 dom dataset 数值
export const getDatasetNumberByKey = (
  dom: HTMLElement,
  datasetKey: string
): number => {
  return parseFloat(dom.dataset[datasetKey] ?? "0");
};
export const getFrameRange = (dom: HTMLElement): [number, number] => {
  const framestart = getDatasetNumberByKey(dom, "framestart");
  const frameend = getDatasetNumberByKey(dom, "frameend");
  return [framestart, frameend];
};

export const sortByLeftValue = (segmentA: Segment, segmentB: Segment) => {
  const segmentAx = getLeftValue(segmentA.dom);
  const segmentBx = getLeftValue(segmentB.dom);
  return segmentAx > segmentBx ? 1 : -1;
};

export const isFlexTrack = (track: HTMLElement) => {
  return track.classList.contains(CLASS_NAME_TRACK_FLEX);
};

// 获取 leftValue 轨道右侧的所有 segments
export const getRightSideSegments = (
  segments: Segment[],
  leftValue: number
) => {
  return segments
    .filter((segment) => {
      const segmentX = getLeftValue(segment.dom);
      return leftValue < segmentX;
    })
    .sort(sortByLeftValue);
};
// 获取 leftValue 轨道左侧的所有 segments
export const getLeftSideSegments = (segments: Segment[], leftValue: number) => {
  return segments
    .filter((segment) => {
      const segmentX = getLeftValue(segment.dom);
      // ？？ 是否拖动手柄时也使用此判断 todo
      const _leftValue =
        segmentX + segment.dom.getBoundingClientRect().width * 0.5;
      return leftValue > _leftValue;
    })
    .sort(sortByLeftValue);
};
