
import { CursorPointer } from "./cursorPointer";
import { TimelineAxis } from "./TimelineAxis";
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
  endFrame?: number
}
export interface DropableCheck {
  (startFrame: number): Promise<DropableArgs>
}
export interface SegmentTracksArgs {
  trackCursor: InstanceType<typeof CursorPointer>;
  scrollContainer: HTMLElement;
  timelineAxis: TimelineAxis;
}
export interface SegmentTracksOutArgs extends SegmentTracksArgs {
  segmentDelegete: HTMLElement;
  dropableCheck?: DropableCheck;
}