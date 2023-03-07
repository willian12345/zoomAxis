import { ZoomAxis, ZoomAxisArgs } from "./ZoomAxis";
export interface TimelineAxisArgs extends ZoomAxisArgs {
  totalFrames: number;
  frameRate?: number;
}
export enum TIMELINE_AXIS_EVENT_TYPE {
  ENTER_FRAME,
  PLAY_START,
  PLAY_END,
  STOP,
  PAUSE,
}

export interface TimelineAxisCallback {
  (e: { currentFrame: number }): any;
}
export interface TimelineAxis {
  addEventListener<EventType extends TIMELINE_AXIS_EVENT_TYPE>(
    eventType: EventType,
    callback: TimelineAxisCallback
  ): void;
}

const FRAME_RATE = 30;
export class TimelineAxis extends ZoomAxis {
  static defaultFrameRate = FRAME_RATE
  private fps = 0;
  private preTimestamp = 0;
  private paused = true;
  private stoped = false;
  playing = false;
  currentFrame = 0; // 当前帧
  totalFrames = 0; // 全部帧数
  frameRate = FRAME_RATE; // 帧频
  raf = 0
  // 每一帧所占宽度
  get frameWidth() {
    // 每个标尺宽度/ (帧频 / (标尺周期值/标尺周期值代表的时间秒数))
    return (
      this.markWidth /
      (this.frameRate / (this.spacecycle / this.spaceTimeSecond))
    );
  }
  constructor({
    el,
    totalFrames = 0,
    totalMarks,
    frameRate,
    ratio,
    ratioMap,
  }: TimelineAxisArgs) {
    super({ el, totalMarks, ratio, ratioMap });
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
    if (this.currentFrame === 0) {
      // todo: 开始播放回调
    }
    if (this.paused || this.stoped) {
      return;
    }
    if (this.currentFrame > this.totalFrames) {
      this.playing = false;
      this.dispatchEvent(
        { eventType: TIMELINE_AXIS_EVENT_TYPE.PLAY_END },
        { currentFrame: this.currentFrame }
      );
      return;
    }
    const now = +new Date();
    const interval = now - this.preTimestamp;
    if (interval >= this.fps) {
      this.preTimestamp = now - (interval % this.fps);
      this.dispatchEvent(
        { eventType: TIMELINE_AXIS_EVENT_TYPE.ENTER_FRAME },
        { currentFrame: this.currentFrame }
      );
      this.currentFrame++;
    }
    this.raf = window.requestAnimationFrame(this.enterFrame.bind(this));

  }
  pause() {
    this.paused = true;
    this.playing = false;
    this.dispatchEvent({eventType: TIMELINE_AXIS_EVENT_TYPE.PAUSE}, {});
  }
  play(currentFrame?: number) {
    if (
      currentFrame != undefined &&
      currentFrame >= 0 &&
      currentFrame <= this.totalFrames
    ) {
      this.currentFrame = currentFrame;
    }
    this.paused = false;
    this.stoped = false;
    this.enterFrame();
    this.dispatchEvent({eventType: TIMELINE_AXIS_EVENT_TYPE.PLAY_START}, {});
    this.playing = true;
  }
  stop() {
    this.currentFrame = 0;
    this.stoped = true;
    this.paused = false;
    this.playing = false;
    this.dispatchEvent(
      { eventType: TIMELINE_AXIS_EVENT_TYPE.STOP },
      { currentFrame: this.currentFrame }
    );
  }
  setCurrentFrame(currentFrame: number) {
    this.currentFrame = currentFrame;
  }
  setTotalFrames(frames: number) {
    this.totalFrames = frames;
  }
  destroy(){
    this.stoped = true;
    window.cancelAnimationFrame(this.raf);
  }
}
