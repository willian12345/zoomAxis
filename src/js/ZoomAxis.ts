
//秒转化成 时分秒
function secondToDate(result: number) {
    // var h = Math.floor(result / 3600);
    var m = Math.floor((result / 60 % 60));
    var s = Math.floor((result % 60));
    return `${m}:${s}`
    // return result = h + "小时" + m + "分钟" + s + "秒";
}
export class ZoomAxis{
    canvas?: HTMLCanvasElement|null = null
    ctx?: CanvasRenderingContext2D|null = null
    stageWidth = 600 // 最小宽度 600px 
    stageHeight = 48
    lineColor = 'rgba(255, 255, 255, 0.12)'
    lineWidth = 2  // 刻度线宽度
    lineHeight = 24  // 刻度线高度
    lineShortHeight = 16 // 短刻度线高度
    spacecycle = 10 // 每 10 个最小刻度为一组分割
    spaceCycleIndex = 0 // 刻度大间隔周期累计
    spaceWidth = 80 // 刻度间距
    spaceTimeSecond = 1 // 刻度间隔秒数
    spaceFrameIndex = 0 // 刻度表帧数数计
    lineX = 0
    lineY = 0
    totalTime = 20 // 时间轴总秒数 
    constructor(canvasId: string){
        if(!canvasId){
            return
        }
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
        if(!this.canvas){
            return
        }
        this.setStageWidth()
        
        this.ctx.font = "22px PingFang SC";
        this.ctx.textBaseline = "top"
        this.drawLine()
    }
    setStageWidth(){
        // 获取父级宽度
        const stageWidth = this.canvas?.parentElement?.getBoundingClientRect()?.width
        if(stageWidth){
            this.stageWidth = stageWidth * 2
        }
        //为了清晰度 canvas dom 属性宽度是 css 内设置宽度的 2 倍
        this.canvas?.setAttribute('width', this.stageWidth+'')
    }
    getTimeText(sec: number): string {
        return secondToDate(sec) // `${m}:${s}`
    }
    drawCyclePointText(){
        if(!this.ctx){
            return
        }
        // 同时设置文本白色透明度
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
        const timeText = this.getTimeText(this.spaceCycleIndex)
        this.ctx.fillText(timeText, this.lineX + 6, 0)
    }
    checkIsCyclePoint(){
        return this.spaceFrameIndex % this.spacecycle === 0
    }
    drawLine() {
        const isCyclePoint = this.checkIsCyclePoint()
        const lineHeight = isCyclePoint ? this.lineHeight : this.lineShortHeight
        if(!this.ctx){
            return
        }
        this.ctx.fillStyle = isCyclePoint ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.12)'
        this.ctx.fillRect(this.lineX, this.lineY, this.lineWidth, lineHeight);
        if(isCyclePoint ){
            // console.log(this.spaceFrameIndex, this.spacecycle)
            this.drawCyclePointText()
            // 大间隔计数加 1
            this.spaceCycleIndex += this.spaceTimeSecond
        }
        
        // 刻度线 x 轴增加
        this.lineX += this.spaceWidth
        // 刻度累计
        this.spaceFrameIndex++
        if(this.spaceCycleIndex <= this.totalTime){
            this.drawLine()
        }else{
            console.log(this.spaceFrameIndex)
        }
    }
    redraw(){
        this.spaceCycleIndex = 0
        this.spaceFrameIndex = 0
        this.clearStage()
        this.drawLine()
    }
    scrollLeft(x: number){
        this.lineX = x
        this.redraw()
    }
    clearStage(){
        this.ctx?.clearRect(0, 0, this.stageWidth, this.stageHeight);
    }
}
