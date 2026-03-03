import { useRef, useImperativeHandle, forwardRef, LegacyRef } from 'react';
import './cursor.less';
function Cursor(_props: any, ref: LegacyRef<HTMLDivElement> | undefined){
  return (
    <div className='cursor-pointer-header' ref={ref}>
      <div className="cursor-pointer-hd">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className='icon-cursor'>
        <path d="M3 0.75H13C13.1381 0.75 13.25 0.861929 13.25 1V9.58579C13.25 9.65209 13.2237 9.71568 13.1768 9.76256L8.17678 14.7626C8.07915 14.8602 7.92085 14.8602 7.82322 14.7626L2.82322 9.76256C2.77634 9.71568 2.75 9.65209 2.75 9.58579V1C2.75 0.861929 2.86193 0.75 3 0.75Z" stroke="white" fill='white' strokeWidth="1.5"/>
      </svg>
      </div> 
      <div className="cursor-pointer-line"></div>
    </div>
  )
}
export default forwardRef(Cursor)