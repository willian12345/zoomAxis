// 创建 segment
import { SegmentBasicInfo, SegmentType } from './TrackType'
const CLOSE_ENOUPH_DISTANCE_Y = 10; // 距离 y 是否够近
const CLOSE_ENOUPH_SEGMENT_X = 60; // 距离 segment x是否够近
let segmentUUID = 1
export const createSegmentName = (text: string) => {
  const dom = document.createElement("div");
  dom.className = "segment-name";
  dom.innerText = text;
  return dom;
}
const createDivDom = (className: string) => {
  const dom = document.createElement('div');
  dom.className = className;
  return dom;
}

// todo: 抽象成单独 Segment 类用于构造 segment
export const createSegment = (type?: SegmentType) => {
  console.log(type);
  const dom = document.createElement("div");
  dom.className = "segment";
  dom.style.width = "80px";
  dom.style.height = "24px";
  dom.style.left = "0";
  dom.dataset.segmentId = `${++segmentUUID}`;
  dom.dataset.trackId = '';
  const handleLeftDom = createDivDom('segment-handle segment-handle-left');
  const handleRightDom = createDivDom('segment-handle segment-handle-right');
  dom.prepend(handleLeftDom);
  dom.appendChild(handleRightDom);
  return dom;
};
export const createSegmentFake = (rect: DOMRect) => {
  const dom = document.createElement("div");
  dom.className = "segment-fake";
  dom.style.width = `${rect.width}px`;
  dom.style.borderRadius = "4px";
  return dom;
}
export const createSegmentToTrack = (segmentName: string, segmentType: SegmentType, segmentInfo: SegmentBasicInfo): HTMLElement => {
  const dom = createSegment(segmentType);
  dom.appendChild(createSegmentName(segmentName));
  dom.dataset.framestart = `${segmentInfo.startFrame}`;
  dom.dataset.frameend = `${segmentInfo.endFrame}`;
  dom.dataset.segmentId = `${segmentInfo.segmentId}`;
  dom.dataset.trackId = `${segmentInfo.trackId}`;
  return dom;
}
export const findParentElementByClassName = (dom: HTMLElement, parentClassName: string) => {
  let parent = dom.parentElement;
  while(parent && !parent.classList.contains(parentClassName)){
    parent = parent.parentElement
  }
  return parent
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
  let dom: HTMLElement | null = null;
  if (trackPlaceholder) {
    dom = trackPlaceholder.querySelector(".segment-placeholder") as HTMLElement;
    if (!dom) {
      dom = createSegmentPlaceHolder();
      trackPlaceholder?.appendChild(dom);
    }
  }
  return dom;
};

type  collisionCheckXResult = [collision:boolean, magnet: boolean, magnetTo?:HTMLElement]
// 轨道内 segment x 轴横向碰撞检测
export const collisionCheckX = (
  target: HTMLElement,
  track: HTMLElement
): collisionCheckXResult => {
  const targetRect = target.getBoundingClientRect();
  const segments: HTMLElement[] = Array.from(
    track.querySelectorAll(".segment")
  );
  const segmentsLength = segments.length;
  if (!segmentsLength) {
    return [false, false];
  }
  for (let segment of segments) {
    const segmentRect = segment.getBoundingClientRect();
    // placeholder与 segment 都属于轨道内，left 值取 style内的值 即相对坐标
    const segmentLeft = getLeftValue(segment);
    const targetLeft = getLeftValue(target);
    const closeDistance = targetLeft - (segmentLeft + segmentRect.width);
    if(closeDistance <= 0 && closeDistance >= -CLOSE_ENOUPH_SEGMENT_X){
      return [true, true, segment]
    }
    // x 轴碰撞检测
    if (
      targetLeft + targetRect.width > segmentLeft &&
      targetLeft < segmentLeft + segmentRect.width
    ) {
      return [true, false];
    }
  }
  return [false, false];
};
export const getSegmentsByTrack = (track: HTMLElement): HTMLElement[] => {
  const segments: HTMLElement[] = Array.from(
    track.querySelectorAll(".segment")
  );
  return segments
}
export const collisionCheckFrame = (target: HTMLElement,  track: HTMLElement): boolean => {
  const [framestart, frameend] = getFrameRange(target);
  const segments = getSegmentsByTrack(track);
  for(let segment of segments){
    const [start, end] = getFrameRange(segment);
    if(
        framestart < start && frameend > end // 完整覆盖
        || framestart > start && framestart < end
        || frameend < end && frameend > start
    ){
      console.log(framestart, frameend, start, end)
      return true
    }
  }
  return false
}

// 离Y轴是否足够近
export const isCloseEnouphToY = (track: HTMLElement, mouseY: number) => {
  const trackRect = track.getBoundingClientRect();
  const distanceY = Math.abs(trackRect.top + trackRect.height * 0.5 - mouseY);
  return distanceY < CLOSE_ENOUPH_DISTANCE_Y;
};

export const isContainSplitFromComma = (trackIds: string, trackId: string) => {
  if(trackIds === trackId){
    return true
  }
  return trackIds.split(',').find((splitTrackId)=> {
    return splitTrackId === trackId
  })

}

// 轨道 y 轴 碰撞检测
export const trackCollisionCheckY = (
  tracks: HTMLElement[],
  mouseY: number,
): [boolean, HTMLElement|null] => {
  let collisionTrack: HTMLElement|null = null;
  let collisionY = false;
  tracks.forEach((track) => {
    if (isCloseEnouphToY(track, mouseY)) {
      collisionTrack = track;
      collisionY = true;
    }
  });
  return [collisionY, collisionTrack];
};

// 最右侧 segment 片断
export const findEndestSegment = function (container: HTMLElement = document.body): [HTMLElement | null, number] {
  let end: HTMLElement | null = null;
  let max: number = 0;
  const segments: HTMLElement[] = Array.from(
    container.querySelectorAll(".segment")
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
export const findEndestSegmentOnTrack =  (track: HTMLElement) => {
  return findEndestSegment(track)
}
// 获取 dom dataset 数值
export const getDatasetNumberByKey = (dom: HTMLElement, datasetKey: string):number => {
  return parseFloat(dom.dataset[datasetKey] ?? '0')
}
export const getFrameRange = (dom: HTMLElement):[number, number] => {
  const framestart =  getDatasetNumberByKey(dom, 'framestart');
  const frameend =  getDatasetNumberByKey(dom, 'frameend');
  return [framestart, frameend];
}

export const sortByLeftValue = (segmentA: HTMLElement, segmentB: HTMLElement) => {
  const segmentAx = getLeftValue(segmentA);
  const segmentBx = getLeftValue(segmentB);
  return segmentAx > segmentBx ? 1 : -1;
}