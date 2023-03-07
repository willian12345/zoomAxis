/**
 * 自定义渲染函数
 */
import { SegmentType, SegmentConstructInfo } from './TrackType';

const  getAvatarRenderer = (name: string) => {
  return `
  <div class="flex items-center text-12">
  <svg width="24" height="24" viewBox="0 0 24 24" class="ml-6">
  <path fill-rule="evenodd" clip-rule="evenodd" d="M6 3.5H18C19.3807 3.5 20.5 4.61929 20.5 6V18C20.5 19.1715 19.6941 20.1549 18.6065 20.4259L18.2127 18.8507C17.682 16.7278 16.126 15.0767 14.1526 14.372C15.2635 13.6613 16 12.4167 16 11C16 8.79086 14.2091 7 12 7C9.79083 7 7.99997 8.79086 7.99997 11C7.99997 12.4167 8.73644 13.6613 9.84741 14.372C7.87401 15.0767 6.31808 16.7278 5.78736 18.8507L5.39355 20.4259C4.30588 20.1549 3.5 19.1716 3.5 18V6C3.5 4.61929 4.61929 3.5 6 3.5ZM6.9212 20.5H17.0789L16.7575 19.2145C16.2117 17.0315 14.2503 15.5 12 15.5C9.7498 15.5 7.78833 17.0315 7.24257 19.2145L6.9212 20.5ZM5.02968 21.8815C3.28941 21.4479 2 19.8745 2 18V6C2 3.79086 3.79086 2 6 2H18C20.2091 2 22 3.79086 22 6V18C22 19.8745 20.7106 21.4478 18.9704 21.8815C18.9481 21.887 18.9258 21.8924 18.9033 21.8976C18.6131 21.9646 18.3107 22 18 22M14.5 11C14.5 12.3807 13.3807 13.5 12 13.5C10.6193 13.5 9.49997 12.3807 9.49997 11C9.49997 9.61929 10.6193 8.5 12 8.5C13.3807 8.5 14.5 9.61929 14.5 11Z" />
  </svg>
  <div class="segment-name">${name}</div>
  </div>
`
}
const  getBodyAnimationRenderer = (name: string) => {
  return `
  <div class="flex items-center text-12">
    <svg width="24" height="24" viewBox="0 0 24 24" class="ml-6" >
    <path fill-rule="evenodd" clip-rule="evenodd" d="M16.5 5.5C16.5 6.60457 15.6046 7.5 14.5 7.5C13.3955 7.5 12.5 6.60457 12.5 5.5C12.5 4.39543 13.3955 3.5 14.5 3.5C15.6046 3.5 16.5 4.39543 16.5 5.5ZM18 5.5C18 7.433 16.433 9 14.5 9C12.567 9 11 7.433 11 5.5C11 3.567 12.567 2 14.5 2C16.433 2 18 3.567 18 5.5ZM6.37035 11.5071C6.92467 10.5833 8.05609 10.1821 9.06861 10.5503L11.4882 11.4301L9.81863 15.1865C9.81574 15.1928 9.81295 15.1991 9.81025 15.2054L9.51476 15.8702C8.76224 17.5634 6.74867 18.2858 5.09143 17.4572L3.83545 16.8292C3.46497 16.6439 3.01446 16.7941 2.82922 17.1646C2.64398 17.5351 2.79415 17.9856 3.16463 18.1708L4.42061 18.7988C6.82888 20.0029 9.75201 18.966 10.8664 16.5217L12.4813 17.3292C13.5927 17.8849 14.0432 19.2364 13.4875 20.3479L12.8292 21.6646C12.6439 22.0351 12.7941 22.4856 13.1646 22.6708C13.5351 22.8561 13.9856 22.7059 14.1708 22.3354L14.8292 21.0187C15.7554 19.1663 15.0045 16.9137 13.1521 15.9875L11.4765 15.1497L12.9013 11.9439L15.5293 12.8996C17.1541 13.4904 18.9721 12.8939 19.9311 11.4555L20.624 10.416C20.8538 10.0714 20.7606 9.60572 20.416 9.37596C20.0713 9.1462 19.6057 9.23933 19.3759 9.58398L18.683 10.6234C18.1076 11.4865 17.0168 11.8444 16.0419 11.4899L12.762 10.2972L12.7492 10.2926L9.58122 9.14056C7.8937 8.52692 6.008 9.19565 5.08412 10.7354L4.85687 11.1141C4.64375 11.4693 4.75892 11.93 5.1141 12.1431C5.46928 12.3562 5.92998 12.2411 6.14309 11.8859L6.37035 11.5071Z"  />
    </svg>
  <div class="segment-name">${name}</div>
  </div>
`
}
const getFaceAnimationRenderer = (name: string) => {
  return  `
    <div class="flex items-center text-12">
      <svg width="24" height="24" viewBox="0 0 24 24" class="ml-6">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M21.5 12C21.5 17.2467 17.2467 21.5 12 21.5C6.75329 21.5 2.5 17.2467 2.5 12C2.5 6.75329 6.75329 2.5 12 2.5C17.2467 2.5 21.5 6.75329 21.5 12ZM23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12ZM8.81802 15.182C8.52513 14.8891 8.05025 14.8891 7.75736 15.182C7.46447 15.4749 7.46447 15.9497 7.75736 16.2426C8.88258 17.3679 10.4087 18 12 18C13.5913 18 15.1174 17.3679 16.2426 16.2426C16.5355 15.9497 16.5355 15.4749 16.2426 15.182C15.9497 14.8891 15.4749 14.8891 15.182 15.182C14.3381 16.0259 13.1935 16.5 12 16.5C10.8065 16.5 9.66193 16.0259 8.81802 15.182ZM10 9.5C10 10.3284 9.32843 11 8.5 11C7.67157 11 7 10.3284 7 9.5C7 8.67157 7.67157 8 8.5 8C9.32843 8 10 8.67157 10 9.5ZM15.5 11C16.3284 11 17 10.3284 17 9.5C17 8.67157 16.3284 8 15.5 8C14.6716 8 14 8.67157 14 9.5C14 10.3284 14.6716 11 15.5 11Z"/>
      </svg>
      <div class="segment-name">${name}</div>
    </div>
  `
}
const getVoiceRenderer = (name: string) => {
  return  `
    <div class="flex items-center text-12 w-full">
      <svg width="24" height="24" viewBox="0 0 24 24" class="ml-6">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M21.5 12C21.5 17.2467 17.2467 21.5 12 21.5C6.75329 21.5 2.5 17.2467 2.5 12C2.5 6.75329 6.75329 2.5 12 2.5C17.2467 2.5 21.5 6.75329 21.5 12ZM23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12ZM8.81802 15.182C8.52513 14.8891 8.05025 14.8891 7.75736 15.182C7.46447 15.4749 7.46447 15.9497 7.75736 16.2426C8.88258 17.3679 10.4087 18 12 18C13.5913 18 15.1174 17.3679 16.2426 16.2426C16.5355 15.9497 16.5355 15.4749 16.2426 15.182C15.9497 14.8891 15.4749 14.8891 15.182 15.182C14.3381 16.0259 13.1935 16.5 12 16.5C10.8065 16.5 9.66193 16.0259 8.81802 15.182ZM10 9.5C10 10.3284 9.32843 11 8.5 11C7.67157 11 7 10.3284 7 9.5C7 8.67157 7.67157 8 8.5 8C9.32843 8 10 8.67157 10 9.5ZM15.5 11C16.3284 11 17 10.3284 17 9.5C17 8.67157 16.3284 8 15.5 8C14.6716 8 14 8.67157 14 9.5C14 10.3284 14.6716 11 15.5 11Z"/>
      </svg>
      <div class="segment-name flex-1">${name}</div>
      <svg width="68" height="18" viewBox="0 0 68 18" style="width: 68px;" class="text-18 mr-6">
        <g opacity="0.4">
        <path opacity="0.2" d="M1 8.5V9.5" stroke="white" stroke-linecap="round"/>
        <path opacity="0.4" d="M4 8V10" stroke="white" stroke-linecap="round"/>
        <path opacity="0.6" d="M7 7V11" stroke="white" stroke-linecap="round"/>
        <path opacity="0.8" d="M10 5V13" stroke="white" stroke-linecap="round"/>
        <path d="M13 7V11" stroke="white" stroke-linecap="round"/>
        <path opacity="0.8" d="M16 8V10" stroke="white" stroke-linecap="round"/>
        <path opacity="0.6" d="M19 8.5V9.5" stroke="white" stroke-linecap="round"/>
        <path opacity="0.4" d="M22 8V10" stroke="white" stroke-linecap="round"/>
        <path opacity="0.2" d="M25 8.5V9.5" stroke="white" stroke-linecap="round"/>
        <path opacity="0.4" d="M28 8V10" stroke="white" stroke-linecap="round"/>
        <path opacity="0.6" d="M31 7V11" stroke="white" stroke-linecap="round"/>
        <path opacity="0.8" d="M34 5V13" stroke="white" stroke-linecap="round"/>
        <path d="M37 7V11" stroke="white" stroke-linecap="round"/>
        <path opacity="0.8" d="M40 8V10" stroke="white" stroke-linecap="round"/>
        <path opacity="0.6" d="M43 8.5V9.5" stroke="white" stroke-linecap="round"/>
        <path opacity="0.4" d="M46 8V10" stroke="white" stroke-linecap="round"/>
        <path opacity="0.2" d="M49 8.5V9.5" stroke="white" stroke-linecap="round"/>
        <path opacity="0.4" d="M52 8V10" stroke="white" stroke-linecap="round"/>
        <path opacity="0.6" d="M55 7V11" stroke="white" stroke-linecap="round"/>
        <path opacity="0.8" d="M58 5V13" stroke="white" stroke-linecap="round"/>
        <path d="M61 7V11" stroke="white" stroke-linecap="round"/>
        <path opacity="0.8" d="M64 8V10" stroke="white" stroke-linecap="round"/>
        <path opacity="0.4" d="M67 8.5V9.5" stroke="white" stroke-linecap="round"/>
        </g>
      </svg>
    </div>
  `
}
const getEffectRenderer = (name: string) => {
  return  `
    <div class="flex items-center text-12">
      <svg width="24" height="24" viewBox="0 0 24 24" class="ml-6">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M13.624 3.0314C13.0361 1.56758 10.9639 1.56758 10.376 3.0314L8.69309 7.22232C8.65733 7.31137 8.57375 7.37209 8.47801 7.37858L3.97215 7.6841C2.39832 7.79082 1.75796 9.76164 2.96849 10.773L6.43423 13.6687C6.50787 13.7302 6.53979 13.8285 6.51638 13.9215L5.41456 18.3013C5.02971 19.8311 6.70619 21.0491 8.04217 20.2104L11.8671 17.809C11.9483 17.758 12.0517 17.758 12.1329 17.809L15.9578 20.2104C17.2938 21.0491 18.9703 19.8311 18.5854 18.3013L17.4836 13.9215C17.4602 13.8285 17.4921 13.7302 17.5658 13.6687L21.0315 10.773C22.242 9.76164 21.6017 7.79082 20.0279 7.6841L15.522 7.37858C15.4262 7.37209 15.3427 7.31137 15.3069 7.22232L13.624 3.0314ZM11.768 3.59037C11.852 3.38125 12.148 3.38125 12.232 3.59037L13.9149 7.78129C14.1653 8.40465 14.7503 8.8297 15.4205 8.87515L19.9264 9.18067C20.1512 9.19591 20.2427 9.47746 20.0698 9.62195L16.604 12.5176C16.0885 12.9483 15.8651 13.6361 16.0289 14.2875L17.1308 18.6672C17.1857 18.8858 16.9462 19.0598 16.7554 18.94L12.9305 16.5387C12.3616 16.1815 11.6384 16.1815 11.0695 16.5387L7.24461 18.94C7.05376 19.0598 6.81426 18.8858 6.86924 18.6672L7.97106 14.2875C8.13494 13.6361 7.91147 12.9483 7.39598 12.5176L3.93024 9.62194C3.75731 9.47746 3.84879 9.19591 4.07362 9.18067L8.57949 8.87515C9.24969 8.8297 9.83473 8.40465 10.0851 7.78129L11.768 3.59037ZM12.7501 20.25C12.7501 19.8358 12.4143 19.5 12.0001 19.5C11.5858 19.5 11.2501 19.8358 11.2501 20.25V21.75C11.2501 22.1642 11.5858 22.5 12.0001 22.5C12.4143 22.5 12.7501 22.1642 12.7501 21.75V20.25ZM19.133 14.3177C19.261 13.9237 19.6841 13.7081 20.078 13.8361L21.5046 14.2997C21.8986 14.4276 22.1141 14.8508 21.9861 15.2447C21.8581 15.6386 21.435 15.8542 21.0411 15.7262L19.6145 15.2627C19.2206 15.1347 19.005 14.7116 19.133 14.3177ZM16.2425 4.88478C15.999 5.21988 16.0733 5.68891 16.4084 5.93238C16.7435 6.17585 17.2126 6.10156 17.456 5.76645L18.3377 4.55293C18.5812 4.21782 18.5069 3.74879 18.1718 3.50533C17.8367 3.26186 17.3676 3.33614 17.1242 3.67125L16.2425 4.88478ZM7.59162 5.93238C7.25651 6.17585 6.78749 6.10156 6.54402 5.76645L5.66234 4.55293C5.41887 4.21782 5.49316 3.74879 5.82826 3.50533C6.16337 3.26186 6.6324 3.33614 6.87587 3.67125L7.75754 4.88478C8.00101 5.21988 7.92673 5.68891 7.59162 5.93238ZM4.3856 15.2627C4.77954 15.1347 4.99513 14.7116 4.86713 14.3177C4.73913 13.9237 4.31602 13.7081 3.92208 13.8361L2.49549 14.2997C2.10155 14.4276 1.88596 14.8508 2.01396 15.2447C2.14196 15.6386 2.56508 15.8542 2.95902 15.7262L4.3856 15.2627Z"/>
      </svg>
      <div class="segment-name">${name}</div>
    </div>
  `
}
const getSceneRenderer = (name: string) => {
  return  `
    <div class="flex items-center text-12">
      <svg width="24" height="24" viewBox="0 0 24 24" class="ml-6">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M6 3.5H18C19.3807 3.5 20.5 4.61929 20.5 6V18C20.5 19.3807 19.3807 20.5 18 20.5H6C4.61929 20.5 3.5 19.3807 3.5 18V6C3.5 4.61929 4.61929 3.5 6 3.5ZM2 6C2 3.79086 3.79086 2 6 2H18C20.2091 2 22 3.79086 22 6V18C22 20.2091 20.2091 22 18 22H6C3.79086 22 2 20.2091 2 18V6ZM17.5303 7.53033C17.8232 7.23744 17.8232 6.76256 17.5303 6.46967C17.2374 6.17678 16.7626 6.17678 16.4697 6.46967L6.46967 16.4697C6.17678 16.7626 6.17678 17.2374 6.46967 17.5303C6.76256 17.8232 7.23744 17.8232 7.53033 17.5303L17.5303 7.53033ZM11.5303 6.46967C11.8232 6.76256 11.8232 7.23744 11.5303 7.53033L7.53033 11.5303C7.23744 11.8232 6.76256 11.8232 6.46967 11.5303C6.17678 11.2374 6.17678 10.7626 6.46967 10.4697L10.4697 6.46967C10.7626 6.17678 11.2374 6.17678 11.5303 6.46967ZM17.5303 13.5303C17.8232 13.2374 17.8232 12.7626 17.5303 12.4697C17.2374 12.1768 16.7626 12.1768 16.4697 12.4697L12.4697 16.4697C12.1768 16.7626 12.1768 17.2374 12.4697 17.5303C12.7626 17.8232 13.2374 17.8232 13.5303 17.5303L17.5303 13.5303Z"/>
      </svg>
      <div class="segment-name">${name}</div>
    </div>
  `
}
const getCameraRenderer = (name: string) => {
  return  `
    <div class="flex items-center text-12">
      <svg width="24" height="24" viewBox="0 0 24 24" class="ml-6">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M4 4.5H14C14.8284 4.5 15.5 5.17157 15.5 6V8V12V14C15.5 14.8284 14.8284 15.5 14 15.5H4C3.17157 15.5 2.5 14.8284 2.5 14V6C2.5 5.17157 3.17157 4.5 4 4.5ZM17 13.2V14C17 15.6569 15.6569 17 14 17H12.5078L14.1964 21.2215C14.3502 21.606 14.1631 22.0425 13.7785 22.1964C13.394 22.3502 12.9575 22.1631 12.8036 21.7785L10.8922 17H7.10778L5.19636 21.7785C5.04252 22.1631 4.60604 22.3502 4.22146 22.1964C3.83687 22.0425 3.64981 21.606 3.80364 21.2215L5.49222 17H4C2.34315 17 1 15.6569 1 14V6C1 4.34315 2.34315 3 4 3H14C15.6569 3 17 4.34315 17 6V6.8L19.7506 4.59951C21.0601 3.55189 23 4.48424 23 6.16125V13.8388C23 15.5158 21.0601 16.4481 19.7506 15.4005L17 13.2ZM17 11.2791L20.6877 14.2292C21.015 14.4911 21.5 14.258 21.5 13.8388V6.16125C21.5 5.742 21.015 5.50891 20.6877 5.77082L17 8.72094V11.2791Z"/>
      </svg>
      <div class="segment-name">${name}</div>
    </div>
  `
}
const getBGMRenderer = (name: string) => {
  return  `
    <div class="flex items-center text-12">
      <svg width="24" height="24" viewBox="0 0 24 24" class="ml-6">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M7.25108 3.77214C8.69544 2.93848 10.3338 2.49974 12.0015 2.5C13.6692 2.50026 15.3074 2.93952 16.7515 3.77363C18.1956 4.60774 19.3947 5.80729 20.2282 7.25172C20.4353 7.61049 20.8939 7.73349 21.2527 7.52646C21.6115 7.31943 21.7345 6.86076 21.5274 6.502C20.5623 4.8295 19.1739 3.44054 17.5017 2.47473C15.8296 1.50892 13.9327 1.0003 12.0017 1C10.0707 0.999697 8.17367 1.50772 6.50125 2.473C4.82883 3.43828 3.43997 4.82681 2.4743 6.499C1.50862 8.1712 1.00015 10.0681 1 11.9991C0.999848 13.9301 1.50802 15.8272 2.47343 17.4995C3.43884 19.1718 4.82748 20.5606 6.49975 21.5261C8.17202 22.4917 10.069 23 12 23C12.4142 23 12.75 22.6642 12.75 22.25C12.75 21.8358 12.4142 21.5 12 21.5C10.3323 21.5 8.69402 21.061 7.24978 20.2271C5.80555 19.3932 4.60628 18.1939 3.77251 16.7496C2.93874 15.3053 2.49987 13.6669 2.5 11.9993C2.50013 10.3316 2.93926 8.69331 3.77326 7.24914C4.60725 5.80497 5.80671 4.60579 7.25108 3.77214ZM14.75 19C14.75 17.7574 15.7574 16.75 17 16.75C18.2426 16.75 19.25 17.7574 19.25 19C19.25 20.2426 18.2426 21.25 17 21.25C15.7574 21.25 14.75 20.2426 14.75 19ZM17 15.25C17.8442 15.25 18.6233 15.529 19.25 15.9997V11C19.25 10.7159 19.4105 10.4562 19.6646 10.3292C19.9187 10.2021 20.2227 10.2296 20.45 10.4L22.45 11.9C22.7814 12.1485 22.8485 12.6186 22.6 12.95C22.3515 13.2814 21.8814 13.3485 21.55 13.1L20.75 12.5V19C20.75 21.0711 19.0711 22.75 17 22.75C14.9289 22.75 13.25 21.0711 13.25 19C13.25 16.9289 14.9289 15.25 17 15.25ZM12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z" />
      </svg>
      <div class="segment-name">${name}</div>
    </div>
  `
}

export const getContentRenderer = ({ segmentType, name = '' }: SegmentConstructInfo ):string => {
  if(segmentType === SegmentType.AVATAR){
    return getAvatarRenderer(name);
  }
  if(segmentType === SegmentType.FACE_ANIMATION){
    return getFaceAnimationRenderer(name);
  }
  if(segmentType === SegmentType.VOICE){
    return getVoiceRenderer(name);
  }
  if(segmentType === SegmentType.BODY_ANIMATION){
    return getBodyAnimationRenderer(name)
  }
  if(segmentType === SegmentType.EFFECT){
    return getEffectRenderer(name)
  }
  if(segmentType === SegmentType.SCENE){
    return getSceneRenderer(name);
  }
  if(segmentType === SegmentType.CAMERA){
    return getCameraRenderer(name);
  }
  if(segmentType === SegmentType.BGM){
    return getBGMRenderer(name);
  }
  return ''
}

// segment 渲染背景颜色
export const getSegmentStyle = ({ segmentType }: SegmentConstructInfo ): string => {
  if(segmentType === SegmentType.AVATAR){
    return 'background: #C66136;';
  }
  if(segmentType === SegmentType.FACE_ANIMATION){
    // return 'background: #C66136;';
    return 'background: rgba(198, 97, 54, 0.2);';
  }
  if(segmentType === SegmentType.VOICE){
    // return 'background: #C66136;';
    return 'background: rgba(198, 97, 54, 0.2);';
  }
  if(segmentType === SegmentType.BODY_ANIMATION){
    // return 'background: #C66136;';
    return 'background: rgba(198, 97, 54, 0.2);';
  }
  if(segmentType === SegmentType.EFFECT){
    return 'background: #46A9CB;'
  }
  if(segmentType === SegmentType.SCENE){
    return 'background: #6C4ACD;'
  }
  if(segmentType === SegmentType.CAMERA){
    return 'background: #4767E8;';
  }
  if(segmentType === SegmentType.BGM){
    return 'background: #46A9CB;';
  }
  return ''
}