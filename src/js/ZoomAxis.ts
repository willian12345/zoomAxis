//秒转化成 时分秒
function secondToDate(result: number) {
  // var h = Math.floor(result / 3600);
  var m = Math.floor((result / 60) % 60);
  var s = Math.floor(result % 60);
  return `${m}:${s}`;
  // return result = h + "小时" + m + "分钟" + s + "秒";
}
const SPACE_FRAME_WIDTH = 80; // 刻度间距
const SPACE_FRAME_WIDTH_MIN = 8; // 刻度最小间距
const SPACE_FRAME_WIDTH_MAX = 100; // 刻度最大间距
interface ConstructorArgs {
    el: string;
    totalTime: number;
}
export class ZoomAxis {
  private canvas?: HTMLCanvasElement | null = null;
  private ctx?: CanvasRenderingContext2D | null = null;
  private stageWidth = 600; // 最小宽度 600px
  private stageHeightOut = 24
  private stageHeight = this.stageHeightOut * 2;
  private lineColor = "rgba(255, 255, 255, 0.12)";
  private lineWidth = 2; // 刻度线宽度
  private lineHeight = 24; // 刻度线高度
  private lineShortHeight = 16; // 短刻度线高度
  private spacecycle = 10; // 每 10 个最小刻度为一组分割
  private spaceCycleIndex = 0; // 刻度大间隔周期累计
  private spaceTimeSecond = 1; // 刻度间隔秒数
  private spaceFrameIndex = 0; // 刻度表帧数数计
  private lineX = 0;
  private lineY = 0;
  totalTime = 0; // 时间轴总秒数
  spaceFrameWidth = SPACE_FRAME_WIDTH; // 刻度间距
  zoomRatio = 1; // 缩放比例
  constructor({el, totalTime}:ConstructorArgs) {
    if (!el) {
        console.warn('挂载对象 id 必传')
      return;
    }
    this.canvas = this.createStage(el)
    if(!this.canvas){
        console.warn('创建canvas失败')
        return
    }
    this.setStageWidth();
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    
    this.ctx.font = "22px PingFang SC";
    this.ctx.textBaseline = "top";
    this.totalTime = totalTime
    this.drawLine();
  }
  private createStage(el: string) {
    const elHook = document.getElementById(el) as HTMLCanvasElement;
    if (!elHook) {
        console.warn(`找不到id为${el}的 HTML元素挂载`)
        return;
    }
    const div = document.createElement('div')    
    div.innerHTML = `<canvas style="
        width: 100%;
        height: ${this.stageHeightOut}px;
        vertical-align: middle;
      " height="${this.stageHeight}"></canvas>`
    const canvas = div.querySelector('canvas') as HTMLCanvasElement
    elHook.replaceWith(canvas)
    return canvas
  }
  private setStageWidth() {
    // 获取父级宽度
    const stageWidth =
      this.canvas?.parentElement?.getBoundingClientRect()?.width;
    if (stageWidth) {
      this.stageWidth = stageWidth * 2;
    }
    //为了清晰度 canvas dom 属性宽度是 css 内设置宽度的 2 倍
    this.canvas?.setAttribute("width", this.stageWidth + "");
  }
  private getTimeText(sec: number): string {
    return secondToDate(sec); // `${m}:${s}`
  }
  private drawCyclePointText() {
    if (!this.ctx) {
      return;
    }
    // 同时设置文本白色透明度
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    const timeText = this.getTimeText(this.spaceCycleIndex);
    this.ctx.fillText(timeText, this.lineX + 6, 0);
  }
  private checkIsCyclePoint() {
    return this.spaceFrameIndex % this.spacecycle === 0;
  }
  private drawLine() {
    const isCyclePoint = this.checkIsCyclePoint();
    const lineHeight = isCyclePoint ? this.lineHeight : this.lineShortHeight;
    if (!this.ctx) {
      return;
    }
    this.ctx.fillStyle = isCyclePoint
      ? "rgba(255, 255, 255, 0.2)"
      : "rgba(255, 255, 255, 0.12)";
    this.ctx.fillRect(this.lineX, this.lineY, this.lineWidth, lineHeight);
    if (isCyclePoint) {
      // console.log(this.spaceFrameIndex, this.spacecycle)
      this.drawCyclePointText();
      // 大间隔计数加 1
      this.spaceCycleIndex += this.spaceTimeSecond;
    }

    // 刻度线 x 轴增加
    this.lineX += this.spaceFrameWidth;
    // 刻度累计
    this.spaceFrameIndex++;
    if (this.spaceCycleIndex <= this.totalTime) {
      this.drawLine();
    } else {
      // console.log(this.spaceFrameIndex)
    }
  }
  private redraw() {
    console.log(this.spaceFrameWidth);
    this.clearStage();
    this.drawLine();
  }
  private clearStage() {
    this.ctx?.clearRect(0, 0, this.stageWidth, this.stageHeight);
  }
  private calcZoomRatio() {
    this.zoomRatio = this.spaceFrameWidth / SPACE_FRAME_WIDTH;
  }
  setTotalTime(sec: number){
    this.totalTime = sec
  }
  scrollX(x: number) {
    this.lineX = x;
    this.spaceCycleIndex = 0;
    this.spaceFrameIndex = 0;
    this.redraw();
  }
  zoomIn() {
    // if (this.spaceFrameWidth <= SPACE_FRAME_WIDTH_MIN) {
    //   return;
    // }
    this.lineX = 0;
    this.spaceCycleIndex = 0;
    this.spaceFrameIndex = 0;
    this.spaceFrameWidth -= 1;
    this.calcZoomRatio();
    this.redraw();
  }
  zoomOut() {
    // if (this.spaceFrameWidth >= SPACE_FRAME_WIDTH_MAX) {
    //   return;
    // }
    this.lineX = 0;
    this.spaceCycleIndex = 0;
    this.spaceFrameIndex = 0;
    this.spaceFrameWidth += 1;
    this.calcZoomRatio();
    this.redraw();
  }
}
