import { TimelineAxis } from "./TimelineAxis";
import { Track } from "./Track";
import { Segment } from "./Segment";
// 轨道基本配置信息
export type TTrackConfig = {
  trackId: string;
  childOverlapable?: boolean;
  color?: string;
  trackText?: string;
  trackType: string | SegmentType;
  flexiable?: boolean;
  parentId?: string;
  subTracks?: TTrackConfig[];
  collapsed?: boolean;
}
export enum SegmentType {
  BODY_ANIMATION,
  FACE_ANIMATION,
  VOICE,
  SCENE,
  CAMERA,
  EFFECT,
  BGM,
  AVATAR,
  CAMERA_DYNAMIC,
  TEXT_WIDGET,
  DECORATION,
}
export enum TRACKS_EVENT_TYPES {
  DRAG_START,// 拖动开始事件
  DRAG_END, // 拖动结束事件
  DROP_EFFECT, // 伸缩轨道覆盖切割事件
  SEGMENTS_CHANGED,
  SEGMENTS_SLIDING, // segment 拖动调节宽度事件
  SEGMENTS_SLID_END, // segment 拖动调节完毕后影响到的其它segment
  SEGMENTS_SET_RANGE, // 设置宽度范围事件
  SEGMENT_SELECTED, // 选中
  SEGMENT_DELETED, // 删除
  SEGMENT_ADDED, // 添加
  KEYFRAME_CLICK, // 关键帧被点击
  DRAGING_OVER, // 在容器上方拖动事件
  SEGMENT_RIGHT_CLICK, // 右健
  KEYFRAME_SKIP,// 关键帧之间跳动
  KEYFRAME_MOVE_START,// 关键帧移动结束
  KEYFRAME_MOVING,// 关键帧移动结束
  KEYFRAME_MOVE_END,// 关键帧移动结束
  FRAME_JUMP, // 帧跳动
}
export type ERROR_DATA = {
  eventType: TRACKS_EVENT_TYPES;
};
export interface SegmentBasicInfo {
  trackId: string;
  segmentId: string;
  startFrame: number;
  endFrame: number;
  segment?: HTMLElement;
  track?: HTMLElement | null;
  sectionId?: string;
}
export type CallbackArgs = {
  error?: ERROR_DATA;
  segment?: Segment;
  segments?: Segment[];
  track?: Track;
  eventType?: TRACKS_EVENT_TYPES;
  pointerEvent?: MouseEvent;
  [propsName: string]:any;
};
export interface ITracksEvent {
  (e: CallbackArgs): any;
}
export interface TrackEventMap {
  [TRACKS_EVENT_TYPES.SEGMENTS_SLIDING]: CallbackArgs & {handleCode: number}
}
// 添加成功至轨道后标准的回复格式
export type ResponsedSegmentData = {
  duration: number;
  endFrame: number;
  keys: [];
  rowIndex: number;
  sectionId: string;
  startFrame: number;
  state: number;
  trackId: string;
};
export type NewSegmentResponse = {
  dropable: boolean;
  segmentName: string;
  segmentData?: ResponsedSegmentData | null;
};
export interface ICreateSegmentCheck {
  (trackId: string, startFrame: number, segmentType: SegmentType): Promise<NewSegmentResponse>;
}

export interface IDeleteSegmentCheck {
  (trackId: string, sectionId: string): Promise<boolean>;
}
export interface ITracksArgs {
  scrollContainer: HTMLElement;
  trackListContainer: HTMLElement;
  timeline: TimelineAxis;
  segmentDelegate: HTMLElement;
  tracks: TTrackConfig[];
  createSegmentCheck?: ICreateSegmentCheck;
  deleteSegmentCheck?: IDeleteSegmentCheck;
}
export interface SegmentTracksArgs extends TracksArgs {
  deleteSegmentCheck?: IDeleteSegmentCheck;
}
export interface SegmentTracksOutArgs extends TracksArgs {}

export interface DragingArgs {
  isCopy: boolean;
  scrollContainer: HTMLElement;
  segment: HTMLElement;
  dragingDom: HTMLElement;
  tracks: HTMLElement[];
}
export interface DropArgs {
  e: MouseEvent;
  x: number;
  segmentDom: HTMLElement;
  track: HTMLElement;
  tracks: HTMLElement[];
  isCopySegment: boolean;
}

// Segment 构造参数
export type SegmentConstructInfo = {
  trackId: string;
  framestart: number;
  frameend: number;
  segmentType: SegmentType;
  name?: string;
  segmentId?: string;
  width?: number | string;
  frameWidth: number;
  height?: number | string;
  left?: number | string;
  extra?: any;
  contentRenderer?: string | HTMLElement;
  segmentClass?: string;
  segmentStyle?: string;
};
// Keyframe 构造参数
export type KeyframeConstructInfo = {
  frame: number;
  segmentId: string;
  frameWidth: number;
};

export interface ITrackArgs {
  trackId: string;
  frameWidth: number;
  trackType: string;
  createSegmentCheck?: ICreateSegmentCheck;
}

export type EventListenerType<T extends keyof HTMLElementEventMap> = (
  this: HTMLElement,
  e: HTMLElementEventMap[T]
) => any;
