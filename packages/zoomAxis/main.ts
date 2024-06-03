import './style.css'
import { setupAxis } from './axis'
import 

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="rulers">
    <div class="ruler horizontal">
      <div id="canvasHorizontal"></div>
    </div>
    <div class="ruler vertical">
      <div id="canvasVertical"></div>
    </div>
  </div>
  <div class="intro">
    <h1>刻度轴示例</h1>
    <ul>
      <li>按住ctrl键，滚动滚轮可缩放刻度</li>
      <li>demo/vue3.0 文件夹 时间帧轨道示例项目 vue3.0 版本</li>
      <li>demo/react 文件夹 时间帧轨道示例项目 react 版本</li>
    </ul>
  </div>
`
setTimeout(()=> {
  setupAxis(document.querySelector<HTMLButtonElement>('#canvasHorizontal')!, document.querySelector<HTMLButtonElement>('#canvasVertical')!)
}, 0)

