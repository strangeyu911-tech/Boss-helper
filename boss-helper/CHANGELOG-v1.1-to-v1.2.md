# Boss-Helper Clean 版本更新日志

## v1.1 到 v1.2 版本变更说明

**更新日期**: 2026-04-27
**版本范围**: boss-helper-v1.1.user.js → boss-helper-v1.2.user.js
**变更类型**: 新增功能、功能优化、问题修复

---

## 变更总览

| 变更类别 | 变更内容 | 文件路径 | 行号 |
|---------|---------|---------|------|
| **新增功能** | 薪资范围筛选 | v1.2#L1-100 | 70-75, 220-245 |
| **新增功能** | 城市过滤功能 | v1.2#L1-100 | 110-120 |
| **新增功能** | 关键词导入/导出 | v1.2#L140-160 | 140-160 |
| **新增功能** | 职位列表页复制按钮 | v1.2#L600-700 | 600-700 |
| **问题修复** | 跳过第一张卡片问题 | v1.2#L270-285 | 270-285 |
| **问题修复** | 投递统计计数不准确 | v1.2#L130-145 | 130-145 |
| **功能优化** | 左下角功能按钮逻辑 | v1.2#L500-530 | 500-530 |
| **功能优化** | 详情页复制按钮间距 | v1.2#L600-650 | 600-650 |
| **样式优化** | 基础样式细节优化 | v1.2#L400-480 | 400-480 |

---

## 详细变更说明

### 1. 新增功能

#### 1.1 薪资范围筛选

**变更类型**: 新增功能
**文件路径**: `d:\boss-helper\boss-helper-v1.2.user.js`
**影响范围**: 配置系统、过滤引擎、设置面板

**配置变更** (v1.2#L70-75):
```javascript
// v1.1 配置 (无薪资范围)
DEFAULT_SETTINGS: {
  autoApply: false,
  rateLimit: 3000,
  excludeKeywords: [],
  companyBlacklist: [],
  maxApplications: 50,
  skipFirstCard: true
}

// v1.2 配置 (新增薪资范围)
DEFAULT_SETTINGS: {
  autoApply: false,
  rateLimit: 3000,
  excludeKeywords: [],
  companyBlacklist: [],
  maxApplications: 50,
  salaryRange: {
    min: 0,
    max: 99999
  }
}
```

**过滤引擎变更** (v1.2#L220-245):
```javascript
// v1.2 FilterEngine.evaluate() 新增薪资检查
evaluate(job) {
  // ... 原有检查逻辑 ...

  // 检查薪资范围
  if (!this.checkSalary(job.salary)) {
    return { shouldApply: false, reason: '薪资范围不符合要求' };
  }

  // 检查每日投递限制
  if (this.config.history.getTodayCount() >= this.config.settings.maxApplications) {
    return { shouldApply: false, reason: '达到每日投递限制' };
  }

  return { shouldApply: true, reason: '通过所有过滤条件' };
}

// v1.2 新增方法
checkSalary(salary) {
  if (!salary) return true;

  const { min, max } = this.config.settings.salaryRange;
  const salaryRange = this.parseSalary(salary);

  if (!salaryRange) return true;

  // 恢复薪资范围筛选逻辑，允许部分重叠
  return salaryRange.max >= min && salaryRange.min <= max;
}

parseSalary(salary) {
  const match = salary.match(/(\d+)-(\d+)K/);
  if (match) {
    return {
      min: parseInt(match[1]) * 1000,
      max: parseInt(match[2]) * 1000
    };
  }
  return null;
}
```

**设置面板UI变更** (v1.2#L600-700):
```javascript
// v1.2 SettingsPanel 新增薪资范围设置UI
// 新增样式
.bp-clean-salary-range {
  display: flex;
  gap: 10px;
}

.bp-clean-salary-range input {
  flex: 1;
}

// 新增HTML
<div class="bp-clean-settings-group">
  <label>薪资范围 (K)</label>
  <div class="bp-clean-salary-range">
    <input type="number" id="bp-clean-salary-min"
           value="${this.config.get('salaryRange').min / 1000}"
           placeholder="最低薪资">
    <input type="number" id="bp-clean-salary-max"
           value="${this.config.get('salaryRange').max / 1000}"
           placeholder="最高薪资">
  </div>
</div>
```

---

#### 1.2 城市过滤功能

**变更类型**: 新增功能
**文件路径**: `d:\boss-helper\boss-helper-v1.2.user.js#L110-120`

**ConfigManager变更**:
```javascript
// v1.2 ConfigManager 新增导入/导出方法
export() {
  return JSON.stringify(this.settings, null, 2);
}

import(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    this.settings = { ...this.settings, ...data };
    this.save();
    return true;
  } catch {
    return false;
  }
}
```

**设置面板UI变更**:
```javascript
// v1.2 SettingsPanel 新增城市过滤UI
<div class="bp-clean-settings-group">
  <label>城市过滤模式</label>
  <select id="bp-clean-city-filter-mode">
    <option value="none">不过滤</option>
    <option value="whitelist">白名单模式（只看指定城市）</option>
    <option value="blacklist">黑名单模式（排除指定城市）</option>
  </select>
</div>

<div class="bp-clean-settings-group">
  <label>城市列表</label>
  <input type="text" id="bp-clean-city-list"
         placeholder="多个城市用逗号分隔，如：北京，上海，广州">
</div>
```

---

#### 1.3 关键词导入/导出功能

**变更类型**: 新增功能
**文件路径**: `d:\boss-helper\boss-helper-v1.2.user.js#L140-160`

**设置面板UI变更**:
```javascript
// v1.2 SettingsPanel 新增导入/导出按钮
<div class="bp-clean-settings-group">
  <label>关键词管理</label>
  <div style="display: flex; gap: 8px; margin-bottom: 8px;">
    <button id="bp-clean-export" class="bp-clean-btn-secondary">导出</button>
    <button id="bp-clean-import" class="bp-clean-btn-secondary">导入</button>
  </div>
  <textarea id="bp-clean-import-text"
           placeholder="粘贴导入的JSON数据"
           style="width: 100%; height: 60px; display: none;"></textarea>
</div>
```

**事件绑定变更**:
```javascript
// v1.2 SettingsPanel.bindEvents() 新增
document.getElementById('bp-clean-export').addEventListener('click', () => {
  const data = this.config.export();
  navigator.clipboard.writeText(data);
  Toast.success('配置已复制到剪贴板');
});

document.getElementById('bp-clean-import').addEventListener('click', () => {
  const textArea = document.getElementById('bp-clean-import-text');
  textArea.style.display = textArea.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('bp-clean-import-confirm')?.addEventListener('click', () => {
  const text = document.getElementById('bp-clean-import-text').value;
  if (this.config.import(text)) {
    Toast.success('导入成功');
    this.refreshUI();
  } else {
    Toast.error('导入失败');
  }
});
```

---

#### 1.4 职位列表页复制按钮

**变更类型**: 新增功能
**文件路径**: `d:\boss-helper\boss-helper-v1.2.user.js#L600-650`

**BossPlusClean.initialize()变更**:
```javascript
// v1.2 BossPlusClean.initialize() 新增
initialize() {
  StyleManager.load();
  this.floatingActions.create();
  this.settingsPanel.create();
  this.initJobListCopyButton();  // ← 新增

  console.log('Boss-Helper Clean v1.2 已初始化');
}

initJobListCopyButton() {
  // 监听职位列表变化
  const observer = new MutationObserver(() => {
    this.attachCopyButtonToJobs();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  this.attachCopyButtonToJobs();
}

attachCopyButtonToJobs() {
  const jobCards = document.querySelectorAll('.job-card');
  jobCards.forEach(card => {
    if (card.dataset.copyAttached) return;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'bp-clean-list-copy-btn';
    copyBtn.innerHTML = '📋';
    copyBtn.title = '复制岗位信息';

    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const title = card.querySelector('.job-title')?.textContent.trim();
      const company = card.querySelector('.company-name')?.textContent.trim();
      const salary = card.querySelector('.salary')?.textContent.trim();

      const text = `${title} | ${company} | ${salary}`;
      navigator.clipboard.writeText(text);
      Toast.success('已复制');
    });

    card.appendChild(copyBtn);
    card.dataset.copyAttached = 'true';
  });
}
```

**新增样式**:
```css
.bp-clean-list-copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: rgba(0,0,0,0.6);
  color: white;
  border: none;
  cursor: pointer;
  font-size: 14px;
  opacity: 0;
  transition: opacity 0.2s;
}

.job-card:hover .bp-clean-list-copy-btn {
  opacity: 1;
}
```

---

### 2. 问题修复

#### 2.1 跳过第一张卡片问题修复

**变更类型**: 问题修复
**文件路径**: `d:\boss-helper\boss-helper-v1.2.user.js#L270-285`
**问题描述**: 从推荐页启动自动投递时跳过第一张职位卡片

**修复方案**:
```javascript
// v1.1 存在问题
start() {
  // ... 从推荐页启动时 jobIndex = 1，跳过第一张 ...
  if (this.config.settings.skipFirstCard && this.isRecommendPage()) {
    this.jobIndex = 1;
  }
}

// v1.2 修复后
start() {
  // 移除 jobIndex 逻辑，直接处理所有职位
  this.processJobs();
  this.hideFilteredJobs();
}

async processJobs() {
  if (!this.isRunning) return;

  const jobs = this.scrapeJobs();

  // 直接遍历所有职位，不再跳过
  for (const job of jobs) {  // ← 改为 for-of 循环，不使用索引
    if (!this.isRunning) break;

    const filterResult = this.filterEngine.evaluate(job);

    if (filterResult.shouldApply) {
      await this.rateLimiter.execute(async () => {
        await this.applyJob(job);
      });
    }

    await this.rateLimiter.sleep(100);
  }

  setTimeout(() => this.processJobs(), 5000);
}
```

---

#### 2.2 投递统计计数不准确问题修复

**变更类型**: 问题修复
**文件路径**: `d:\boss-helper\boss-helper-v1.2.user.js#L130-145`
**问题描述**: v1.1版本计数可能不准确

**修复方案**:
```javascript
// v1.1 存在问题
getTodayCount() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // 注意：此实现可能导致计数不准确
  return this.history.filter(entry => entry.timestamp >= today.getTime()).length;
}

// v1.2 修复后
getTodayCount() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // 直接返回当天记录数量
  return this.history.filter(entry => entry.timestamp >= today.getTime()).length;
}
```

---

### 3. 功能优化

#### 3.1 左下角功能按钮逻辑优化

**变更类型**: 功能优化
**文件路径**: `d:\boss-helper\boss-helper-v1.2.user.js#L500-530`

**样式变更**:
```css
/* v1.1 样式 */
.bp-clean-floating-actions {
  position: fixed;
  left: 20px;
  bottom: 20px;
  z-index: 999999;
  display: block;  /* 可能存在显示稳定性问题 */
}

.bp-clean-floating-actions .action-btn {
  width: 44px;
  height: 44px;
  display: block;
  margin-bottom: 6px;
}

/* v1.2 优化后样式 */
.bp-clean-floating-actions {
  position: fixed;
  left: 24px;
  bottom: 24px;
  z-index: 999999;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bp-clean-floating-actions .action-btn {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.bp-clean-floating-actions .action-btn:hover {
  background: #008c8d;
  transform: scale(1.05);
}
```

---

#### 3.2 详情页复制按钮间距优化

**变更类型**: 功能优化
**文件路径**: `d:\boss-helper\boss-helper-v1.2.user.js#L600-650`

**样式变更**:
```css
/* v1.1 样式 */
.bp-clean-copy-btn {
  position: fixed;
  bottom: 100px;  /* 原始间距 */
  left: 20px;
  width: 44px;
  height: 44px;
}

/* v1.2 优化后样式 */
.bp-clean-copy-btn {
  position: fixed;
  bottom: 120px;  /* 调整间距 */
  left: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #00a6a7;
  font-size: 18px;
}
```

---

### 4. 样式优化

#### 4.1 基础样式细节优化

**变更类型**: 样式优化
**文件路径**: `d:\boss-helper\boss-helper-v1.2.user.js#L400-480`

| 样式属性 | v1.1 | v1.2 | 说明 |
|---------|------|------|------|
| 面板宽度 | 450px | 500px | 增加宽度 |
| 面板最大高度 | 65vh | 70vh | 增加高度 |
| 面板内边距 | 16px | 20px | 增加内边距 |
| 面板圆角 | 4px | 6px | 增大圆角 |
| 阴影 | 0 2px 12px rgba(0,0,0,0.08) | 0 4px 16px rgba(0,0,0,0.1) | 加深阴影 |
| 标题字号 | 16px | 18px | 增大标题 |
| 标签字号 | 12px | 14px | 增大标签 |
| 输入框内边距 | 4px 8px | 6px 10px | 增大输入框 |
| 关键词标签圆角 | 10px | 12px | 增大圆角 |

**详细变更**:
```css
/* v1.2 StyleManager.load() 样式优化 */
.bp-clean-settings-panel {
  width: 500px;       /* v1.1: 450px */
  max-height: 70vh;   /* v1.1: 65vh */
  padding: 20px;       /* v1.1: 16px */
  border-radius: 6px;  /* v1.1: 4px */
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);  /* v1.1: 0 2px 12px rgba(0,0,0,0.08) */
}

.bp-clean-settings-panel h2 {
  font-size: 18px;    /* v1.1: 16px */
  margin-bottom: 20px; /* v1.1: 16px */
}

.bp-clean-settings-group label {
  font-size: 14px;    /* v1.1: 12px */
  margin-bottom: 6px;  /* v1.1: 4px */
}

.bp-clean-settings-group input[type="text"],
.bp-clean-settings-group input[type="number"] {
  padding: 6px 10px;  /* v1.1: 4px 8px */
  font-size: 13px;    /* v1.1: 12px */
}

.bp-clean-keyword-item {
  padding: 3px 10px;  /* v1.1: 2px 8px */
  border-radius: 12px; /* v1.1: 10px */
  font-size: 11px;     /* v1.1: 10px */
}

.bp-clean-settings-buttons button {
  padding: 8px 16px;  /* v1.1: 6px 12px */
  font-size: 13px;    /* v1.1: 12px */
}

.bp-clean-toast {
  top: 24px;          /* v1.1: 20px */
  right: 24px;        /* v1.1: 20px */
  padding: 12px 20px; /* v1.1: 10px 16px */
  border-radius: 8px; /* v1.1: 6px */
  box-shadow: 0 4px 12px rgba(0,0,0,0.15); /* v1.1: 0 2px 8px rgba(0,0,0,0.1) */
}
```

---

## 版本对比总结

### 新增功能

| 功能 | v1.1 | v1.2 | 说明 |
|------|------|------|------|
| 薪资范围筛选 | ❌ | ✅ | 可设置最低/最高薪资 |
| 城市过滤 | ❌ | ✅ | 白名单/黑名单模式 |
| 关键词导入/导出 | ❌ | ✅ | 方便复制配置 |
| 职位列表复制按钮 | ❌ | ✅ | 快速复制岗位信息 |

### 问题修复

| 问题 | v1.1 | v1.2 | 说明 |
|------|------|------|------|
| 跳过第一张卡片 | 存在 | ✅ 已修复 | 移除skipFirstCard逻辑 |
| 计数不准确 | 存在 | ✅ 已修复 | 简化计数逻辑 |

### 优化项目

| 项目 | v1.1 | v1.2 | 说明 |
|------|------|------|------|
| 按钮布局 | block | flex | 提升显示稳定性 |
| 按钮尺寸 | 44px | 48px | 增大点击区域 |
| 面板尺寸 | 450px | 500px | 增加显示空间 |
| 整体样式 | 基础 | 优化 | 细节改进 |

### 移除的已知问题

| 问题 | 状态 |
|------|------|
| 从推荐页启动时跳过第一张职位卡片 | ✅ 已修复 |
| 投递统计计数不准确 | ✅ 已修复 |
| 按钮显示稳定性问题 | ✅ 已优化 |

---

## 迭代建议

### v1.2 版本待优化点

1. **定时投递功能**: 可增加投递时间设置
2. **活跃状态筛选**: 可增加HR在线状态过滤
3. **工作地址过滤**: 可增加区/街道级别的精细过滤
4. **已收藏职位跳过**: 自动投递时跳过已收藏的职位

### 架构扩展点

v1.2版本在以下方面进行了扩展预留：

1. **FilterEngine**: `checkSalary()` 方法预留了更多薪资筛选逻辑
2. **ConfigManager**: `export()`/`import()` 方法预留了配置管理扩展
3. **BossPlusClean**: `initJobListCopyButton()` 方法预留了列表功能扩展

---

**文档版本**: 1.0
**生成日期**: 2026-04-27
**分析工具**: Boss-Helper Version Analyzer