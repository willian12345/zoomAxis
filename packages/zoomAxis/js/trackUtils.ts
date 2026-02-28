// 创建 segment
import {
  TSegmentConstructParams,
} from "./TrackType";
import { Segment } from "./Segment";
import { segmentRenderers } from './SegmentRendererManager'
import { Track } from "./track/Track";
const CLOSE_ENOUPH_DISTANCE_Y = 15; // 距离 y 是否够近
const CLOSE_ENOUPH_SEGMENT_X = 20; // 距离 segment x是否够

export const UNIQUE_PREFIX = "wang-er-gou";
export const SEGMENT_OFFSET_TOP = 2; // 节点离轨道顶部向下偏移距离
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
export const CLASS_NAME_SEGMENT_KEYFRAME = 'segment-keyframe';
export const CLASS_NAME_SEGMENT_KEYFRAME_ACTIVED = 'actived';
export const DEFAULT_SEGMENT_FRAMES = 150; // 默认 150 帧
export const CLASS_NAME_SEGMENT_HANDLE_CONTAINER = 'segment-handle-container'

export const createSegment = (params: TSegmentConstructParams) => {
  const SegmentContentRenderClass = segmentRenderers.getRenderer(params.segmentType);
  console.log(segmentRenderers,3333)
  if(SegmentContentRenderClass){
    params.segmentRendererConstructor = SegmentContentRenderClass;
  }else{
    params.segmentRendererConstructor = segmentRenderers.getRenderer(-1);
    console.log('未找到对应的 segment 渲染器', params.segmentRendererConstructor)
  }
  const segment = new Segment(params);
  return segment;
};
export const createNodeWidthClass = (className: string) => {
  const dom = document.createElement("div");
  dom.className = className;
  return dom;
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
  return parseFloat(dom.style.left) || 0;
};
export const createDragTrackContainer = () => {
  const div = createContainer(CLASS_NAME_TRACK_DRAG_CONTAINER)
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
export const removeDragTrackContainer = () => {
  document.querySelectorAll(`.${CLASS_NAME_TRACK_DRAG_CONTAINER}`).forEach( h => h.parentNode?.removeChild(h));
}

// 创建 segment 点位器
export const createSegmentPlaceHolder = (id: string) => {
  const dom = document.createElement("div");
  dom.className = CLASS_NAME_SEGMENT_PLACEHOLDER;
  dom.id = id;
  return dom;
};
// 获取轨道内 segment 占位器
export const getSegmentPlaceholder = (track: HTMLElement, segment: Segment) => {
  // 为每一个 segment 单独创建一个 placeholder 占位
  const segmentPlaceholderId =  `${UNIQUE_PREFIX}segmentPlaceholder${segment.segmentId}${CLASS_NAME_SEGMENT_PLACEHOLDER}`;
  // segment 点位器在单独的占位容器内
  const trackPlaceholder: HTMLElement | null = track.querySelector(`.${CLASS_NAME_TRACK_PLACEHOLDER}`);
  let dom: HTMLElement | null = null;
  if (trackPlaceholder) {
    if(!segment.segmentId){
      dom = trackPlaceholder.querySelector(`.${CLASS_NAME_SEGMENT_PLACEHOLDER}`) as HTMLElement;
    }else{
      dom = trackPlaceholder.querySelector(`#${segmentPlaceholderId}`) as HTMLElement;
    }
    
    if (!dom) {
      dom = createSegmentPlaceHolder(segmentPlaceholderId);
      trackPlaceholder?.appendChild(dom);
    }
    dom.dataset.framestart = segment.framestart.toString();
    dom.dataset.frameend = segment.frameend.toString();
  }
  
  return dom;
};
export const removePlaceholder = (track: HTMLElement, segment: Segment)=> {
  const segmentPlaceholderId =  `${UNIQUE_PREFIX}segmentPlaceholder${segment.segmentId}${CLASS_NAME_SEGMENT_PLACEHOLDER}`;
  const dom = track.querySelector(`#${segmentPlaceholderId}`) as HTMLElement;
  if(dom) dom.parentElement?.removeChild(dom);
}

export const getFramestart = (x: number, frameWidth: number) => {
  let frame = Math.round(x / frameWidth);
  if (frame < 0) {
    frame = 0;
  }
  return frame;
}

// 同轨道内 segment x 轴横向碰撞检测
export const collisionCheckX = (
  framestart: number,
  frameend: number,
  segments: Segment[] = []
): boolean => {
  const segmentsLength = segments.length;
  if (!segmentsLength) {
    return false
  }
  const frameGroup = segments.map( segment => [segment.framestart, segment.frameend]);
  return collisionCheckFrames(framestart, frameend, frameGroup);
};

export const getFrameByWidth = (width: number, frameWidth: number): number => {
  let frame = Math.round(width / frameWidth);
  if (frame < 0) {
    frame = 0;
  }
  return frame;
};
export const getframes = (rect: DOMRect, frameWidth: number,  segment?: Segment) => {
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
export const getSegmentsByTrackDom = (track: HTMLElement): HTMLElement[] => {
  const segments: HTMLElement[] = Array.from(
    track.querySelectorAll(`.${CLASS_NAME_SEGMENT}`)
  );
  return segments;
};
export const collisionCheckFrame = (
  target: Segment,
  track: Track
): boolean => {
  const frameGroup = track.getOtherSegments(target.segmentId).map( segment => [segment.framestart, segment.frameend]);
  return collisionCheckFrames(target.framestart, target.frameend, frameGroup);
};

export const collisionCheckFrames = (framestart: number, frameend: number, frameGroup: number[][]) => {
  for (let [start, end] of frameGroup) {
    if (
      (framestart < start && frameend > end) || // 完整覆盖
      (framestart > start && framestart < end) ||
      (frameend < end && frameend > start)
    ) {
      return true;
    }
  }
  return false;
}

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
  y: number
): T | undefined => {
  for (let track of tracks) {
    if (isCloseEnouphToY(track.dom, y)) {
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

export const findLastIndex = (arr: any[], fn: CallableFunction) => {
  let index = -1;
  console.log(arr);
  for(let i=0, l=arr.length; i<l;i++){
    if(fn(arr[i])){
      index = i;
    }
  }
  return index;
}

export const createContainer = (className: string, cssText?: string) => {
  const div = document.createElement("div");
  div.className = className;
  if(cssText){
    div.style.cssText = cssText
  }
  return div;
};

export const getFrameByX = (x: number, frameWidth: number) => {
  let frame = Math.round(x / frameWidth);
  if (frame < 0) {
    frame = 0;
  }
  return frame;
}