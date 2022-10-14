import { ZoomAxis, ZoomAxisArgs } from "./ZoomAxis";

export interface TimelineAxisArgs extends ZoomAxisArgs{
  totalFrames: number;
  frameRate?: number;
}
export enum TIMELINE_AXIS_EVENT_TYPE {
  ENTER_FRAME,
  PLAY_START,
  PLAY_END,
}
interface EventCallback {
  (eventType: TIMELINE_AXIS_EVENT_TYPE): any
}
interface ENTER_FRAME_CALLBACK {
  (this: TimelineAxis, currentFrame: number, eventType: TIMELINE_AXIS_EVENT_TYPE): void
}
const FRAME_RATE = 30
let a:number;
export class TimelineAxis extends ZoomAxis{
  private fps = 0;
  private preTimestamp = 0;
  private enterframeCallbackSet: Set<ENTER_FRAME_CALLBACK>|null = null;
  private playStartCallbackSet: Set<ENTER_FRAME_CALLBACK>|null = null;
  private playEndCallbackSet: Set<ENTER_FRAME_CALLBACK>|null = null;
  paused = true; 
  currentFrame = 0; // 当前帧
  totalFrames = 0; // 全部帧数
  frameRate = FRAME_RATE; // 帧频
  get frameWidth(){
    return this.markWidth
  }
  constructor({ el, totalFrames = 0, totalMarks, frameRate, ratioMap }: TimelineAxisArgs){
    super({ el, totalMarks,  ratioMap })
    this.totalFrames = totalFrames
    this.frameRate = frameRate ?? FRAME_RATE
    this.setFrameIntervalTime();
  }
  // 每一帧间隔时间
  private setFrameIntervalTime() {
    // FPS = 1000 毫秒 / 帧频
    this.fps = 1000 / this.frameRate;
  }
  private enterFrame() {
    if(this.currentFrame === 0){
      // todo: 开始播放回调
    }
    if (this.paused) {
      return;
    }
    if (this.currentFrame > this.totalFrames) {
      // todo: 结束播放回调
      return;
    }
    const now = + new Date()
    const interval = now - this.preTimestamp
    if(interval >= this.fps){
      this.preTimestamp = now - (interval % this.fps);
      if(this.enterframeCallbackSet?.size){
        this.enterframeCallbackSet.forEach( (cb: ENTER_FRAME_CALLBACK) => cb.call(this, this.currentFrame, TIMELINE_AXIS_EVENT_TYPE.ENTER_FRAME))
      }
      this.currentFrame++;
    }
    window.requestAnimationFrame(this.enterFrame.bind(this));
  }
  pause() {
    this.paused = true;
  }
  play(currentFrame?: number) {
    if(currentFrame != undefined && currentFrame >= 0 && currentFrame <= this.totalFrames){
      this.currentFrame = currentFrame
    }
    this.paused = false;
    this.enterFrame();
  }
  addEventListener(eventType: TIMELINE_AXIS_EVENT_TYPE, callback: ENTER_FRAME_CALLBACK){
    if(eventType === TIMELINE_AXIS_EVENT_TYPE.ENTER_FRAME){
      if(!this.enterframeCallbackSet){
        this.enterframeCallbackSet  = new Set()
      }
      this.enterframeCallbackSet.add(callback)
      return this
    }
    if(eventType === TIMELINE_AXIS_EVENT_TYPE.PLAY_START){
      if(!this.playStartCallbackSet){
        this.playStartCallbackSet  = new Set()
      }
      this.playStartCallbackSet.add(callback)
      return this
    }
    if(eventType === TIMELINE_AXIS_EVENT_TYPE.PLAY_END){
      if(!this.playEndCallbackSet){
        this.playEndCallbackSet  = new Set()
      }
      this.playEndCallbackSet.add(callback)
      return this
    }
  }
}