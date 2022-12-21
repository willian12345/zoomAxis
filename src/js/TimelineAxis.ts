import { ZoomAxis, ZoomAxisArgs } from "./ZoomAxis";

export interface TimelineAxisArgs extends ZoomAxisArgs{
  totalFrames: number;
  frameRate?: number;
}
export enum TIMELINE_AXIS_EVENT_TYPE {
  ENTER_FRAME,
  PLAY_START,
  PLAY_END,
  STOP,
}
interface EventCallback {
  (eventType: TIMELINE_AXIS_EVENT_TYPE, currentFrame: number): any
}
const FRAME_RATE = 30
let a:number;
export class TimelineAxis extends ZoomAxis{
  private fps = 0;
  private preTimestamp = 0;
  private enterframeCallbackSet: Set<EventCallback>|null = null;
  private playStartCallbackSet: Set<EventCallback>|null = null;
  private playEndCallbackSet: Set<EventCallback>|null = null;
  private stopCallbackSet: Set<EventCallback>|null = null;
  private paused = true; 
  private stoped = false;
  playing = false;
  currentFrame = 0; // 当前帧
  totalFrames = 0; // 全部帧数
  frameRate = FRAME_RATE; // 帧频
  // 每一帧所占宽度
  get frameWidth(){
    // 每个标尺宽度/ (帧频 / (标尺周期值/标尺周期值代表的时间秒数))
    return this.markWidth / (this.frameRate / (this.spacecycle / this.spaceTimeSecond))
  }
  constructor({ el, totalFrames = 0, totalMarks, frameRate, ratio, ratioMap }: TimelineAxisArgs){
    super({ el, totalMarks, ratio,  ratioMap });
    this.totalFrames = totalFrames;
    this.frameRate = frameRate ?? FRAME_RATE;
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
    if (this.paused || this.stoped) {
      return;
    }
    if (this.currentFrame > this.totalFrames) {
      this.playing = false;
      this.playEndCallbackSet?.forEach( (cb: EventCallback) => cb(TIMELINE_AXIS_EVENT_TYPE.PLAY_END, this.currentFrame))
      return;
    }
    const now = + new Date()
    const interval = now - this.preTimestamp
    if(interval >= this.fps){
      this.preTimestamp = now - (interval % this.fps);
      this.enterframeCallbackSet?.forEach( (cb: EventCallback) => cb(TIMELINE_AXIS_EVENT_TYPE.ENTER_FRAME, this.currentFrame))
      this.currentFrame++;
    }
    window.requestAnimationFrame(this.enterFrame.bind(this));
  }
  pause() {
    this.paused = true;
    this.playing = false;
  }
  play(currentFrame?: number) {
    if(currentFrame != undefined && currentFrame >= 0 && currentFrame <= this.totalFrames){
      this.currentFrame = currentFrame
    }
    this.paused = false;
    this.stoped = false;
    this.enterFrame();
    this.playing = true;
  }
  stop(){
    this.currentFrame = 0;
    this.stoped = true;
    this.paused = false;
    this.playing = false;
    this.stopCallbackSet?.forEach( (cb: EventCallback) => cb.call(this, TIMELINE_AXIS_EVENT_TYPE.STOP, this.currentFrame));
  }
  addEventListener(eventType: TIMELINE_AXIS_EVENT_TYPE, callback: EventCallback){
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
    if(eventType === TIMELINE_AXIS_EVENT_TYPE.STOP){
      if(!this.stopCallbackSet){
        this.stopCallbackSet  = new Set()
      }
      this.stopCallbackSet.add(callback)
      return this
    }
  }
  setCurrentFrame(currentFrame: number){
    this.currentFrame = currentFrame
  }
  setTotalFrames(frames: number){
    this.totalFrames = frames
  }
}