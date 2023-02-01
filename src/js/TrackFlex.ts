/**
 * Track 基础 dom 结构
 * <div class="track">
 *  <div class="track-placeholder"></div>
 *  <div class="segment"></div>
 * </div>
 */
import { Segment } from './Segment';
import { sortByLeftValue, getDragTrackCotainer } from './trackUtils';

// todo: 需要将轨道内的拖动逻辑抽取至此
interface TrackArgs {
  trackClass?: string
  trackPlaceholderClass?: string
  dom: HTMLElement
}
export class TrackFlex {
  dom = {} as HTMLElement
  trackId = ''
  trackClass = ''
  trackPlaceholderClass = ''
  isStretchTrack = false // 是否是伸缩轨道
  segments: Map<string, Segment> = new Map() // 轨道内的 segment 
  subTracks: Map<string, Track> = new Map() // 子轨道
  framestart = 0
  frameend = 0
  originFramestart = 0
  frames = 0
  originFrameend = 0
  constructor({
    trackClass = 'track', 
    trackPlaceholderClass = 'track-placeholder' ,
    dom
  }: TrackArgs) {
    this.trackClass = trackClass
    this.trackPlaceholderClass = trackPlaceholderClass
    // todo: dom 抽取至此类中
    this.dom = dom;
    this.trackId = dom.dataset.trackId ?? ''
    this.isStretchTrack = dom.classList.contains("track-stretch");
    this.initEvents();
  }
  initEvents(){
    // 代理 segment 鼠标事件
    this.dom.addEventListener("mousedown", this.mousedown.bind(this));
    this.dom.addEventListener("mouseup", this.mouseup.bind(this));
  }
  mousedown(e: MouseEvent){
    const target = e.target as HTMLElement;
    // 右健点击忽略
    if(e.button === 2){
      return;
    }
    if (!target) {
      return;
    }
    if (!target.classList.contains("segment")) {
      return;
    }
    this.dragStart(e, target);
  }
  mouseup(e: MouseEvent){
    //: todo
  }
  mousemove(){

  }
  dragStart(
    e: MouseEvent,
    segmentDom: HTMLElement,
  ) {
    // segment 拖拽
    const segment = this.getSegmentById(segmentDom.dataset.segmentId ?? '');
    if(!segment) return;
    // 全局拖动容器
    const dragTrackContainer = getDragTrackCotainer() as HTMLElement;
    // 拖动前原轨道
    // let originTrack: Track | null = segment.parentTrack;
    let startX = e.clientX;
    let startY = e.clientY;
    const { left, top } = segment.getBoundingClientRect();
    dragTrackContainer.style.left = `${left}px`;
    dragTrackContainer.style.top = `${top}px`;
    // const segmentRect = segment.dom.getBoundingClientRect();
    // 将 segment 暂时放到 dragTracContainer 内
    dragTrackContainer.appendChild(segment.dom);
    this.framestart = segment.framestart;
    this.frameend = segment.frameend;
    this.frames = this.frameend - this.framestart;
    this.originFramestart = segment.framestart;
    this.originFrameend = segment.frameend;

    // // 高度变为正在拖动的 segment 高度
    // dragTrackContainer.style.height = `${segmentRect.height}px`;
    // setTimeout(() => {
    //   dragTrackContainer.style.transition = "height .2s ease .1s";
    // }, 0);

    // const scrollContainerRect = scrollContainer.getBoundingClientRect();

    // const mousemove = (e: MouseEvent) => {
    //   // 拖动时拖动的是 dragTrackContainer
    //   const movedX = e.clientX - startX;
    //   const movedY = e.clientY - startY;
    //   const dragTrackContainerRect = dragTrackContainer.getBoundingClientRect();
    //   let left = dragTrackContainerRect.left + movedX;
    //   let top = dragTrackContainerRect.top + movedY;
    //   dragTrackContainer.style.left = `${left}px`;
    //   dragTrackContainer.style.top = `${top}px`;
    //   const scrollContainerX =
    //     scrollContainer.scrollLeft - scrollContainerRect.left;
    //   const collisionY = this.draging({
    //     e,
    //     isCopySegment,
    //     scrollContainerX,
    //     segment,
    //     dragTrackContainerRect,
    //     tracks,
    //   });
    //   // 拖动容器形变
    //   if (isCopySegment) {
    //     // 如果是复制，则需要形变成标准轨道内 segment 形状
    //     if (collisionY) {
    //       dragTrackContainer.style.left = `${e.clientX}px`;
    //       dragTrackContainer.style.top = `${e.clientY - 14}px`;
    //       dragTrackContainer.style.height = "24px";
    //     } else {
    //       dragTrackContainer.style.height = `${segmentRect.height}px`;
    //     }
    //   }
    //   startX = e.clientX;
    //   startY = e.clientY;
    // };

    // const mouseup = (e: MouseEvent) => {
    //   e.stopPropagation();
    //   startX = e.clientX;
    //   startY = e.clientY;
    //   const scrollContainerScrollLeft = scrollContainer.scrollLeft;
    //   const { left } = dragTrackContainer.getBoundingClientRect();
    //   dragTrackContainer.style.transition = "none";
    //   // x = 拖动示意 left - 轨道总体 left 偏移 + 轨道容器 left 滚动偏移
    //   const x = left - scrollContainerRect.left + scrollContainerScrollLeft;
    //   // 判断所有轨道与鼠标当前Y轴距离
    //   tracks.forEach(async (track) => {
    //     track.classList.remove(this.dragoverClass);
    //     track.classList.remove(this.dragoverErrorClass);
    //     // 如果足够近代表用户想拖到此轨道上
    //     if (isCloseEnouphToY(track, e.clientY)) {
    //       this.drop({ e, x, segment, track, tracks, isCopySegment });
    //     }
    //     const stretchTrack = this.isStretchTrack(track);
    //     // 如果是伸展轨道拖动有可能导致的位置变换， 则需要设置当前开始帧与结束帧位置
    //     if (!isCopySegment && stretchTrack && virtualSegment) {
    //       virtualSegment.setRange(this.framestart, this.frameend);
    //     }
    //   });

    //   // 如果没有跨轨道拖动成功，则 x 轴移动
    //   setTimeout(() => {
    //     if (dragTrackContainer.children.length) {
    //       // 如果是复制
    //       if (isCopySegment) {
    //         dragTrackContainer.removeChild(segmentCopy);
    //       }
    //       if (originTrack) {
    //         this.putSegmentBack(segment, getLeftValue(segment), originTrack);
    //       }
    //     }
    //     // 重新允许游标交互
    //     trackCursor.enable = true;
    //     this.originFramestart = 0;
    //     this.originFrameend = 0;
    //   }, 0);
      
    //   document.removeEventListener("mouseup", mouseup);
    //   document.removeEventListener("mousemove", mousemove);
    // };
    // document.addEventListener("mousemove", mousemove);
    // document.addEventListener("mouseup", mouseup);
  }
  addSegment(segment: Segment){
    this.segments.set(segment.segmentId, segment);
    this.dom.appendChild(segment.dom);
    segment.setTrack(this);
  }
  removeSegment(segment: Segment){
    this.segments.delete(segment.segmentId);
    segment.dom.parentElement?.removeChild(segment.dom);
  }
  // 获取非 segmentId 之外的所有 segment
  getOtherSegments(segmentId: string){
    const segments = this.getSegments();
    return segments.filter( segment => segment.segmentId !== segmentId)
  }
  getSegments(){
    let result: Segment[] = Array.from(this.segments.values())
    if(this.subTracks){
      for(const [_, subtrack] of this.subTracks){
        result = [...result, ...subtrack.getSegments()];
      }
    }
    return result;
  }
  getSegmentById(segmentId: string){
    return this.getSegments().find( segment => segment.segmentId === segmentId);
  }
  getLastSegment(){
    // 根据 frameend 值排序后获取最后一个 Segment
    const segments = this.getSegments().sort((a, b)=> {
      // b 排在 a 后
      if(a.frameend < b.frameend){
        return -1
      }
      // b 排在 a 前
      if(a.frameend > b.frameend){
        return 1;
      }
      return  0;
    });
    return segments[segments.length - 1];
  }
  updateSegmentHandler(){
    if(!this.isStretchTrack) return;
    const segments = this.getSegments().sort(sortByLeftValue);
    // 如果只有一个 segment 则不允许左右手柄拖动
    if (segments.length === 1) {
      return segments[0].setHandleEnable(false, false);
    }
    const l = segments.length - 1
    segments.forEach( (segment, index) => {
      if(index === 0){
        // 最左侧不允许拖动
        return segment.setHandleEnable(false, true);
      }
      if(l === index){
        // 最右侧手柄不允许拖动
        return segment.setHandleEnable(true, false);
      }
      segment.setHandleEnable(true, true)
    });
  }
}