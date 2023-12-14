import { EventHelper } from "./EventHelper";
const SCALE_FRAME_WIDTH = 80; // 刻度间距

// 缩放值与对应的时间刻度周期
const DEFAULT_RATIO_STEP: number[][] = [
  [0.1, 5], // 刻度周期 5 秒
  [0.2, 4], // 刻度周期 4 秒
  [0.7, 3], // 刻度周期 3 秒
  [0.8, 2], // etc...
  [0.9, 1],
];

export interface IZoomAxis {
  el: string | HTMLElement;
  tickMarks: number;
  vertical?: boolean;
  stageWidth?: number;
  ratio?: number;
  ratioMap?: number[][];
}

function toFixedToN(num: string, n = 2) {
  let len = num.length;
  while (len < n) {
    num = "0" + num;
    len++;
  }
  return num;
}
//秒转化成 分秒
export function millisecondToSecond(interval: number) {
  //格式化时间
  interval = interval >> 0;
  const minute = (interval / 60) >> 0;
  const second = toFixedToN(String(interval % 60));
  return `${minute}:${second}`;
}
//保留n位小数
export function roundFun(value: number, n: number) {
  return Math.round(value * Math.pow(10, n)) / Math.pow(10, n);
}
export class ZoomAxis extends EventHelper {
  private canvas?: HTMLCanvasElement = {} as HTMLCanvasElement;
  private ctx?: CanvasRenderingContext2D = {} as CanvasRenderingContext2D;
  dpr = (window.devicePixelRatio ?? 1) * 2;
  vertical = false;
  private stageWidth = 600; // 最小宽度 600px
  private stageHeightOut = 24;
  private stageHeight = this.stageHeightOut * this.dpr;
  private lineColor = "rgba(255, 255, 255, 0.12)";
  private lineColorPrimary = "rgba(255, 255, 255, 0.2)";
  private textColor = "rgba(255, 255, 255, 0.35)";
  private lineWidth = 2; // 刻度线宽度
  private lineHeight = 24; // 刻度线高度
  private lineShortHeight = 16; // 短刻度线高度
  scaleCycle = 10; // 默认每 10 个最小刻度为一组分割
  private scaleCycleIndex = 0; // 刻度大间隔周期累计
  scaleTimeSecond = 1; // 刻度间隔秒数单位（一个周期时间单位）
  private markIndex = 0; // 刻度表帧数数计
  private lineX = 0;
  private lineY = 0;
  private ratioMap = new Map();
  protected _markWidth = SCALE_FRAME_WIDTH; // 刻度间距
  tickMarks = 0;
  get markWidth(): number {
    return this._markWidth * 0.5; // 刻度实际显示像素
  }
  zoomRatio = 1; // 缩放比例
  width = 600; // 标尺总宽度

  constructor({
    el,
    tickMarks,
    ratio,
    ratioMap,
    stageWidth,
    vertical = false,
  }: IZoomAxis) {
    super();
    if (!el) {
      console.warn("挂载对象 id 必传");
      return;
    }
    this.vertical = vertical;
    this.canvas = this.createStage(el);
    if (!this.canvas) {
      console.warn("创建canvas失败");
      return;
    }
    this.setRatioStep(ratioMap);
    this.setStageWidth(stageWidth);

    this.initCanvas();
    this.tickMarks = tickMarks;
    if (ratio !== undefined) {
      this.zoomRatio = ratio;
    }
    this.zoomByRatio();

    this.drawLine();
  }
  initCanvas() {
    if (!this.canvas) {
      return;
    }
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    this.ctx.font = "22px PingFang SC";
    this.ctx.textBaseline = "top";
  }
  setScaleCycle(cycle: number) {
    this.scaleCycle = cycle;
  }
  // 设置缩放等级对应缩放显示时间
  setRatioStep(ratioMap: number[][] = DEFAULT_RATIO_STEP) {
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
        height: ${this.stageHeightOut}px;
        vertical-align: middle;
      " height="${this.stageHeight}"></canvas>`;
    const canvas = div.querySelector("canvas") as HTMLCanvasElement;
    elHook.replaceWith(canvas);
    return canvas;
  }
  // 设置舞台宽度
  private setStageWidth(stageWidth?: number) {
    // 获取父级宽度
    if (stageWidth === undefined) {
      const parentDomRect = this.canvas?.parentElement?.getBoundingClientRect();
      stageWidth = this.vertical ? parentDomRect?.height : parentDomRect?.width;
    }

    if (stageWidth) {
      this.stageWidth = stageWidth * this.dpr;
    }
    //为了清晰度 canvas dom 属性宽度是 css 内设置宽度的 2 倍
    this.canvas?.setAttribute("width", this.stageWidth + "");
  }
  private setWidth() {
    // 总宽度 = 总秒数/时间间隔 * 每刻度宽度 * 多少个周期 + 额外加一个周期的宽度用于显示尾部
    this.width = this.tickMarks * this._markWidth;
  }
  // 转换显示分:秒
  private getTimeText(sec: number): string {
    return millisecondToSecond(sec); // `${m}:${s}`
  }
  // 显示周期标尺上的分秒文本
  private drawCyclePointText() {
    if (!this.ctx) {
      return;
    }
    // 同时设置文本白色透明度
    this.ctx.fillStyle = this.textColor;
    const timeText = this.getTimeText(this.scaleCycleIndex);
    this.ctx.textAlign = "left";
    this.ctx.fillText(timeText, this.lineX + 6, 0);
  }
  // 是否处于周期值
  private checkIsCyclePoint() {
    return this.markIndex % this.scaleCycle === 0;
  }
  // 绘制刻度线
  private drawLine() {
    if (!this.ctx) {
      return;
    }
    if (this.markIndex > this.tickMarks) {
      return;
    }
    // !!此处不能用递归数量超过 8000 后会 RangeError: Maximum call stack size exceeded
    // 直接用简单的 for 循环
    for (let i = 0; i <= this.tickMarks; i++) {
      const isCyclePoint = this.checkIsCyclePoint();
      const lineHeight = isCyclePoint ? this.lineHeight : this.lineShortHeight;

      this.ctx.fillStyle = isCyclePoint
        ? this.lineColorPrimary
        : this.lineColor;
      this.ctx.fillRect(this.lineX, this.lineY, this.lineWidth, lineHeight);
      // 如果处于标尺周期，则要显示分:秒，且刻度线更长一些
      if (isCyclePoint) {
        this.drawCyclePointText();
        // 大间隔计数加 1
        this.scaleCycleIndex += this.scaleTimeSecond;
      }

      // 刻度线 x 轴增加
      this.lineX += this._markWidth;
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
    this._markWidth = SCALE_FRAME_WIDTH * this.zoomRatio;
    this.setWidth();
    const ratio = roundFun(this.zoomRatio, 1);
    // 每个刻度周期时间显示单位分成几档
    const scaleTimeSecond = this.ratioMap.get(ratio);
    // 如果没有对应预设的值，则周期不变
    if (scaleTimeSecond) {
      this.scaleTimeSecond = scaleTimeSecond;
    }
  }
  private resetToDraw() {
    this.lineX = 0;
    this.scaleCycleIndex = 0;
    this.markIndex = 0;
  }
  /**
   * 设置总刻度数
   * @param marksNum
   */
  setTickMarks(marksNum: number) {
    this.tickMarks = marksNum;
    this.resetToDraw();
    this.redraw();
  }
  scrollLeft(left: number) {
    this.resetToDraw();
    this.lineX = left * this.dpr; // canvas 内所有物体都是 dpr 倍，所以 left 需要被放大 dpr 倍
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
    this.resetToDraw();
    this.lineX = -x;
    this.redraw();
  }
  zoomIn() {
    if (this.zoomRatio <= 0.1) {
      return;
    }
    this.resetToDraw();
    this.zoomRatio = roundFun(this.zoomRatio - 0.1, 2);
    this.zoomByRatio();
    this.redraw();
  }
  zoomOut() {
    if (this.zoomRatio > 1.2) {
      return;
    }
    this.resetToDraw();
    this.zoomRatio = roundFun(this.zoomRatio + 0.1, 2);
    this.zoomByRatio();
    this.redraw();
  }
  zoom(ratio: number) {
    this.zoomRatio = ratio;
    this.resetToDraw();
    this.zoomByRatio();
    this.redraw();
  }
  resizeStage(stageWidth: number) {
    this.setStageWidth(stageWidth);
    // 由于修改了canvas width
    // 必须重新获取 ctx 否则文本可能会渲染不出来
    this.initCanvas();
    this.resetToDraw();
    this.redraw();
  }
}
