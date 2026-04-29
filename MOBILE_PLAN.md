# 移动端适配计划

## 约束
- **必须纯手机浏览器可玩，禁止依赖电脑键盘**
- 所有交互必须通过触摸屏完成
- 界面布局需适配竖屏手机（375px-430px 宽度）

## 当前状态
- 已有触摸事件（touchstart/touchmove/touchend）在 `js/canvas-engine.js`
- 基本适配移动端，但需要验证和完善

## 修改方案

### 1. 触摸体验优化
- 增大触摸目标尺寸（最小 44px × 44px，符合 Apple HIG 标准）
- 添加触摸反馈（按下时视觉变化，如透明度或缩放）
- 防止误触：增加触摸区域间距

### 2. 竖屏布局适配
- Canvas 尺寸响应式：宽度 100vw，高度按比例缩放
- UI 元素（按钮、文字）使用相对单位（rem/vw）
- 小屏幕下文字不小于 14px

### 3. 性能优化
- Canvas 渲染降低移动端分辨率（devicePixelRatio 限制最大 2）
- 减少 requestAnimationFrame 中的重绘区域
- 避免触摸事件中的被动监听器问题（`{ passive: false }` 仅在需要 preventDefault 时使用）

### 4. 防止浏览器默认行为
- `touch-action: manipulation` 防止双击缩放
- 阻止长按弹出菜单（`-webkit-touch-callout: none`）
- 阻止页面弹性滚动（`overscroll-behavior: none`）
