const SPACE_FRAME_WIDTH = 80; // 刻度间距
const SPACE_FRAME_WIDTH_MIN = 8; // 刻度最小间距
const SPACE_FRAME_WIDTH_MAX = 100; // 刻度最大间距

// 默认
const DEFAULT_RATIO_STEP: number[][] = [
  [0.1, 10],
  [0.2, 5],
  [0.7, 3],
  [0.8, 2],
  [0.9, 1],
];

export interface ZoomAxisArgs {
  el: string | HTMLElement;
  totalMarks: number;
  ratioMap?: number[][];
}

//秒转化成 时分秒
export function secondToDate(result: number) {
  // var h = Math.floor(result / 3600);
  var m = Math.floor((result / 60) % 60);
  var s = Math.floor(result % 60);
  return `${m}:${s}`;
}

//保留n位小数
export function roundFun(value: number, n: number) {
  return Math.round(value * Math.pow(10, n)) / Math.pow(10, n);
}
export class ZoomAxis {
  private canvas?: HTMLCanvasElement | null = null;
  private ctx?: CanvasRenderingContext2D | null = null;
  private stageWidth = 600; // 最小宽度 600px
  private stageHeightOut = 24;
  private stageHeight = this.stageHeightOut * 2;
  private lineColor = "rgba(255, 255, 255, 0.12)";
  private lineWidth = 2; // 刻度线宽度
  private lineHeight = 24; // 刻度线高度
  private lineShortHeight = 16; // 短刻度线高度
  private spacecycle = 10; // 每 10 个最小刻度为一组分割
  private spaceCycleIndex = 0; // 刻度大间隔周期累计
  private spaceTimeSecond = 1; // 刻度间隔秒数单位（一个周期时间单位）
  private markIndex = 0; // 刻度表帧数数计
  private lineX = 0;
  private lineY = 0;
  private ratioMap = new Map();
  totalMarks = 0;
  markWidth = SPACE_FRAME_WIDTH; // 刻度间距
  zoomRatio = 1; // 缩放比例
  width = 600; // 标尺总宽度
  currentFrame = 0; // 当前帧
  totalFrames = 0; // 全部帧数
  frameRate = 30; // 帧频

  constructor({ el, totalMarks, ratioMap }: ZoomAxisArgs) {
    if (!el) {
      console.warn("挂载对象 id 必传");
      return;
    }
    this.canvas = this.createStage(el);
    if (!this.canvas) {
      console.warn("创建canvas失败");
      return;
    }
    this.setRatioStep(ratioMap);
    this.setStageWidth();

    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    this.ctx.font = "22px PingFang SC";
    this.ctx.textBaseline = "top";
    this.totalMarks = totalMarks
    this.setWidth();

    this.drawLine();
    
  }
  // 设置缩放等级对应缩放显示时间
  private setRatioStep(ratioMap: number[][] = DEFAULT_RATIO_STEP) {
    this.ratioMap.clear();
    ratioMap.forEach((element) => {
      this.ratioMap.set(element[0], element[1]);
    });
  }
  // 创建舞台
  private createStage(el: string | HTMLElement) {
    const elHook =
      typeof el === "string"
        ? (document.getElementById(el) as HTMLCanvasElement)
        : el;
    if (!elHook) {
      console.warn(`找不到id为${el}的 HTML元素挂载`);
      return;
    }
    const div = document.createElement("div");
    div.innerHTML = `<canvas style="
        width: 100%;
        height: ${this.stageHeightOut}px;
        vertical-align: middle;
      " height="${this.stageHeight}"></canvas>`;
    const canvas = div.querySelector("canvas") as HTMLCanvasElement;
    elHook.replaceWith(canvas);
    return canvas;
  }
  // 设置舞台宽度
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
  private setWidth() {
    // 总宽度 = 总秒数/时间间隔 * 每刻度宽度 * 多少个周期 + 额外加一个周期的宽度用于显示尾部
    this.width = this.totalMarks * this.markWidth
  }
  // 转换显示分:秒
  private getTimeText(sec: number): string {
    return secondToDate(sec); // `${m}:${s}`
  }
  // 显示周期标尺上的分秒文本
  private drawCyclePointText() {
    if (!this.ctx) {
      return;
    }
    // 同时设置文本白色透明度
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    const timeText = this.getTimeText(this.spaceCycleIndex);
    this.ctx.fillText(timeText, this.lineX + 6, 0);
  }
  // 是否处于周期值
  private checkIsCyclePoint() {
    return this.markIndex % this.spacecycle === 0;
  }
  // 绘制刻度线
  private drawLine() {
    if (!this.ctx) {
      return;
    }
    if (this.markIndex > this.totalMarks) {
      return
    }
    // !!此处不能用递归数量超过 8000 后会 RangeError: Maximum call stack size exceeded
    // 直接用简单的 for 循环
    for(let i=0; i <= this.totalMarks; i++){
      const isCyclePoint = this.checkIsCyclePoint();
      const lineHeight = isCyclePoint ? this.lineHeight : this.lineShortHeight;

      this.ctx.fillStyle = isCyclePoint
        ? "rgba(255, 255, 255, 0.2)"
        : "rgba(255, 255, 255, 0.12)";
      this.ctx.fillRect(this.lineX, this.lineY, this.lineWidth, lineHeight);
      // 如果处于标尺周期，则要显示分:秒，且刻度线更长一些
      if (isCyclePoint) {
        this.drawCyclePointText();
        // 大间隔计数加 1
        this.spaceCycleIndex += this.spaceTimeSecond;
      }

      // 刻度线 x 轴增加
      this.lineX += this.markWidth;
      // 刻度累计
      this.markIndex++;
    }
  }
  private redraw() {
    this.clearStage();
    this.drawLine();
  }
  private clearStage() {
    this.ctx?.clearRect(0, 0, this.stageWidth, this.stageHeight);
  }
  // 按比例缩放刻度
  private zoomByRatio() {
    this.markWidth = SPACE_FRAME_WIDTH * this.zoomRatio;
    this.setWidth();
    const ratio = roundFun(this.zoomRatio, 1);
    // 时间显示单位 分成好几档
    const spaceTimeSecond = this.ratioMap.get(ratio);
    if (spaceTimeSecond) {
      this.spaceTimeSecond = spaceTimeSecond;
    }
  }
  
  /**
   * 设置总刻度数
   * @param marksNum
   */
  setTotalMarks(marksNum: number) {
    this.totalMarks = marksNum;
  }
  scrollLeft(left: number){
    this.lineX = left;
    this.spaceCycleIndex = 0;
    this.markIndex = 0;
    this.redraw();
  }
  /**
   *
   * @param scrollRatio  滚动条滚动比例
   * @returns
   */
  scrollByRatio(scrollRatio: number) {
    // 如果实际尺子宽度小于舞台(窗口)宽度,不需要再滚动
    if (this.width <= this.stageWidth) {
      return;
    }
    // 实际尺子宽度 - 舞台宽度 * 缩放比例
    const x = (this.width - this.stageWidth) * scrollRatio;
    this.lineX = -x;
    this.spaceCycleIndex = 0;
    this.markIndex = 0;
    this.redraw();
  }
  zoomIn() {
    if (this.zoomRatio <= 0.1) {
      return;
    }
    this.lineX = 0;
    this.spaceCycleIndex = 0;
    this.markIndex = 0;
    this.zoomRatio = roundFun(this.zoomRatio - 0.1, 2);
    this.zoomByRatio();
    this.redraw();
  }
  zoomOut() {
    if (this.zoomRatio > 1.2) {
      return;
    }
    this.lineX = 0;
    this.spaceCycleIndex = 0;
    this.markIndex = 0;
    this.zoomRatio = roundFun(this.zoomRatio + 0.1, 2);
    this.zoomByRatio();
    this.redraw();
  }
}
