
import { CursorPointer } from "./CursorPointer";
import { TimelineAxis } from "./TimelineAxis";
import { Tracks } from "./Tracks";
export enum SegmentType {
  BODY_ANIMATION,
  FACE_ANIMATION,
}
export enum TRACKS_EVENT_CALLBACK_TYPES {
  DRAG_END,
}
export interface SegmentBasicInfo {
  trackId: string, segmentId: string, startFrame: number, endFrame: number
}
export interface TracksEventCallback {
  (instance:Tracks, eventType: TRACKS_EVENT_CALLBACK_TYPES, segment?: SegmentBasicInfo): any
}


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
  dropableCheck?: DropableCheck
  deleteableCheck?: DeleteableCheck
}
export interface SegmentTracksArgs {
  trackCursor: InstanceType<typeof CursorPointer>
  scrollContainer: HTMLElement
  timeline: TimelineAxis
  deleteableCheck?: DeleteableCheck
}
export interface SegmentTracksOutArgs extends SegmentTracksArgs {
  segmentDelegete: HTMLElement
  dropableCheck?: DropableCheck
}