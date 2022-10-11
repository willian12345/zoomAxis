import { ZoomAxis, ZoomAxisArgs } from "./ZoomAxis";

export interface TimelineAxisArgs extends ZoomAxisArgs{
  totalFrames: number;
  frameRate?: number;
}
export enum TIMELINE_AXIS_EVENT_TYPE {
  ENTER_FRAME,
}
interface EventCallback {
  (eventType: TIMELINE_AXIS_EVENT_TYPE): any
}
interface ENTER_FRAME_CALLBACK {
  (currentFrame: number, eventType: TIMELINE_AXIS_EVENT_TYPE): any
}
const FRAME_RATE = 30
export class TimelineAxis extends ZoomAxis{
  private frameIntervalTime = 0;
  private preTimestamp = 0;
  private enterframeSet: Set<ENTER_FRAME_CALLBACK>|null = null;
  paused = true; 
  currentFrame = 0; // 当前帧
  totalFrames = 0; // 全部帧数
  frameRate = FRAME_RATE; // 帧频
  constructor({ el, totalFrames = 0, totalMarks, frameRate, ratioMap }: TimelineAxisArgs){
    super({ el, totalMarks,  ratioMap })
    this.totalFrames = totalFrames
    this.frameRate = frameRate ?? FRAME_RATE
    this.setFrameIntervalTime();
  }
  // 每一帧间隔时间
  private setFrameIntervalTime() {
    this.frameIntervalTime = 1000 / this.frameRate; // 毫秒
  }
  private enterFrame(timestamp: number) {
    if (this.paused) {
      return;
    }
    if (this.currentFrame > this.totalFrames) {
      return;
    }
    // const elapsed = timestamp - this.startTime;
    const interval = timestamp - this.preTimestamp
    if(interval >= this.frameIntervalTime){
      this.currentFrame++;
      this.preTimestamp = timestamp;
      if(this.enterframeSet?.size){
        this.enterframeSet.forEach( (cb: ENTER_FRAME_CALLBACK) => cb.call(this, this.currentFrame, TIMELINE_AXIS_EVENT_TYPE.ENTER_FRAME))
      }
    }
    // 
    // console.log(elapsed);
    
    window.requestAnimationFrame(this.enterFrame.bind(this));
  }
  pause() {
    this.paused = true;
  }
  play() {
    this.paused = false;
    this.enterFrame(0);
  }
  addEventListener(eventType: TIMELINE_AXIS_EVENT_TYPE, callback: ENTER_FRAME_CALLBACK){
    if(eventType === TIMELINE_AXIS_EVENT_TYPE.ENTER_FRAME){
      if(!this.enterframeSet){
        this.enterframeSet  = new Set()
      }
      this.enterframeSet.add(callback)
    }
  }
}