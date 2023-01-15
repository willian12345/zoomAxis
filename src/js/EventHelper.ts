import {
  TRACKS_EVENT_CALLBACK_TYPES,
  TracksEventCallback,
  callbacksArgs,
} from "./TrackType";
type DispatchEvent = {
  eventType: TRACKS_EVENT_CALLBACK_TYPES
}
export class EventHelper{
  private eventCallbackMap:Map<TRACKS_EVENT_CALLBACK_TYPES, Set<TracksEventCallback>> = new Map()
  addEventListener(
    eventType: TRACKS_EVENT_CALLBACK_TYPES,
    callback: TracksEventCallback
  ){
    if(!this.eventCallbackMap.has(eventType)){
      this.eventCallbackMap.set(eventType, new Set())
    }
    this.eventCallbackMap.get(eventType)?.add(callback);
  }
  dispatchEvent(event: DispatchEvent, data: callbacksArgs){
    this.eventCallbackMap.get(event.eventType)?.forEach((cb) => {
      cb({
        ...data,
        eventType: event.eventType,
      });
    });
  }
}