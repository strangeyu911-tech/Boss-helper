# Boss-Helper Clean 版本更新日志

## v1.4.0 到 v1.5.0 版本变更说明

**更新日期**: 2026-04-29
**版本范围**: boss-helper-v1.4.0.user.js → boss-helper-v1.5.0.user.js
**变更类型**: 架构重构、新增功能、功能优化、问题修复、UI改进

---

## 变更总览

| 变更类别 | 变更内容 | 文件路径 | 行号 |
|---------|---------|---------|------|
| **架构重构** | 基于原始 Boss-Helper 完整功能重构，恢复全部功能模块 | v1.5.0#L1-415 | 全文 |
| **新增功能** | 问卷自动填写系统 (WJ) | v1.5.0#L350-415 | 350-415 |
| **新增功能** | 智能引导系统 (Guide) | v1.5.0#L300-350 | 300-350 |
| **新增功能** | 强制更新机制 | v1.5.0#L200-250 | 200-250 |
| **新增功能** | 赞助卡片和作者信息卡片 | v1.5.0#L80-120 | 80-120 |
| **新增功能** | 表单自动保存功能 | v1.5.0#L250-280 | 250-280 |
| **新增功能** | 投递统计面板 | v1.5.0#L280-300 | 280-300 |
| **新增功能** | 用户协议展示 | v1.5.0#L60-80 | 60-80 |
| **新增功能** | 手动更新引导 | v1.5.0#L200-250 | 200-250 |
| **功能优化** | 消息通知系统增强（多类型、动画效果） | v1.5.0#L130-170 | 130-170 |
| **功能优化** | 模态框组件增强（滚动提示、溢出检测） | v1.5.0#L170-200 | 170-200 |
| **功能优化** | 日志面板增强（分类日志、实时状态） | v1.5.0#L150-180 | 150-180 |
| **功能优化** | 样式系统完善（统一设计语言） | v1.5.0#L80-130 | 80-130 |
| **功能优化** | 复制限制解除增强（覆盖更多元素） | v1.5.0#L380-400 | 380-400 |
| **功能优化** | 设置面板UI增强 | v1.5.0#L250-280 | 250-280 |
| **问题修复** | 修复嵌套弹窗页面滚动问题 | v1.5.0#L170-200 | 170-200 |
| **问题修复** | 修复投递异常处理逻辑 | v1.5.0#L350-380 | 350-380 |
| **问题修复** | 修复 Debugger 反反爬虫机制 | v1.5.0#L410-415 | 410-415 |
| **元数据变更** | 元数据头部格式更新 | v1.5.0#L1-12 | 1-12 |

---

## 详细变更说明

### 1. 架构重构

#### 1.1 基于原始 Boss-Helper 完整功能重构

**变更类型**: 架构重构
**文件路径**: `d:\boss-helper\boss-helper\boss-helper-v1.5.0.user.js`
**功能描述**: 将 v1.4.0 的 Clean Room 重写版本替换为基于原始 Boss-Helper 脚本的完整功能版本，恢复全部功能模块

**v1.4.0 架构特征**:
- 模块化设计，使用 class 语法
- 10 个功能模块（ConfigManager、HistoryManager、FilterEngine、RateLimiter 等）
- 约 900 行代码
- 简化版功能集合

**v1.5.0 架构特征**:
- 函数式设计，使用 IIFE 封装
- 8 大功能系统（样式注入、消息通知、模态框、日志面板、引导、自动投递、版本检测、问卷填写）
- 约 415 行压缩代码
- 完整功能集合

**代码量对比**:
| 版本 | 原始行数 | 压缩后 | 功能模块数 |
|------|---------|--------|-----------|
| v1.4.0 | ~900 行 | N/A | 10 |
| v1.5.0 | ~415 行 | 是 | 8 大系统 |

### 2. 新增功能

#### 2.1 问卷自动填写系统 (WJ)

**变更类型**: 新增功能
**文件路径**: `d:\boss-helper\boss-helper\boss-helper-v1.5.0.user.js`
**功能描述**: 在问卷页面 (wj.qq.com) 自动识别并填写公司名称、岗位名称、岗位链接等表单字段

**实现位置** (v1.5.0#L350-415):
```javascript
// 问卷自动填写核心逻辑
function f8(e) { return u8(e?.querySelector(".question-title .text")?.textContent); }
function b8(e, t) {
  const n = f8(e);
  return n ? n.includes("公司名称") ? an(e.querySelector("input[type='text']"), t.companyName) :
    n.includes("岗位名称") ? an(e.querySelector("input[type='text']"), t.jobTitle) :
    n.includes("岗位链接") ? an(e.querySelector("input[type='text']"), t.jobUrl) : false : false;
}
```

**功能说明**:
- 自动识别问卷题目类型
- 智能填充公司名称、岗位名称、岗位链接
- 使用 MutationObserver 监听页面变化
- 支持定时重试机制（最多 30 次）

#### 2.2 智能引导系统 (Guide)

**变更类型**: 新增功能
**文件路径**: `d:\boss-helper\boss-helper\boss-helper-v1.5.0.user.js`
**功能描述**: 首次使用时提供分步引导，使用聚光灯高亮效果指示关键功能入口

**引导步骤** (v1.5.0#L300-350):
```javascript
const a8 = [
  {
    key: "bp_auto_apply_entry_guide_seen",
    order: 10,
    target: "#bp-auto-apply-btn",
    title: "自动投递入口在这里",
    text: "左下角高亮的火箭按钮就是自动投递入口。点它后会进入职位页面，并按当前筛选条件投递。",
    spotlightPadding: 8,
    gap: 16
  },
  {
    key: "bp_settings_entry_guide_seen",
    order: 20,
    target: ".bp-settings-btn",
    title: "设置入口在这里",
    text: "这里可以调整自动投递上限、筛选条件、定时投递和跳过规则。改完后记得保存设置。",
    spotlightPadding: 8,
    gap: 16
  },
  {
    key: "bp_apply_stats_entry_guide_seen",
    order: 40,
    target: "#bp-stats-btn",
    title: "投递统计入口在这里",
    text: "这里可以查看最近 7 天和 30 天的投递记录，方便核对自动投递结果。",
    spotlightPadding: 8,
    gap: 16
  }
];
```

**功能特点**:
- 聚光灯高亮效果（带脉冲动画）
- 分步引导，按顺序展示
- 使用 localStorage 记录已查看状态
- 支持响应式卡片定位（自动计算最佳位置）
- 支持 `prefers-reduced-motion` 无障碍访问

#### 2.3 强制更新机制

**变更类型**: 新增功能
**文件路径**: `d:\boss-helper\boss-helper\boss-helper-v1.5.0.user.js`
**功能描述**: 检测到新版本时弹出强制更新提示，引导用户下载最新版本

**实现位置** (v1.5.0#L200-250):
```javascript
function Sa(e) {
  const t = new W({ title: "发现新版本", width: "480px", closeable: false });
  // 展示版本号、更新内容、更新按钮
  // 点击"立即更新"跳转到下载页面
}
```

**更新提示内容**:
- 显示新版本号
- 显示更新日志详情
- 按变更类型分类统计（新增/修复/优化/移除/变更）
- 提供"立即更新"按钮

#### 2.4 赞助和作者信息卡片

**变更类型**: 新增功能
**文件路径**: `d:\boss-helper\boss-helper\boss-helper-v1.5.0.user.js`
**功能描述**: 在设置面板中展示赞助信息和作者联系方式

**实现位置** (v1.5.0#L80-120):
```css
/* 作者卡片样式 */
.bp-author-card { /* 红色主题卡片，hover 变色效果 */ }
.bp-sponsor-card { /* 白色主题卡片，hover 反色效果 */ }
```

#### 2.5 投递统计面板

**变更类型**: 新增功能
**文件路径**: `d:\boss-helper\boss-helper\boss-helper-v1.5.0.user.js`
**功能描述**: 支持查看最近 7 天和 30 天的投递趋势数据

**实现位置** (v1.5.0#L280-300):
- 展示投递趋势图表
- 支持悬浮查看详细数据
- 数据存储在 localStorage 中

#### 2.6 用户协议展示

**变更类型**: 新增功能
**文件路径**: `d:\boss-helper\boss-helper\boss-helper-v1.5.0.user.js`
**功能描述**: 首次使用时展示用户协议，用户需同意后才能使用

**实现位置** (v1.5.0#L60-80):
```css
/* 协议样式 */
.bp-agreement-intro { /* 协议介绍文本 */ }
.bp-agreement-list { /* 协议条款列表 */ }
.bp-agreement-item { /* 协议条款项 */ }
```

#### 2.7 手动更新引导

**变更类型**: 新增功能
**文件路径**: `d:\boss-helper\boss-helper\boss-helper-v1.5.0.user.js`
**功能描述**: 提供详细的手动更新步骤说明，包括下载、覆盖安装等操作指引

**实现位置** (v1.5.0#L200-250):
```javascript
// 手动更新步骤
// 1. 下载脚本文件
// 2. 覆盖安装
// 3. 提供联系方式
```

### 3. 功能优化

#### 3.1 消息通知系统增强

**变更类型**: 功能优化
**文件路径**: `d:\boss-helper\boss-helper\boss-helper-v1.5.0.user.js`
**功能描述**: 从 v1.4.0 的简单 Toast 升级为完整的消息通知系统

**v1.4.0 实现** (v1.4.0#L470-520):
```javascript
class Toast {
  static show(message, type = 'info', duration = 3000) {
    // 简单的消息展示
  }
}
```

**v1.5.0 实现** (v1.5.0#L130-170):
```javascript
const N = {
  show(e, t = "success", n = 3e3) {
    // 支持 success/error 两种类型
    // 支持动画入场/出场效果
    // 支持最多 3 条消息同时显示
    // 支持手动关闭
  },
  error(e, t) { this.show(e, "error", t); },
  success(e, t) { this.show(e, "success", t); }
};
```

**优化内容**:
- 新增动画入场效果（缩放 + 淡入）
- 新增动画出场效果（上移 + 淡出）
- 支持最多 3 条消息同时显示（队列管理）
- 支持手动关闭消息
- 图标使用 SVG 内联（无需外部资源）

#### 3.2 模态框组件增强

**变更类型**: 功能优化
**文件路径**: `d:\boss-helper\boss-helper\boss-helper-v1.5.0.user.js`
**功能描述**: 从 v1.4.0 的侧边栏设置面板升级为完整的模态框系统

**v1.4.0 实现** (v1.4.0#L550-780):
```javascript
class SettingsPanel {
  // 侧边栏式设置面板
  // 固定在右侧，滑入滑出
}
```

**v1.5.0 实现** (v1.5.0#L170-200):
```javascript
class W {  // Modal 类
  constructor(t = {}) {
    // 支持自定义标题、宽度
    // 支持关闭按钮、点击遮罩关闭
    // 支持内容溢出检测
    // 支持滚动指示器
  }
  show() { /* 显示模态框，锁定页面滚动 */ }
  hide() { /* 隐藏模态框，恢复页面滚动 */ }
  setContent(t) { /* 设置内容 */ }
  setFooter(t) { /* 设置底部按钮 */ }
}
```

**优化内容**:
- 居中弹窗布局（替代侧边栏）
- 滚动提示：内容溢出时显示底部渐变遮罩
- 滚动指示器：弹窗底部箭头动画提示
- 页面滚动锁定：打开弹窗时防止背景滚动
- 嵌套弹窗支持：多弹窗层级管理
- 底部渐变遮罩：溢出时自动显示/隐藏

#### 3.3 日志面板增强

**变更类型**: 功能优化
**文件路径**: `d:\boss-helper\boss-helper\boss-helper-v1.5.0.user.js`
**功能描述**: 新增完整的日志面板系统，支持分类日志和实时状态

**v1.4.0 实现**: 无日志面板（仅使用 console.log）

**v1.5.0 实现** (v1.5.0#L150-180):
```javascript
class Z1 {  // LogPanel 类
  constructor(t = {}) {
    // 支持自定义标题
    // 支持空状态提示
    // 实时状态指示器
  }
  log(t, n = "info") {
    // 支持 info/success/warn/error 四种日志级别
    // 带时间戳
    // 带图标
    // 自动滚动
  }
}
```

**日志级别**:
| 级别 | 图标颜色 | 文本颜色 |
|------|---------|---------|
| info | 蓝色 (#64d2ff) | 白色半透明 |
| success | 绿色 (#30d158) | 绿色 |
| warn | 黄色 (#ffd60a) | 黄色 |
| error | 红色 (#ff453a) | 红色 |

#### 3.4 样式系统完善

**变更类型**: 功能优化
**文件路径**: `d:\boss-helper\boss-helper\boss-helper-v1.5.0.user.js`
**功能描述**: 完善 CSS 样式系统，统一设计语言

**v1.4.0 样式** (v1.4.0#L360-468):
```css
/* 基础样式：浮动按钮、Toast、设置面板 */
.bp-clean-floating-actions { }
.bp-clean-toast { }
.bp-clean-settings-panel { }
```

**v1.5.0 新增样式** (v1.5.0#L80-300):
```css
/* 全局基础样式 */
:root { --font-sans: ...; --font-mono: ...; }

/* 协议样式 */
.bp-agreement-* { }

/* 作者/赞助卡片 */
.bp-author-card { }
.bp-sponsor-card { }

/* 消息通知 */
.bp-message-container { }
.bp-message-item { }

/* 模态框 */
.bp-modal-overlay { }
.bp-modal-panel { }

/* 日志面板 */
.bp-log-panel { }

/* 更新弹窗 */
.bp-force-update-* { }
.bp-manual-update-* { }

/* 更新日志 */
.bp-changelog-* { }

/* 引导 */
.bp-guide { }
```

#### 3.5 复制限制解除增强

**变更类型**: 功能优化
**文件路径**: `d:\boss-helper\boss-helper\boss-helper-v1.5.0.user.js`
**功能描述**: 增强复制限制解除功能，覆盖更多页面元素

**v1.4.0 实现**: 无复制限制解除功能

**v1.5.0 实现** (v1.5.0#L380-400):
```javascript
// 解除复制限制
function W3() {
  // 移除 user-select: none 样式
  // 覆盖更多选择器
  // 阻止复制事件拦截
  // 阻止右键菜单拦截
}
```

**覆盖范围**:
- 职位详情页
- 聊天页面
- 公司信息页
- 所有文本内容区域

#### 3.6 元数据头部变更

**变更类型**: 元数据变更
**文件路径**: `d:\boss-helper\boss-helper\boss-helper-v1.5.0.user.js`
**功能描述**: 元数据头部格式更新

**v1.4.0 元数据** (v1.4.0#L1-11):
```
// @name         Boss-Helper Clean
// @namespace    https://github.com/boss-helper
// @version 1.4.0
// @description  自动投递、黑名单过滤、界面优化
// @match        https://www.zhipin.com/*
// @grant        GM_addStyle
// @grant        GM_info
// @run-at       document-end
```

**v1.5.0 元数据** (v1.5.0#L1-12):
```
// @name         Boss-Helper Clean
// @namespace    https://github.com/boss-helper
// @version 1.5.0
// @description  自动投递、黑名单过滤、界面优化
// @match        https://www.zhipin.com/*
// @match        https://wj.qq.com/s2/27127732/ab0d/*  ← 新增问卷页面匹配
// @grant        GM_addStyle
// @grant        GM_info
// @run-at       document-end
```

**元数据变更说明**:
- 版本号从 1.4.0 更新为 1.5.0
- 新增 `@match https://wj.qq.com/s2/27127732/ab0d/*` 支持问卷页面
- 保持 `@grant` 标签不变

### 4. 问题修复

#### 4.1 嵌套弹窗页面滚动修复

**变更类型**: 问题修复
**文件路径**: `d:\boss-helper\boss-helper\boss-helper-v1.5.0.user.js`
**功能描述**: 修复嵌套弹窗导致的页面滚动问题

**修复方案** (v1.5.0#L170-200):
```javascript
let pt = 0;  // 弹窗层级计数器
class W {
  show() {
    pt === 0 && (document.body.style.overflow = "hidden", ...);
    pt++;  // 增加计数
  }
  hide() {
    pt--;  // 减少计数
    pt === 0 && (document.body.style.overflow = "", ...);  // 仅最后一个弹窗关闭时恢复
  }
}
```

#### 4.2 Debugger 反反爬虫机制

**变更类型**: 新增功能
**文件路径**: `d:\boss-helper\boss-helper\boss-helper-v1.5.0.user.js`
**功能描述**: 使用 Proxy 拦截 Function 构造函数，阻止网站通过 debugger 语句进行反调试

**实现位置** (v1.5.0#L410-415):
```javascript
window.Function = new Proxy(window.Function, {
  apply(n, o, r) {
    return r.length && /debugger/.test(r[r.length - 1]) ? () => {} : Reflect.apply(n, o, r);
  }
});
```

---

## 功能对比矩阵

### 完整功能对比

| 功能 | v1.4.0 | v1.5.0 |
|------|:------:|:------:|
| 自动投递 | ✅ | ✅ |
| 黑名单过滤 | ✅ | ✅ |
| 关键词过滤 | ✅ | ✅ |
| 必需关键词 | ✅ | ✅ |
| 每日投递限制 | ✅ | ✅ |
| 工作时间限制 | ✅ | ✅ |
| 消息通知 | ✅ 基础 | ✅ 增强 |
| 设置面板 | ✅ 侧边栏 | ✅ 增强 |
| 浮动按钮 | ✅ | ✅ |
| 样式注入 | ✅ | ✅ |
| 问卷自动填写 | ❌ | ✅ |
| 智能引导 | ❌ | ✅ |
| 强制更新 | ❌ | ✅ |
| 手动更新引导 | ❌ | ✅ |
| 赞助卡片 | ❌ | ✅ |
| 投递统计 | ❌ | ✅ |
| 用户协议 | ❌ | ✅ |
| 日志面板 | ❌ | ✅ |
| 模态框 | ❌ | ✅ |
| 复制限制解除 | ❌ | ✅ |
| Debugger 反制 | ❌ | ✅ |
| 更新日志展示 | ❌ | ✅ |
| 表单自动保存 | ❌ | ✅ |

### 文件结构对比

| 项目 | v1.4.0 | v1.5.0 |
|------|--------|--------|
| 代码风格 | ES6 Class 模块化 | IIFE 函数式 |
| 代码行数 | ~900 行 | ~415 行（压缩） |
| 注释系统 | 模块级注释 | 文件级注释块 |
| 元数据标签 | 8 个 | 9 个（+wj.qq.com） |
| 功能模块 | 10 个 | 8 大系统 |
| 错误处理 | 基础 try-catch | 完善异常处理 |

---

## 兼容性说明

### 浏览器兼容性
- ✅ Chrome 80+
- ✅ Edge 80+
- ✅ Firefox 75+
- ⚠️ Safari（部分 CSS 特性可能不兼容）

### 脚本管理器兼容性
- ✅ Tampermonkey 4.0+
- ✅ Violentmonkey 2.0+
- ⚠️ Greasemonkey（未测试）

### 网站兼容性
- ✅ zhipin.com（Boss 直聘主站）
- ✅ wj.qq.com（问卷页面）

---

## 升级建议

### 从 v1.4.0 升级到 v1.5.0

1. **备份现有设置**: 升级前请导出当前设置
2. **卸载旧版本**: 在脚本管理器中卸载 v1.4.0
3. **安装新版本**: 安装 boss-helper-v1.5.0.user.js
4. **重新配置**: 由于架构变更，需要重新配置设置参数
5. **查看引导**: 首次使用会自动弹出新手引导

### 注意事项

- v1.5.0 是架构重构版本，与 v1.4.0 的配置文件格式不同
- 旧版本的 localStorage 数据可能无法被新版本直接读取
- 新增的问卷功能需要匹配 `wj.qq.com/s2/27127732/ab0d/*` 路径
- 引导系统使用 localStorage 记录状态，清除缓存后需重新查看

---

## 已知问题

1. 代码为压缩格式，不便于直接阅读和修改
2. 部分 CSS 动画在低性能设备上可能出现卡顿
3. 弹窗层级管理在极端情况下可能出现计数错误

---

## 贡献者

- Strange
- 原始脚本作者: dddvi