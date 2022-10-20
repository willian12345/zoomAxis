
import { CursorPointer } from "./cursorPointer";
import { TimelineAxis } from "./TimelineAxis";
import { Tracks } from "./Tracks";
export enum SegmentType {
  BODY_ANIMATION,
  FACE_ANIMATION,
}
export enum TRACKS_EVENT_CALLBACK_TYPES {
  DRAG_END,
}export interface TracksEventCallback {
  (instance:Tracks, eventType: TRACKS_EVENT_CALLBACK_TYPES): any
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
  timelineAxis: TimelineAxis
  dropableCheck?: DropableCheck
  deleteableCheck?: DeleteableCheck
}
export interface SegmentTracksArgs {
  trackCursor: InstanceType<typeof CursorPointer>
  scrollContainer: HTMLElement
  timelineAxis: TimelineAxis
  deleteableCheck?: DeleteableCheck
}
export interface SegmentTracksOutArgs extends SegmentTracksArgs {
  segmentDelegete: HTMLElement
  dropableCheck?: DropableCheck
}