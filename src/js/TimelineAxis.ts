import { ZoomAxis, ZoomAxisArgs } from "./ZoomAxis";
export class TimelineAxis extends ZoomAxis{
  private frameIntervalTime = 0;
  private preTimestamp = 0;
  paused = true;
  constructor({ el, totalMarks, ratioMap }: ZoomAxisArgs){
    super({ el, totalMarks, ratioMap })
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
      console.log('当前帧:', this.currentFrame);
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
}