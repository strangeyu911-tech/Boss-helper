# Boss-Helper Clean 版本更新日志

## v1.0 到 v1.1 版本变更说明

**更新日期**: 2026-04-27
**版本范围**: boss-helper-v1.0.user.js → boss-helper-v1.1.user.js
**变更类型**: 功能优化与行为调整

---

## 变更总览

| 变更类别 | 变更内容 | 文件路径 | 行号 |
|---------|---------|---------|------|
| 功能移除 | 移除强制切换求职期望功能 | v1.1#L1-52 | 45-50 |
| 功能移除 | 移除 switchToFirstExpectation 方法 | v1.1#L1-52 | - |
| 功能优化 | 优化自动投递启动行为 | v1.1#L220-235 | 220-235 |
| 代码清理 | 移除扩展预留接口注释 | v1.1#L1-940 | 全文 |
| 已知问题 | 添加已知问题注释标记 | v1.1#L1-940 | 全文 |

---

## 详细变更说明

### 1. 功能移除

#### 1.1 移除强制切换求职期望功能

**变更类型**: 功能移除
**影响范围**: 配置系统、自动投递器
**文件路径**: `d:\boss-helper\boss-helper-v1.1.user.js`

**变更内容**:

| 配置项 | v1.0 | v1.1 | 说明 |
|--------|------|------|------|
| `forceFirstExpect` | `true` | 已移除 | 不再强制切换到第一个求职期望 |

**代码位置**:
```javascript
// v1.0 配置 (v1.0#L45-50)
DEFAULT_SETTINGS: {
  autoApply: false,
  rateLimit: 3000,
  excludeKeywords: [],
  companyBlacklist: [],
  maxApplications: 50,
  skipFirstCard: true,
  forceFirstExpect: true  // ← v1.0: 强制切换到第一个求职期望（原始行为）
}

// v1.1 配置 (v1.1#L45-50)
DEFAULT_SETTINGS: {
  autoApply: false,
  rateLimit: 3000,
  excludeKeywords: [],
  companyBlacklist: [],
  maxApplications: 50,
  skipFirstCard: true
  // ← v1.1: 移除 forceFirstExpect 配置项
}
```

#### 1.2 移除 switchToFirstExpectation 方法

**变更类型**: 方法移除
**文件路径**: `d:\boss-helper\boss-helper-v1.1.user.js`
**原位置**: AutoApplier类

**移除的代码**:
```javascript
// v1.0 中的方法 (v1.0#L295-310)
/**
 * 切换到第一个求职期望
 * v1.0原始行为：自动投递启动时强制切换
 * v1.1优化：已选择具体求职期望的情况下不再强制切换
 */
switchToFirstExpectation() {
  try {
    // 查找求职期望切换按钮
    const expectButtons = document.querySelectorAll('.expect-item, .job-expect-item, [data-expect]');
    if (expectButtons && expectButtons.length > 0) {
      // 强制点击第一个求职期望
      expectButtons[0].click();
      console.log('已切换到第一个求职期望');
    }
  } catch (error) {
    console.error('切换求职期望失败:', error.message);
  }
}
```

---

### 2. 功能优化

#### 2.1 自动投递启动行为优化

**变更类型**: 行为优化
**文件路径**: `d:\boss-helper\boss-helper-v1.1.user.js#L220-235`

**变更说明**:

v1.0在启动自动投递时会强制切换到第一个求职期望，v1.1优化为不再强制切换。

**变更前** (v1.0#L288-300):
```javascript
start() {
  if (this.isRunning) return;

  this.isRunning = true;

  // v1.0原始行为：强制切换到第一个求职期望
  // v1.1优化：已选择具体求职期望的情况下不再强制切换
  if (this.config.settings.forceFirstExpect) {
    this.switchToFirstExpectation();
  }

  // 已知问题：从推荐页启动时跳过第一张职位卡片
  if (this.config.settings.skipFirstCard && this.isRecommendPage()) {
    this.jobIndex = 1;
  } else {
    this.jobIndex = 0;
  }

  this.processJobs();
  this.hideFilteredJobs();
}
```

**变更后** (v1.1#L220-235):
```javascript
start() {
  if (this.isRunning) return;

  this.isRunning = true;
  // 已知问题：从推荐页启动时跳过第一张职位卡片
  // 当skipFirstCard为true且从推荐页启动时，会跳过第一个职位
  if (this.config.settings.skipFirstCard && this.isRecommendPage()) {
    this.jobIndex = 1;
  } else {
    this.jobIndex = 0;
  }
  this.processJobs();
  this.hideFilteredJobs();
}
```

---

### 3. 代码清理

#### 3.1 移除扩展预留接口

**变更类型**: 代码清理
**文件路径**: `d:\boss-helper\boss-helper-v1.1.user.js`

**移除的扩展预留接口**:

| 接口位置 | 移除内容 | v1.0行号 |
|---------|---------|---------|
| HistoryManager | `getRecordsInDays(days)` | v1.0#L165-175 |
| HistoryManager | `getCountByDate(days)` | v1.0#L177-190 |
| AutoApplier | `getStatsSummary()` | v1.0#L390-405 |
| AutoApplier | `getTrendData(days)` | v1.0#L407-422 |
| StyleManager | 扩展预留样式注释 | v1.0#L550-560 |
| FloatingActions | `showStats()`, `createStatsButton()` | v1.0#L580-595 |
| BossPlusClean | 统计相关属性和方法 | v1.0#L650-680 |

---

### 4. 已知问题标记

#### 4.1 添加已知问题注释

**变更类型**: 文档增强
**文件路径**: `d:\boss-helper\boss-helper-v1.1.user.js`

| 问题描述 | 位置 | 说明 |
|---------|------|------|
| 从推荐页启动时跳过第一张职位卡片 | v1.1#L222 | jobIndex初始化问题 |
| 投递统计计数不准确 | v1.1#L130-135 | getTodayCount实现问题 |
| 按钮显示稳定性问题 | v1.1#L380-395 | 布局使用block可能导致显示问题 |

**注释示例**:
```javascript
// v1.1#L222
// 已知问题：从推荐页启动时跳过第一张职位卡片
if (this.config.settings.skipFirstCard && this.isRecommendPage()) {
  this.jobIndex = 1;
}

// v1.1#L130-135
// 已知问题：计数不准确，可能重复计数
getTodayCount() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // 注意：此实现可能导致计数不准确（1.1版本已知问题，待1.2版本修复）
  return this.history.filter(entry => entry.timestamp >= today.getTime()).length;
}
```

---

## 版本对比总结

### 保留功能

| 功能 | v1.0 | v1.1 | 说明 |
|------|------|------|------|
| 自动投递 | ✅ | ✅ | 核心功能 |
| 黑名单过滤 | ✅ | ✅ | 包含关键词和公司黑名单 |
| 每日投递限制 | ✅ | ✅ | maxApplications控制 |
| 消息提示 | ✅ | ✅ | Toast组件 |
| 设置面板 | ✅ | ✅ | 基础设置功能 |
| 限流器 | ✅ | ✅ | RateLimiter |

### 变更功能

| 功能 | v1.0 | v1.1 | 变更类型 |
|------|------|------|---------|
| 求职期望切换 | 强制切换 | 不再强制切换 | 行为优化 |

### 移除功能

| 功能 | v1.0 | v1.1 | 说明 |
|------|------|------|------|
| forceFirstExpect配置 | ✅ | ❌ | 不再需要 |
| switchToFirstExpectation方法 | ✅ | ❌ | 不再需要 |
| 扩展预留接口 | ✅ | ❌ | 代码清理 |

---

## 迭代建议

### v1.1 版本待优化点

1. **推荐页启动逻辑**: `jobIndex`初始化问题导致跳过第一张卡片
2. **投递统计计数**: `getTodayCount()`实现存在重复计数问题
3. **UI显示稳定性**: FloatingActions使用block布局可能导致显示问题
4. **详情页复制按钮**: 底部间距未优化 (v1.1#L480-490)

### 架构扩展点

v1.1版本在以下模块预留了扩展接口，可用于后续版本功能叠加：

1. **HistoryManager**: 统计相关方法可扩展按日/按公司统计
2. **AutoApplier**: 统计相关方法可扩展投递数据分析
3. **StyleManager**: 统计面板样式预留
4. **FloatingActions**: 统计按钮预留

---

**文档版本**: 1.0
**生成日期**: 2026-04-27
**分析工具**: Boss-Helper Version Analyzer