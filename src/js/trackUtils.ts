// 创建 segment
import { SegmentBasicInfo, SegmentType, SegmentConstructInfo } from './TrackType'
import { Segment } from './Segment';
import { getContentRenderer, getSegmentStyle } from './SegmentRenderers'
import { Track } from './Track';
const CLOSE_ENOUPH_DISTANCE_Y = 15; // 距离 y 是否够近
const CLOSE_ENOUPH_SEGMENT_X = 20; // 距离 segment x是否够


export const createSegment = (segmentInfo: SegmentConstructInfo ) => {
  segmentInfo.contentRenderer = getContentRenderer(segmentInfo);
  segmentInfo.segmentStyle = getSegmentStyle(segmentInfo);
  const segment = new Segment(segmentInfo);
  return segment;
};
export const createNodeWidthClass = (className: string) => {
  const dom = document.createElement("div");
  dom.className = className;
  return dom;
}
export const createSegmentFake = (rect: DOMRect) => {
  const dom = document.createElement("div");
  dom.className = "segment-fake";
  dom.style.width = `${rect.width}px`;
  dom.style.borderRadius = "4px";
  return dom;
}
export const createSegmentToTrack = (segmentName: string, segmentType: SegmentType, segmentInfo: SegmentBasicInfo, frameWidth: number): Segment => {
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

type  collisionCheckXResult = [collision:boolean, magnet: boolean, magnetTo?:number]
// 轨道内 segment x 轴横向碰撞检测
export const collisionCheckX = (
  target: HTMLElement, // placeholder
  track: HTMLElement
): collisionCheckXResult => {
  // target 即轨道内的 当前拖动 segment 的 placeholder 替身
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
    let targetLeft = getLeftValue(target);
    // 如果值是负数说明拖到超出轨道左侧需要修正为 0
    targetLeft = targetLeft < 0 ? 0 : targetLeft;
    // x 轴碰撞检测，判断如果targetLeft值处于 segment 位置有重叠则表示碰撞了
    if (
      targetLeft + targetRect.width > segmentLeft &&
      targetLeft < segmentLeft + segmentRect.width
    ) {
      return [true, false];
    }
  }
  // 如果没有任何碰撞，则循环找到是否可吸附的 segment 
  for (let segment of segments) {
    const segmentRect = segment.getBoundingClientRect();
    // placeholder与 segment 都属于轨道内，left 值取 style内的值 即相对坐标
    const segmentLeft = getLeftValue(segment);
    let targetLeft = getLeftValue(target);
    // 如果值是负数说明拖到超出轨道左侧需要修正为 0
    targetLeft = targetLeft < 0 ? 0 : targetLeft;
    // 左右吸附效果
    // 检测左边
    let closeDistance = targetLeft - (segmentLeft + segmentRect.width);
    //target 距离左侧 segment 的结束足够近
    if(targetLeft > (segmentLeft + segmentRect.width) && closeDistance <= CLOSE_ENOUPH_SEGMENT_X){
      return [true, true, segmentLeft + segmentRect.width]
    }
    // 检测右边
    closeDistance = segmentLeft - (targetLeft + targetRect.width);
    // target 结束帧距离右侧 segment 开始足够近
    if(targetLeft+targetRect.width < segmentLeft && closeDistance <= CLOSE_ENOUPH_SEGMENT_X){
      return [true, true, segmentLeft - targetRect.width]
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
export const trackCollisionCheckY = <T extends Track>(
  tracks: T[],
  mouseY: number,
): T|undefined => {
  for(let track of tracks){
    if (isCloseEnouphToY(track.dom, mouseY)) {
      return track
    }
  }
  return undefined
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

export const sortByLeftValue = (segmentA: Segment, segmentB: Segment) => {
  const segmentAx = getLeftValue(segmentA.dom);
  const segmentBx = getLeftValue(segmentB.dom);
  return segmentAx > segmentBx ? 1 : -1;
}

export const isFlexTrack = (track: HTMLElement) => {
  return track.classList.contains('track-flexible');
}

// 获取 leftValue 轨道右侧的所有 segments
export const  getRightSideSegments = (segments: Segment[], leftValue: number) => {
  return segments
    .filter((segment) => {
      const segmentX = getLeftValue(segment.dom);
      return leftValue < segmentX;
    })
    .sort(sortByLeftValue);
}
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
}