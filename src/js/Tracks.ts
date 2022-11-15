import {
  TRACKS_EVENT_CALLBACK_TYPES,
  TracksEventCallback,
  DeleteableCheck,
  SegmentType,
  DropableCheck,
  TracksArgs,
  DragingArgs,
  DropArgs,
} from "./TrackType";

import { CursorPointer } from "./CursorPointer";
import { TimelineAxis } from "./TimelineAxis";

import {
  createSegment,
  createSegmentFake,
  getDragTrackCotainer,
  collisionCheckX,
  getLeftValue,
  trackCollisionCheckY,
  isCloseEnouphToY,
  getSegmentPlaceholder,
  isContainSplitFromComma,
  getDatasetNumberByKey,
  sortByLeftValue,
  createSegmentName,
} from "./trackUtils";
// 轨道
export abstract class Tracks{
  abstract destroy(): void
  private dragEndCallback: Set<TracksEventCallback> | null = null
  protected scrollContainer: HTMLElement = {} as HTMLElement
  protected dragoverClass = "dragover"
  protected dragoverErrorClass = "dragover-error"
  protected trackCursor: CursorPointer = {} as CursorPointer
  timeline: TimelineAxis = {} as TimelineAxis
  dropableCheck?: DropableCheck
  deleteableCheck?: DeleteableCheck
  ondragover:any = null
  ondrop:any = null
  framestart = 0
  frameend = 0
  frames = 0
  currentSegment: HTMLElement | null = null
  constructor({
    trackCursor,
    scrollContainer,
    timeline,
    dropableCheck,
    deleteableCheck,
    ondragover,
    ondrop,
  }: TracksArgs) {
    if (!timeline || !scrollContainer || !trackCursor) {
      return;
    }
    this.timeline = timeline;
    this.trackCursor = trackCursor;
    this.scrollContainer = scrollContainer;

    if (dropableCheck) {
      this.dropableCheck = dropableCheck;
    }
    if (deleteableCheck) {
      this.deleteableCheck = deleteableCheck;
    }
    this.ondragover = ondragover
    this.ondrop = ondrop

    this.initEvent();
    return this;
  }
  private initEvent() {
    // 点击轨道外部时清除选中过的 segment 状态
    document.body.addEventListener(
      "click",
      this.removeSegmentActivedStatus.bind(this)
    );
    // Delete 键删除当前选中的 segment
    document.body.addEventListener(
      "keydown",
      this.removeActivedSegment.bind(this)
    );
  }
  addEventListener(
    eventType: TRACKS_EVENT_CALLBACK_TYPES,
    callback: TracksEventCallback
  ) {
    if (eventType === TRACKS_EVENT_CALLBACK_TYPES.DRAG_END) {
      if (!this.dragEndCallback) {
        this.dragEndCallback = new Set();
      }
      this.dragEndCallback.add(callback);
      return;
    }
  }
  removeActivedSegment(event: KeyboardEvent) {
    if (event.key !== "Delete") {
      return;
    }
    this.deleteActivedSegment();
  }
  removeSegmentActivedStatus() {
    this.scrollContainer?.querySelectorAll(".segment").forEach((segment) => {
      segment.classList.remove("actived");
    });
  }
  async deleteActivedSegment() {
    const activedSegment: HTMLElement = this.scrollContainer?.querySelector(
      ".segment.actived"
    ) as HTMLElement;
    if (!activedSegment) {
      return;
    }
    if (this.deleteableCheck) {
      // const trackDom = findParentElementByClassName(activedSegment, 'track');
      const trackId = activedSegment?.dataset.trackId;
      const segmentId = activedSegment.dataset.segmentId;
      if (trackId && segmentId) {
        const result = await this.deleteableCheck(trackId, segmentId);
        if (!result) {
          console.warn("删除失败");
          return;
        }
      }
    }
    activedSegment.parentElement?.removeChild(activedSegment);
    // todo 如果是可伸缩轨道删除，则需要重新伸缩其它segment填满轨道
  }
  unMounted() {
    document.body.removeEventListener(
      "mousedown",
      this.removeSegmentActivedStatus
    );
    document.body.removeEventListener("keydown", this.removeActivedSegment);
    this.destroy()
  }
  private putSegmentBack(
    segment: HTMLElement,
    segmentLeft: number,
    originTrack: HTMLElement
  ) {
    if (originTrack) {
      originTrack.appendChild(segment);
      const placeHolder = getSegmentPlaceholder(originTrack);
      if (!placeHolder) {
        return;
      }
      placeHolder.style.opacity = '0';
      const [isCollistion] = collisionCheckX(placeHolder, originTrack);
      if (!isCollistion) {
        segment.style.left = `${segmentLeft}px`;
      }
    }
  }
  private async copySegment(segmentTrackId: string, framestart: number) {
    let dom: HTMLElement | null = null;
    if (this.dropableCheck) {
      const { dropable, segmentData, segmentName } = await this.dropableCheck(
        segmentTrackId,
        framestart
      );
      if (dropable && segmentData) {
        dom = createSegment(SegmentType.BODY_ANIMATION);
        dom.appendChild(createSegmentName(segmentName));
        framestart = segmentData.startFrame;
        dom.dataset.framestart = `${framestart}`;
        dom.dataset.frameend = `${segmentData.endFrame}`;
        dom.dataset.frames = `${segmentData.endFrame - framestart}`;
        dom.dataset.segmentId = segmentData.sectionId ?? '';
        dom.dataset.trackId = segmentData.trackId ?? '';
      }
    } else {
      dom = createSegment(SegmentType.BODY_ANIMATION);
      dom.dataset.trackId = ''
    }
    return dom;
  }
  private getFramestartByX(x: number): number {
    const frameWidth: number = this.timeline?.frameWidth ?? 0;
    let currentFrame = Math.round(x / frameWidth);
    if (currentFrame < 0) {
      currentFrame = 0;
    }
    return currentFrame;
  }
  private getSegmentLeft(framestart: number): number{
    const frameWidth = this.timeline?.frameWidth ?? 0;
    return framestart * frameWidth;
  }
  protected isStretchTrack(track: HTMLElement){
    const isStretchTrack = track.classList.contains("track-stretch");
    return isStretchTrack;
  }
  protected isStretchSegment(segment: HTMLElement){
    return segment.classList.contains("segment-stretch");
  }
  private async getSegment(copy: boolean, segment:HTMLElement, segmentTrackId: string, framestart: number): Promise<HTMLElement|null>{
    if (copy) {
      return await this.copySegment(segmentTrackId, framestart);
    } else {
      if(!segment.dataset.trackId){
        segment.dataset.trackId = '';
      }
      return segment;
    }
    
  }
  private sliceSegments(track: HTMLElement, currentSegmentId: string, framestart: number, frameend: number){
    console.log(currentSegmentId)
    // 过滤出重叠的 segment (在可伸展轨道)
    let segments = Array.from<HTMLElement>(track.querySelectorAll('.segment'))
    // 如果只有刚拖入的 segment 则不需要客外处理
    if(segments.length === 1){
      return
    }
    segments = segments.filter((segment: HTMLElement) => {
      const segmentFramestart = getDatasetNumberByKey(segment, 'framestart');
      const segmentFrameend = getDatasetNumberByKey(segment, 'frameend');
      // 碰撞检测（通过计算开始帧与结束帧）且不是自身
      if((framestart < segmentFrameend && frameend > segmentFramestart) && segment.dataset.segmentId !== currentSegmentId){
        return true
      }
      return false
    });

    for(let i=0,j=segments.length; i<j;i++){
      const segment: HTMLElement = segments[i];
      let sFramestart = parseFloat(segment.dataset.framestart ?? '0');
      let sFrameend = parseFloat(segment.dataset.frameend ?? '0');
      // 将结束帧移动至 framestart 开始帧
      if(sFrameend > framestart && sFramestart < framestart){
        sFrameend = framestart
        segment.dataset.frameend  = `${framestart}`;
      }else if(sFramestart < frameend && sFrameend > framestart){
        sFramestart = frameend
        segment.dataset.framestart  = `${frameend}`;
      }
      // 如果开始与结束帧相等，说明被完全覆盖需要删除此segment 
      if(sFramestart === sFrameend){
        // delete segment 
        // todo 需要触发删除回调
        segment.parentNode?.removeChild(segment);
      }
      
      this.setSegmentPosition(segment, sFramestart, sFrameend)
    }
  }
  private setSegmentPosition(segment: HTMLElement, framestart:number, frameend: number){
    const segmentLeft = this.getSegmentLeft(framestart);
    segment.style.left = `${segmentLeft}px`;
    const frames = frameend - framestart
    if (this.timeline) {
      segment.style.width = `${this.timeline?.frameWidth * frames}px`;
    }
  }
  private dropToStretchTrack(track: HTMLElement, currentSegment: HTMLElement, framestart: number, isCopySegment: boolean){
    if(isCopySegment){
      track.appendChild(currentSegment);
      const totalFrames = this.timeline?.totalFrames ?? 0
      let frameend = totalFrames
      // 如果轨道内只有一个 segment 则铺满整个轨道
      if(track.querySelectorAll('.segment').length === 1){
        framestart = 0
      }
      currentSegment.dataset.framestart = String(framestart)
      currentSegment.dataset.frameend = String(frameend)
      currentSegment.dataset.trackId = track.dataset.trackId ?? '';
      
      this.setSegmentPosition(currentSegment, framestart, frameend);
      const segmentId = currentSegment.dataset.segmentId ?? '';
      this.sliceSegments(track, segmentId, framestart, frameend);
      this.framestart = framestart
      this.frameend = frameend
    }else{
      const placeHolder = getSegmentPlaceholder(track)
      if(placeHolder){
        this.collisionXstretch(isCopySegment, currentSegment, placeHolder, track, true);
      }
    }
  }
  // 伸缩轨道内拖动
  
  private collisionXstretch(isCopySegment: boolean, currentSegment:HTMLElement, placeholder: HTMLElement, collisionTrack: HTMLElement, isdrop?:boolean){
    if(isCopySegment){
      return;
    }
    let segments = Array.from(collisionTrack.querySelectorAll('.segment')) as HTMLElement[];
    const placeholderLeft = getLeftValue(placeholder);
    const onRightSegments = segments.filter( (segment) => {
      const segmentX = getLeftValue(segment);
      return placeholderLeft < segmentX
    }).sort(sortByLeftValue)
    const onLeftSegments = segments.filter( (segment) => {
      const segmentX = getLeftValue(segment);
      return placeholderLeft > (segmentX + segment.getBoundingClientRect().width * .5)
    }).sort(sortByLeftValue)
    
    for (let segment of onLeftSegments) {
      const segmentFramestart = getDatasetNumberByKey(segment, 'framestart');
      const segmentFrameend = getDatasetNumberByKey(segment, 'frameend');
      // 如果左侧片断的左侧有空格(this.framestart 空格开始帧，this.frameend 空格结束帧)
      if(segmentFramestart > this.framestart){
        // 向左移动一个片断
        const framestartMoved = segmentFramestart - this.frames
        const frameendMoved = segmentFrameend - this.frames
        this.setSegmentPosition(segment, framestartMoved, frameendMoved);
        segment.dataset.framestart = `${framestartMoved}`;
        segment.dataset.frameend = `${frameendMoved}`;
        this.framestart = frameendMoved
        this.frameend = frameendMoved + this.frames
      }
    }
    // 判断右侧片断时，需要先将片断反转从右边头上开始判断一步步向右移动
    for (let segment of onRightSegments.reverse()) {
      const segmentFramestart = getDatasetNumberByKey(segment, 'framestart');
      const segmentFrameend = getDatasetNumberByKey(segment, 'frameend');
      // 如果右侧片断的右侧有空格(this.framestart 空格开始帧，this.frameend 空格结束帧)
      if(segmentFramestart < this.framestart){
        // 向右移动一个片断
        const framestartMoved = segmentFramestart + this.frames
        const frameendMoved = segmentFrameend + this.frames
        this.setSegmentPosition(segment, framestartMoved, frameendMoved);
        segment.dataset.framestart = `${framestartMoved}`;
        segment.dataset.frameend = `${frameendMoved}`;
        this.framestart = segmentFramestart
        this.frameend = segmentFramestart + this.frames;
      }
    }

    if(isdrop){
      this.setSegmentPosition(currentSegment, this.framestart, this.frameend);
      currentSegment.dataset.framestart = `${this.framestart}`;
      currentSegment.dataset.frameend = `${this.frameend}`;
    }
  }
  private draging({
    e, isCopySegment, scrollContainerX, segment, dragTrackContainerRect, tracks
  }: DragingArgs){
    const [collisionY, collisionTrack] = trackCollisionCheckY(
      tracks,
      e.clientY,
    );
    if(collisionTrack){
      // 离轨道足够近
      let placeHolder = getSegmentPlaceholder(collisionTrack);
      collisionTrack.classList.add(this.dragoverClass);
      const trackId = collisionTrack.dataset.trackId ?? '';
      const segmentTrackId = segment.dataset.trackId ?? '';
      // 如果轨道id 与 片断内存的轨道 id 不同，则说明不能拖到这条轨道
      if(!isContainSplitFromComma(trackId, segmentTrackId)){
        collisionTrack.classList.add(this.dragoverErrorClass);
      }
      if(!placeHolder){
        return
      }
      const x = dragTrackContainerRect.left + scrollContainerX
      // 拖动时轨道内占位元素
      placeHolder.style.width = `${dragTrackContainerRect.width}px`;
      placeHolder.style.left = `${
        x
      }px`;
      const isStretchTrack = this.isStretchTrack(collisionTrack);
      if (isStretchTrack) { 
        this.collisionXstretch(isCopySegment, segment, placeHolder, collisionTrack);
      }else{
        // 利用各轨道内的 placeholder 与 轨道内所有现有存 segment进行x轴碰撞检测
        const [isCollistion] = collisionCheckX(placeHolder, collisionTrack);
        // 占位与其它元素如果碰撞则隐藏即不允许拖动到此处
        if (isCollistion) {
          placeHolder.style.opacity = '0';
        } else {
          placeHolder.style.opacity = '1';
        }
      }
    }else{
      // 没发生碰撞则恢复所有默认状态
      tracks.forEach( track => {
        let placeHolder = getSegmentPlaceholder(track);
        if (placeHolder) {
          placeHolder.style.opacity = '0';
        }
        track.classList.remove(this.dragoverClass);
        track.classList.remove(this.dragoverErrorClass);
      })
    }
    
    return collisionY
  }
  private triggerDroped(segment: HTMLElement){
    const segmentId = segment.dataset.segmentId ?? "";
    const trackId = segment.dataset.trackId ?? "";
    const startFrame = getDatasetNumberByKey(segment, 'framestart');
    const endFrame = getDatasetNumberByKey(segment, 'frameend');
    // 拖完后触发回调
    this.dragEndCallback?.forEach((cb) =>
    cb(this, TRACKS_EVENT_CALLBACK_TYPES.DRAG_END, {
      trackId,
      segmentId,
      startFrame,
      endFrame,
    })
  );
  }
  private async drop({
    e, x, segment, track, tracks, isCopySegment
  }: DropArgs){
    let framestart = this.getFramestartByX(x);
    let segmentLeft = this.getSegmentLeft(framestart);
    const placeHolder = getSegmentPlaceholder(track);
    if (!placeHolder) {
      return;
    }
    let dom: HTMLElement | null = null;
    // 轨道 id
    const trackId = track.dataset.trackId ?? "";
    const segmentTrackId = segment.dataset.trackId ?? "";
    // 轨道 id 必须相同才能拖动进去
    if (!isContainSplitFromComma(trackId, segmentTrackId)) {
      return;
    }
    const [isCollistion, magnet, magnetTo] = collisionCheckX(
      placeHolder,
      track
    );

    dom = await this.getSegment(isCopySegment, segment, segmentTrackId, framestart)
    this.currentSegment = dom
    placeHolder.style.opacity = '0';
    if(!dom){
      return
    }
    
    const stretchTrack =  this.isStretchTrack(track);
    
    // 如果是伸展轨道
    if(stretchTrack){
      this.dropToStretchTrack(track, dom, framestart, isCopySegment);
      this.triggerDroped(dom);
      return;
    }
    // 普通轨道
    if (!isCollistion || magnet) {
      track.appendChild(dom);
      // 如果 x 轴磁吸，则需要根据磁吸的 segment 重新计算 framestart 与 segmentLeft 值
      if (magnet && magnetTo) {
        const magnetToRect: DOMRect = magnetTo.getBoundingClientRect();
        const magnetLeft: number = getLeftValue(magnetTo);
        const x = magnetLeft + magnetToRect.width;
        framestart = this.getFramestartByX(x);
        segmentLeft = this.getSegmentLeft(framestart);
      }

      const frames = parseFloat(dom.dataset.frames ?? "30");
      dom.dataset.framestart = `${framestart}`;
      if (!dom.dataset.frameend) {
        const frameend = framestart + 30; // 默认
        dom.dataset.frameend = `${frameend}`;
      } else {
        dom.dataset.frameend = `${framestart + frames}`;
      }
      dom.dataset.trackId = segmentTrackId;
      dom.style.left = `${segmentLeft}px`;
      // todo
      if (this.timeline) {
        dom.style.width = `${this.timeline?.frameWidth * frames}px`;
      }
    }
    this.triggerDroped(dom);
  }
  dragStart(
    e: MouseEvent,
    trackCursor: InstanceType<typeof CursorPointer>,
    scrollContainer: HTMLElement,
    segment: HTMLElement,
    isCopySegment: boolean = false
  ) {
    // segment 拖拽
    if (!scrollContainer) {
      return;
    }
    // 获取所有轨道
    const tracks: HTMLElement[] = Array.from(
      document.querySelectorAll(".track")
    );
    // 全局拖动容器
    const dragTrackContainer = getDragTrackCotainer() as HTMLElement;
    // 拖动前原轨道
    let originTrack: HTMLElement | null = isCopySegment
      ? null
      : segment.parentElement;
    let startX = e.clientX;
    let startY = e.clientY;
    const { left, top } = segment.getBoundingClientRect();
    dragTrackContainer.style.left = `${left}px`;
    dragTrackContainer.style.top = `${top}px`;
    let segmentCopy: HTMLElement;
    const segmentRect = segment.getBoundingClientRect();
    // 如果拖动是复制
    if (isCopySegment) {
      segmentCopy = createSegmentFake(segmentRect);
      dragTrackContainer.appendChild(segmentCopy);
    } else {
      // 将 segment 暂时放到 dragTracContainer 内
      dragTrackContainer.appendChild(segment);
    }

    if(!isCopySegment){
      this.framestart = getDatasetNumberByKey(segment, 'framestart')
      this.frameend = getDatasetNumberByKey(segment, 'frameend')
      this.frames = this.frameend - this.framestart
      // console.log(this.framestart, this.frameend, this.frames);
    }
    
    // 高度变为正在拖动的 segment 高度
    dragTrackContainer.style.height = `${segmentRect.height}px`;
    setTimeout(() => {
      dragTrackContainer.style.transition = "height .2s ease .1s";
    }, 0);

    const scrollContainerRect = scrollContainer.getBoundingClientRect();

    const mousemove = (e: MouseEvent) => {
      // 拖动时拖动的是 dragTrackContainer
      const movedX = e.clientX - startX;
      const movedY = e.clientY - startY;
      const dragTrackContainerRect = dragTrackContainer.getBoundingClientRect();
      let left = dragTrackContainerRect.left + movedX;
      let top = dragTrackContainerRect.top + movedY;
      dragTrackContainer.style.left = `${left}px`;
      dragTrackContainer.style.top = `${top}px`;
      const scrollContainerX = scrollContainer.scrollLeft - scrollContainerRect.left;
      const collisionY = this.draging({e, isCopySegment, scrollContainerX, segment, dragTrackContainerRect, tracks});
      // 拖动容器形变
      if (isCopySegment) {
        // 如果是复制，则需要形变成标准轨道内 segment 形状
        if (collisionY) {
          dragTrackContainer.style.left = `${e.clientX}px`;
          dragTrackContainer.style.top = `${e.clientY - 14}px`;
          dragTrackContainer.style.height = "24px";
        } else {
          dragTrackContainer.style.height = `${segmentRect.height}px`;
        }
      }
      // 游标禁止交互
      trackCursor.enable = false;
      startX = e.clientX;
      startY = e.clientY;
    };

    const mouseup = (e: MouseEvent) => {
      e.stopPropagation();
      startX = e.clientX;
      startY = e.clientY;
      const scrollContainerScrollLeft = scrollContainer.scrollLeft;
      const { left } = dragTrackContainer.getBoundingClientRect();
      dragTrackContainer.style.transition = "none";
      // x = 拖动示意 left - 轨道总体 left 偏移 + 轨道容器 left 滚动偏移
      const x = left - scrollContainerRect.left + scrollContainerScrollLeft;
      
      // 判断所有轨道与鼠标当前Y轴距离
      tracks.forEach(async (track) => {
        track.classList.remove(this.dragoverClass);
        track.classList.remove(this.dragoverErrorClass);
        // 如果足够近代表用户想拖到此轨道上
        if (isCloseEnouphToY(track, e.clientY)) {
          this.drop({e, x, segment, track, tracks, isCopySegment})
        }
        const stretchTrack =  this.isStretchTrack(track);
        
        // 如果是伸展轨道
        if(!isCopySegment && stretchTrack){
          this.setSegmentPosition(segment, this.framestart, this.frameend);
          segment.dataset.framestart = `${this.framestart}`;
          segment.dataset.frameend = `${this.frameend}`;
        }
      });
      
      // 如果没有跨轨道拖动成功，则 x 轴移动
      setTimeout(() => {
        if (dragTrackContainer.children.length) {
          // 如果是复制
          if (isCopySegment) {
            dragTrackContainer.removeChild(segmentCopy);
          }
          originTrack && this.putSegmentBack(segment, getLeftValue(segment), originTrack);
        }
        // 重新允许游标交互
        trackCursor.enable = true;
        // this.triggerDroped(segment)
      }, 0);
      document.removeEventListener("mouseup", mouseup);
      document.removeEventListener("mousemove", mousemove);
    };
    document.addEventListener("mousemove", mousemove);
    document.addEventListener("mouseup", mouseup);
  }
  addSegmentByTrackId(segment: {trackId: string, name: string, framestart: number, frameend: number}, type: SegmentType){
    const tracks: HTMLElement[] = Array.from(
      document.querySelectorAll(".track")
    );
    for(let track of tracks){
      const dataTrackId = track.dataset.trackId ?? ''
      console.log(dataTrackId, segment.trackId)
      if(isContainSplitFromComma(dataTrackId, segment.trackId)){
        const dom = createSegment(type)
        const segmentName = createSegmentName(segment.name)
        dom.appendChild(segmentName)
        this.setSegmentPosition(dom, segment.framestart, segment.frameend);
        dom.dataset.framestart = `${segment.framestart}`;
        dom.dataset.frameend = `${segment.frameend}`;
        track.appendChild(dom);
      }
    }
  }
}
