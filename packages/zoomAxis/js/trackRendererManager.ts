import type { ITrackConstructor } from './TrackType';
/**
 * 用于统一管理轨道
 */
const trackRenderers = {
  _trackRenderers:  new Map<string, any>(),
  add(type: string, contentRenderer: any){
    const exist = this._trackRenderers.get(type)
    if(exist){
      console.warn('已存在相同类型的 segment 渲染器 type 类型')
      return;
    }
    this._trackRenderers.set(type, contentRenderer)
  },
  getTrackRenderer(type: string){
    return this._trackRenderers.get(type)
  }
}

export {
  trackRenderers
}