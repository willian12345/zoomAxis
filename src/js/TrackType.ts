
import { CursorPointer } from "./CursorPointer";
import { TimelineAxis } from "./TimelineAxis";
import { Track } from './Track';
import { Segment } from "./Segment";
export enum SegmentType {
  BODY_ANIMATION,
  FACE_ANIMATION,
  VOICE,
  SCENE,
  CAMERA,
  EFFECT,
  BGM,
}
export enum TRACKS_EVENT_TYPES {
  DRAG_END, // 拖动结束事件
  DROP_EFFECT, // 伸缩轨道覆盖切割事件
  SEGMENTS_CHANGED, 
  SEGMENTS_SLIDED, // segment 拖动调节宽度事件
  SEGMENTS_SLIDE_END, // segment 拖动调节完毕后影响到的其它segment
  SEGMENT_SELECTED, // 选中
  SEGMENT_DELETED, // 删除
  SEGMENT_ADDED, // 添加
  KEYFRAME_CLICK, // 关键帧被点击
  DRAGING_OVER, // 在容器上方拖动事件
}
export type ERROR_DATA = {
  eventType: TRACKS_EVENT_TYPES
}
export interface SegmentBasicInfo {
  trackId: string, 
  segmentId: string, 
  startFrame: number, 
  endFrame: number,
  segment?: HTMLElement,
  track?:HTMLElement | null,
  sectionId?: string,
}
export type CallbackArgs = {error?: ERROR_DATA, segment?: Segment, segments?: Segment[],  track?: Track, eventType?: TRACKS_EVENT_TYPES, pointerEvent?: MouseEvent}
export interface TracksEvent{
  (e: CallbackArgs): any
}
export type  TracksEventCallback  = TracksEvent
// 添加成功至轨道后标准的回复格式
export type ResponsedSegmentData = {
  duration: number
  endFrame: number
  keys: []
  rowIndex: number
  sectionId: string
  startFrame: number
  state: number
  trackId: string
}
export type DropableArgs = {
  dropable: boolean
  segmentName: string
  segmentData?: ResponsedSegmentData | null
}
export interface DropableCheck {
  (trackId: string, startFrame: number): Promise<DropableArgs>
}
export interface DeleteableCheck{
  (trackId: string, sectionId: string): Promise<boolean>
}
export interface TracksArgs {
  trackCursor: CursorPointer
  scrollContainer: HTMLElement
  timeline: TimelineAxis
  segmentDelegate: HTMLElement
  dropableCheck?: DropableCheck
  deleteableCheck?: DeleteableCheck
  ondragover?:any
  ondrop?:any
}
export interface SegmentTracksArgs  extends TracksArgs{
  deleteableCheck?: DeleteableCheck
}
export interface SegmentTracksOutArgs extends TracksArgs {
  
}

export interface MouseHandle {
  (e: MouseEvent):void
}
export interface DragingArgs {
  e: MouseEvent, 
  isCopySegment: boolean,
  scrollContainerX: number, 
  segment: HTMLElement, 
  dragTrackContainerRect: DOMRect, 
  tracks: HTMLElement[],
}
export interface DropArgs {
  e: MouseEvent, 
  x: number, 
  segment: HTMLElement, 
  track: HTMLElement, 
  tracks: HTMLElement[], 
  isCopySegment: boolean, 
}

// Segment 构造参数
export type SegmentConstructInfo = {
  trackId: string,
  framestart: number,
  frameend: number,
  segmentType: SegmentType,
  name?: string,
  segmentId?: string,
  width?: number|string,
  frameWidth: number,
  height?: number|string,
  left?: number|string,
  extra?:any,
  contentRender?: string | HTMLElement
}
// Keyframe 构造参数
export type KeyframeConstructInfo = {
  frame: number,
  segmentId: string,
  frameWidth: number,
  className?: string,
}