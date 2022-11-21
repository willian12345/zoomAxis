
import { CursorPointer } from "./CursorPointer";
import { TimelineAxis } from "./TimelineAxis";
export enum SegmentType {
  BODY_ANIMATION,
  FACE_ANIMATION,
  VOICE,
  SCENE,
  CAMERA,
}
export enum TRACKS_EVENT_CALLBACK_TYPES {
  DRAG_END, // 拖动结束事件
  DROP_EFFECT, // 伸缩轨道覆盖切割事件
  SEGMENTS_CHANGED, 
  SEGMENTS_SLIDED, // segment 拖动调节宽度事件
}
export interface SegmentBasicInfo {
  trackId: string, segmentId: string, startFrame: number, endFrame: number
  segment?: HTMLElement,
  track?:HTMLElement
}
export type TrackEventCallbackArgs = {segments: SegmentBasicInfo[], eventType?: TRACKS_EVENT_CALLBACK_TYPES}
export interface TracksEvent{
  (e: TrackEventCallbackArgs): void
}
export type  TracksEventCallback  = TracksEvent


export type DropableArgs = {
  dropable: boolean
  segmentName: string
  segmentData?: {
    duration: number
    endFrame: number
    keys: []
    rowIndex: number
    sectionId: string
    startFrame: number
    state: number
    trackId: string
  }
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