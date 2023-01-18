type EventType = string|number;
type DispatchEvent = {
  eventType: EventType
}
type Callback = (args:any) => void
export class EventHelper{
  private eventCallbackMap:Map<EventType, Set<Callback>> = new Map()
  addEventListener(
    eventType: EventType,
    callback: Callback
  ){
    if(!this.eventCallbackMap.has(eventType)){
      this.eventCallbackMap.set(eventType, new Set())
    }
    this.eventCallbackMap.get(eventType)?.add(callback);
  }
  dispatchEvent(event: DispatchEvent, data: any){
    this.eventCallbackMap.get(event.eventType)?.forEach((cb) => {
      cb({
        ...data,
        eventType: event.eventType,
      });
    });
  }
  removeEventListener(eventType: EventType, callback: Callback){
    if(!this.eventCallbackMap.has(eventType)){
      const cbs = this.eventCallbackMap.get(eventType);
      if(cbs){
        cbs.delete(callback);
      }
    }
  }
}