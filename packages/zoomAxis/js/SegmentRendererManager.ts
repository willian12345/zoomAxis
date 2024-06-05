import type { SegmentRendererConstructor } from './TrackType';
/**
 * 用于统一管理节点渲染器
 */
const segmentRenderers = {
  _segmentRenderers:  new Map<string, SegmentRendererConstructor>(),
  add(type: number, contentRenderer: SegmentRendererConstructor){
    const exist = this._segmentRenderers.get(type)
    if(exist){
      console.warn('已存在相同类型的 segment 渲染器 type 类型')
      return;
    }
    this._segmentRenderers.set(type, contentRenderer)
  },
  getRenderer(type: number){
    return this._segmentRenderers.get(type)
  }
}

export {
  segmentRenderers
}