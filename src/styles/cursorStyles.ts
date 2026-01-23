/**
 * 像素武侠风格鼠标样式 - 专家级 UI V10 (抓取图标重构版)
 */

const toDataUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg.trim())}")`;

const wrap = (content: string, size = 32) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- 墨韵轮廓 -->
  <g stroke="#1A1A1A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
    ${content.replace(/fill="[^"]*"/g, 'fill="none"')}
  </g>
  <!-- 核心主体 -->
  ${content}
</svg>`;

// 1. 像素名剑 (Default) - 保持不变
const Sword = `
  <path fill="#E0E0E0" d="M2 2h2v2h2v2h2v2h2v2h2v2h2v2h2v2h-2v2h-2v-2H8v-2H6v-2H4v-2H2V2z"/>
  <path fill="#FFFFFF" d="M2 2h2v2H2V2zM4 4h2v2H4V4zM6 6h2v2H6V6zM8 8h2v2H8V8zM10 10h2v2h-2v-2z"/>
  <path fill="#D4AF37" d="M14 12h4v2h2v4h-2v-2h-4v-4z M12 14h2v4h4v2h-2v-2h-4v-4z"/>
  <path fill="#8B4513" d="M18 18h4v4h-4z M20 20h4v4h-4z"/>
`;

// 2. 像素厚实指向手 (Pointer) - 保持不变
const PointingHand = `
  <path fill="#FFFFFF" d="M10 2h4v10h-4V2z M8 12h2v2h2v-2h12v14h-2v2h-12v-2H8v-4H6v-6h2v-2z"/>
  <path fill="#E0E0E0" d="M12 14h10v10h-10v-10z M8 16h2v4H8v-4z"/>
  <path fill="#1A1A1A" d="M14 15h8v1h-8z M14 19h8v1h-8z M14 23h8v1h-8z"/>
`;

// 3. 像素掌法 (Hand/Grab) - 保持不变
const OpenHand = `
  <path fill="#FFFFFF" d="M8 4h2v8h2V2h2v8h2V2h2v8h2V4h2v12h-2v2h-2v2H10v-2H8v-2H6V8h2V4z"/>
  <path fill="#E0E0E0" d="M10 14h10v4H10v-4z"/>
`;

// 4. 像素重拳 (Grab/Grabbing) - 专家级重构：更有力量感的紧握拳头
const Fist = `
  <!-- 拳头主体 -->
  <path fill="#FFFFFF" d="M8 10h14v12H8V10z"/>
  <!-- 拇指：横扣在前方，增加关节转折 -->
  <path fill="#FFFFFF" d="M6 13h10v5H6v-5z M14 15h2v3h-2v-3z"/>
  <!-- 阴影层：增加厚度与指缝深度 -->
  <path fill="#E0E0E0" d="M10 10h12v12H10V10z M6 16h10v2H6v-2z"/>
  <!-- 内部指节细节：区分四个握紧的手指 -->
  <path fill="#1A1A1A" d="M11 10h1v4h-1v-4z M15 10h1v4h-1v-4z M19 10h1v4h-1v-4z"/>
`;

// 5. 像素卷轴 (HelpCircle) - 保持不变
const Scroll = `
  <path fill="#F5DEB3" d="M6 6h16v12H6V6z"/>
  <path fill="#D4AF37" d="M4 4h4v16H4V4z M20 4h4v16h-4V4z"/>
  <path fill="#8B4513" d="M10 10h8v2h-8v-2z M10 14h6v2h-6v-2z"/>
`;

// 6. 像素禁制 (Ban) - 保持不变
const ForbiddenSign = `
  <path fill="#FFFFFF" d="M8 4h12v2h4v4h2v12h-2v4h-4v2H8v-2H4v-4H2V10h2V6h4V4z"/>
  <path fill="#FF4444" d="M8 4h12v2h4v4h2v12h-2v4h-4v2H8v-2H4v-4H2V10h2V6h4V4z M10 8h8v2h2v12h-2v2h-8v-2h-2V10h2V8z" fill-rule="evenodd"/>
  <path fill="#FF4444" d="M6 6h4v2h2v2h2v2h2v2h2v2h2v2h2v2h-4v-2h-2v-2h-2v-2h-2v-2h-2v-2h-2v-2H6V6z"/>
`;

export const cursorStyles = {
  MousePointer2: `${toDataUrl(wrap(Sword))} 2 2, auto`,
  Pointer: `${toDataUrl(wrap(PointingHand))} 12 2, pointer`,
  Hand: `${toDataUrl(wrap(OpenHand))} 12 12, pointer`,
  Grab: `${toDataUrl(wrap(Fist))} 12 12, grabbing`,
  HelpCircle: `${toDataUrl(wrap(Scroll))} 12 12, help`,
  Ban: `${toDataUrl(wrap(ForbiddenSign))} 12 12, not-allowed`,
};
