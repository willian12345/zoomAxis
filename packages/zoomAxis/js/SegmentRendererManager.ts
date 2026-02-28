import type { ISegmentRendererConstructor } from './TrackType';
/**
 * 用于统一管理节点渲染器
 */
const segmentRenderers = {
  _segmentRenderers:  new Map<string, any>(),
  add(type: number, contentRenderer: any){
    const exist = this._segmentRenderers.get(String(type))
    if(exist){
      console.warn('已存在相同类型的 segment 渲染器 type 类型')
      return;
    }
    this._segmentRenderers.set(String(type), contentRenderer)
  },
  getRenderer(type: number){
    return this._segmentRenderers.get(String(type)) as ISegmentRendererConstructor | undefined
  }
}

export {
  segmentRenderers
}