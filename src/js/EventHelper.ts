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
  dispatchEvent(event: DispatchEvent, data?: any){
    this.eventCallbackMap.get(event.eventType)?.forEach((cb) => {
      cb({
        ...data,
        eventType: event.eventType,
      });
    });
  }
  // 删除某一个回调
  removeEventListener(eventType: EventType, callback: Callback){
    if(this.eventCallbackMap.has(eventType)){
      const cbs = this.eventCallbackMap.get(eventType);
      if(cbs){
        cbs.delete(callback);
      }
    }
  }
  // 删除某一类型所有回调
  removeEventListenerCallbacks(eventType: EventType){
    if(this.eventCallbackMap.has(eventType)){
      const cbs = this.eventCallbackMap.get(eventType);
      if(cbs){
        cbs.clear();
      }
    }
  }
  // 删除所有回调
  removeAll(){
    this.eventCallbackMap.clear();
  }
}