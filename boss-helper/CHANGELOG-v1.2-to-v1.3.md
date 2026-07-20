# Boss-Helper Clean 版本更新日志

## v1.2 到 v1.3 版本变更说明

**更新日期**: 2026-04-27
**版本范围**: boss-helper-v1.2.user.js → boss-helper-v1.3.user.js
**变更类型**: 新增功能、功能优化、问题修复

---

## 变更总览

| 变更类别 | 变更内容 | 文件路径 | 行号 |
|---------|---------|---------|------|
| **新增功能** | 定时投递功能 | v1.3#L1-100 | 70-80 |
| **新增功能** | 活跃状态筛选 | v1.3#L1-100 | 82-90 |
| **新增功能** | 工作地址过滤 | v1.3#L1-100 | 92-100 |
| **新增功能** | 跳过已收藏职位 | v1.3#L1-100 | 102-105 |
| **问题修复** | 投递统计计数逻辑 | v1.3#L130-145 | 130-145 |
| **问题修复** | 嵌套模态框滚动错误 | v1.3#L600-650 | 600-650 |
| **功能优化** | 设置面板UI细节 | v1.3#L700-800 | 700-800 |

---

## 详细变更说明

### 1. 新增功能

#### 1.1 定时投递功能

**变更类型**: 新增功能
**文件路径**: `d:\boss-helper\boss-helper-v1.3.user.js`
**功能描述**: 支持设置每日投递时间，到点后自动启动投递

**配置变更** (v1.3#L70-80):
```javascript
// v1.2 配置 (无定时投递)
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

// v1.3 配置 (新增定时投递)
DEFAULT_SETTINGS: {
  autoApply: false,
  rateLimit: 3000,
  excludeKeywords: [],
  companyBlacklist: [],
  maxApplications: 50,
  salaryRange: {
    min: 0,
    max: 99999
  },
  workTime: {
    start: '09:00',
    end: '18:00'
  }
}
```

**过滤引擎变更** (v1.3#L220-260):
```javascript
// v1.3 FilterEngine.evaluate() 新增工作时间检查
evaluate(job) {
  // 检查是否已投递
  if (this.config.history.hasApplied(job.id)) {
    return { shouldApply: false, reason: '已投递' };
  }

  // 检查公司黑名单
  if (this.config.settings.companyBlacklist.includes(job.company)) {
    return { shouldApply: false, reason: '公司在黑名单中' };
  }

  // 检查排除关键词
  const searchText = `${job.title} ${job.company} ${job.description}`.toLowerCase();
  for (const keyword of this.config.settings.excludeKeywords) {
    if (searchText.includes(keyword.toLowerCase())) {
      return { shouldApply: false, reason: `包含排除关键词: ${keyword}` };
    }
  }

  // 检查薪资范围
  if (!this.checkSalary(job.salary)) {
    return { shouldApply: false, reason: '薪资范围不符合要求' };
  }

  // 检查每日投递限制
  if (this.config.history.getTodayCount() >= this.config.settings.maxApplications) {
    return { shouldApply: false, reason: '达到每日投递限制' };
  }

  // 检查工作时间 ← 新增
  if (!this.isWorkingHours()) {
    return { shouldApply: false, reason: '非工作时间' };
  }

  return { shouldApply: true, reason: '通过所有过滤条件' };
}

// v1.3 新增方法
isWorkingHours() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [startHour, startMinute] = this.config.settings.workTime.start.split(':').map(Number);
  const [endHour, endMinute] = this.config.settings.workTime.end.split(':').map(Number);
  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  return currentTime >= startTime && currentTime <= endTime;
}
```

**设置面板UI变更** (v1.3#L700-800):
```javascript
// v1.3 SettingsPanel 新增工作时间设置UI
<div class="bp-clean-settings-group">
  <label>工作时间</label>
  <div style="display: flex; gap: 12px;">
    <div style="flex: 1;">
      <label>开始时间</label>
      <input type="time" id="bp-clean-work-start"
             value="${this.config.get('workTime').start}">
    </div>
    <div style="flex: 1;">
      <label>结束时间</label>
      <input type="time" id="bp-clean-work-end"
             value="${this.config.get('workTime').end}">
    </div>
  </div>
</div>

<div class="bp-clean-settings-group">
  <label>
    <input type="checkbox" id="bp-clean-enable-timed-apply">
    启用定时投递
  </label>
  <small style="color: #666;">启用后将在工作时间内自动投递</small>
</div>
```

**自动投递器变更**:
```javascript
// v1.3 BossPlusClean 新增定时投递逻辑
class BossPlusClean {
  constructor() {
    // ... 原有属性 ...
    this.scheduledTimer = null;  // 定时器ID
  }

  initialize() {
    StyleManager.load();
    this.floatingActions.create();
    this.settingsPanel.create();
    this.initScheduledApply();  // ← 新增定时投递初始化

    console.log('Boss-Helper Clean v1.3 已初始化');
  }

  initScheduledApply() {
    // 检查是否启用了定时投递
    if (this.config.get('enableTimedApply')) {
      this.scheduleNextRun();
    }
  }

  scheduleNextRun() {
    // 清除之前的定时器
    if (this.scheduledTimer) {
      clearTimeout(this.scheduledTimer);
    }

    const checkAndApply = () => {
      if (this.config.get('enableTimedApply') &&
          this.filterEngine.isWorkingHours() &&
          !this.autoApplier.isRunning) {
        this.autoApplier.start();
        Toast.info('定时投递已启动');
      }
      this.scheduleNextRun();
    };

    // 每分钟检查一次
    this.scheduledTimer = setTimeout(checkAndApply, 60000);
  }
}
```

---

#### 1.2 活跃状态筛选功能

**变更类型**: 新增功能
**文件路径**: `d:\boss-helper\boss-helper-v1.3.user.js#L82-90`

**配置变更**:
```javascript
// v1.3 配置新增活跃状态筛选
DEFAULT_SETTINGS: {
  // ... 原有配置 ...
  activityFilter: {
    enabled: false,
    modes: []  // 可选: 'online', 'justActive', 'todayActive', 'threeDaysActive'
  }
}
```

**设置面板UI变更**:
```javascript
// v1.3 SettingsPanel 新增活跃状态筛选UI
<div class="bp-clean-settings-group">
  <label>
    <input type="checkbox" id="bp-clean-enable-activity-filter">
    启用活跃状态筛选
  </label>
</div>

<div class="bp-clean-settings-group" id="bp-clean-activity-options"
     style="display: none;">
  <label>筛选条件</label>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <label>
      <input type="checkbox" value="online" class="activity-mode">
      HR 在线
    </label>
    <label>
      <input type="checkbox" value="justActive" class="activity-mode">
      刚刚活跃
    </label>
    <label>
      <input type="checkbox" value="todayActive" class="activity-mode">
      今日活跃
    </label>
    <label>
      <input type="checkbox" value="threeDaysActive" class="activity-mode">
      3日内活跃
    </label>
  </div>
</div>
```

**过滤引擎变更**:
```javascript
// v1.3 FilterEngine 新增活跃状态检查
evaluate(job) {
  // ... 原有检查逻辑 ...

  // 检查活跃状态 ← 新增
  if (this.config.settings.activityFilter?.enabled) {
    if (!this.checkActivityStatus(job)) {
      return { shouldApply: false, reason: 'HR活跃状态不符合要求' };
    }
  }

  return { shouldApply: true, reason: '通过所有过滤条件' };
}

checkActivityStatus(job) {
  const modes = this.config.settings.activityFilter.modes;
  if (!modes || modes.length === 0) return true;

  // 获取HR活跃状态
  const activityBadge = job.element?.querySelector('.activity-badge');
  if (!activityBadge) return true;

  const activityText = activityBadge.textContent.toLowerCase();

  for (const mode of modes) {
    switch (mode) {
      case 'online':
        if (activityText.includes('在线')) return true;
        break;
      case 'justActive':
        if (activityText.includes('刚刚活跃') || activityText.includes('刚刚在线')) return true;
        break;
      case 'todayActive':
        if (activityText.includes('今日活跃') || activityText.includes('今日在线')) return true;
        break;
      case 'threeDaysActive':
        if (activityText.includes('3日内活跃') || activityText.includes('3日内在线')) return true;
        break;
    }
  }

  return false;
}
```

---

#### 1.3 工作地址过滤功能

**变更类型**: 新增功能
**文件路径**: `d:\boss-helper\boss-helper-v1.3.user.js#L92-100`

**配置变更**:
```javascript
// v1.3 配置新增工作地址过滤
DEFAULT_SETTINGS: {
  // ... 原有配置 ...
  addressFilter: {
    enabled: false,
    mode: 'blacklist',  // 'whitelist' | 'blacklist'
    levels: ['district', 'street', 'park'],  // 过滤级别
    keywords: []  // 地址关键词
  }
}
```

**过滤引擎变更**:
```javascript
// v1.3 FilterEngine 新增工作地址检查
evaluate(job) {
  // ... 原有检查逻辑 ...

  // 检查工作地址 ← 新增
  if (this.config.settings.addressFilter?.enabled) {
    if (!this.checkAddress(job)) {
      return { shouldApply: false, reason: '工作地址不符合要求' };
    }
  }

  return { shouldApply: true, reason: '通过所有过滤条件' };
}

checkAddress(job) {
  const { mode, keywords } = this.config.settings.addressFilter;
  if (!keywords || keywords.length === 0) return true;

  const address = job.address || '';
  const addressLower = address.toLowerCase();

  // 支持正则表达式
  for (const keyword of keywords) {
    try {
      const isRegex = keyword.startsWith('/') && keyword.endsWith('/');
      if (isRegex) {
        const regex = new RegExp(keyword.slice(1, -1));
        if (regex.test(address)) {
          return mode === 'whitelist';
        }
      } else {
        if (addressLower.includes(keyword.toLowerCase())) {
          return mode === 'whitelist';
        }
      }
    } catch (e) {
      // 正则表达式错误，忽略
    }
  }

  return mode === 'blacklist';
}
```

**设置面板UI变更**:
```javascript
// v1.3 SettingsPanel 新增工作地址过滤UI
<div class="bp-clean-settings-group">
  <label>
    <input type="checkbox" id="bp-clean-enable-address-filter">
    启用工作地址过滤
  </label>
</div>

<div class="bp-clean-settings-group" id="bp-clean-address-options"
     style="display: none;">
  <label>过滤模式</label>
  <select id="bp-clean-address-mode">
    <option value="blacklist">黑名单模式（排除包含关键词的地址）</option>
    <option value="whitelist">白名单模式（只看包含关键词的地址）</option>
  </select>

  <label style="margin-top: 12px;">地址关键词</label>
  <div class="bp-clean-keyword-list" id="bp-clean-address-keywords"></div>
  <input type="text" id="bp-clean-add-address"
         placeholder="添加地址关键词，支持正则表达式，如：朝阳区/科技园"
         style="margin-top: 8px;">

  <label style="margin-top: 12px;">过滤级别</label>
  <div style="display: flex; gap: 12px;">
    <label>
      <input type="checkbox" value="district" class="address-level">
      区
    </label>
    <label>
      <input type="checkbox" value="street" class="address-level">
      街道
    </label>
    <label>
      <input type="checkbox" value="park" class="address-level">
      园区
    </label>
  </div>
</div>
```

---

#### 1.4 跳过已收藏职位功能

**变更类型**: 新增功能
**文件路径**: `d:\boss-helper\boss-helper-v1.3.user.js#L102-105`

**配置变更**:
```javascript
// v1.3 配置新增跳过已收藏职位
DEFAULT_SETTINGS: {
  // ... 原有配置 ...
  skipFavorited: true  // 自动投递时跳过已收藏的职位
}
```

**过滤引擎变更**:
```javascript
// v1.3 FilterEngine.evaluate() 新增已收藏检查
evaluate(job) {
  // ... 原有检查逻辑 ...

  // 检查是否已收藏 ← 新增
  if (this.config.settings.skipFavorited && this.isFavorited(job)) {
    return { shouldApply: false, reason: '已收藏的职位' };
  }

  return { shouldApply: true, reason: '通过所有过滤条件' };
}

isFavorited(job) {
  // 检查页面是否存在收藏按钮或已收藏标记
  const favoriteBtn = job.element?.querySelector('.btn-collect, .collected');
  return favoriteBtn !== null;
}
```

**设置面板UI变更**:
```javascript
// v1.3 SettingsPanel 新增跳过已收藏选项
<div class="bp-clean-settings-group">
  <label>
    <input type="checkbox" id="bp-clean-skip-favorited"
           ${this.config.get('skipFavorited') ? 'checked' : ''}>
    自动投递时跳过已收藏的职位
  </label>
</div>
```

---

### 2. 问题修复

#### 2.1 投递统计计数逻辑修复

**变更类型**: 问题修复
**文件路径**: `d:\boss-helper\boss-helper-v1.3.user.js#L130-145`
**问题描述**: 投递统计计数应该只在成功投递后才记录

**修复方案**:
```javascript
// v1.2 投递记录逻辑
async applyJob(job) {
  try {
    job.applyButton.click();
    // 回滚投递统计计数逻辑：不限制仅成功投递才记录
    this.config.history.add(job.id, job.company, job.title);  // ← 每次点击都记录
    console.log(`已投递: ${job.title} - ${job.company}`);
  } catch (error) {
    console.error(`投递失败: ${error.message}`);
  }
}

// v1.3 投递记录逻辑（仅成功投递才记录）
async applyJob(job) {
  try {
    // 尝试点击投递按钮
    const wasClicked = this.attemptClick(job.applyButton);

    // 检查是否真正投递成功
    if (wasClicked && this.verifyDelivery(job)) {
      this.config.history.add(job.id, job.company, job.title);  // ← 仅成功投递才记录
      console.log(`已投递: ${job.title} - ${job.company}`);
    }
  } catch (error) {
    console.error(`投递失败: ${error.message}`);
  }
}

verifyDelivery(job) {
  // 验证投递是否成功
  // 检查是否出现成功提示或状态变化
  const successIndicator = document.querySelector('.apply-success, . delivered');
  return successIndicator !== null;
}
```

---

#### 2.2 嵌套模态框滚动错误修复

**变更类型**: 问题修复
**文件路径**: `d:\boss-helper\boss-helper-v1.3.user.js#L600-650`

**问题描述**: 嵌套模态框关闭后页面滚动被错误恢复

**修复方案**:
```javascript
// v1.3 BossPlusClean 修复嵌套模态框滚动问题
class BossPlusClean {
  constructor() {
    // ... 原有属性 ...
    this.scrollPosition = 0;  // 记录滚动位置
  }

  initialize() {
    // ... 原有初始化 ...

    // 修复模态框滚动问题
    this.fixModalScrollIssue();
  }

  fixModalScrollIssue() {
    // 监听模态框关闭事件
    document.addEventListener('click', (e) => {
      // 检测是否点击了模态框关闭按钮
      if (e.target.closest('.modal-close, .modal-backdrop')) {
        // 延迟恢复滚动，确保模态框已关闭
        setTimeout(() => {
          // 明确重置body滚动状态
          document.body.style.overflow = '';
          document.body.style.position = '';
          document.body.style.top = '';

          // 恢复滚动位置
          if (this.scrollPosition > 0) {
            window.scrollTo(0, this.scrollPosition);
            this.scrollPosition = 0;
          }
        }, 100);
      }
    });

    // 记录打开模态框前的滚动位置
    document.addEventListener('scroll', () => {
      // 检测是否有模态框打开
      const hasOpenModal = document.querySelector('.modal[style*="display: block"], .overlay.open');
      if (hasOpenModal) {
        this.scrollPosition = window.pageYOffset;
      }
    }, { passive: true });
  }
}
```

---

### 3. 功能优化

#### 3.1 设置面板UI细节优化

**变更类型**: 功能优化
**文件路径**: `d:\boss-helper\boss-helper-v1.3.user.js#L700-800`

**样式变更**:
```css
/* v1.2 样式 */
.bp-clean-settings-panel {
  width: 500px;
  max-height: 70vh;
  padding: 20px;
}

/* v1.3 优化后样式 */
.bp-clean-settings-panel {
  width: 600px;       /* v1.2: 500px - 增加宽度 */
  max-height: 80vh;    /* v1.2: 70vh - 增加高度 */
  padding: 24px;       /* v1.2: 20px - 增加内边距 */
  border-radius: 8px;  /* v1.2: 6px - 增大圆角 */
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);  /* v1.2: 0 4px 16px rgba(0,0,0,0.1) - 加深阴影 */
}
```

**输入框样式变更**:
```css
/* v1.2 样式 */
.bp-clean-settings-group input[type="text"],
.bp-clean-settings-group input[type="number"],
.bp-clean-settings-group input[type="range"] {
  padding: 6px 10px;
  font-size: 13px;
}

/* v1.3 优化后样式 */
.bp-clean-settings-group input[type="text"],
.bp-clean-settings-group input[type="number"],
.bp-clean-settings-group input[type="range"],
.bp-clean-settings-group input[type="time"] {
  padding: 8px 12px;  /* v1.2: 6px 10px */
  font-size: 14px;     /* v1.2: 13px */
  border-radius: 4px;   /* v1.2: 3px */
}
```

**关键词列表样式变更**:
```css
/* v1.2 样式 */
.bp-clean-keyword-list {
  min-height: 60px;
  padding: 6px;
}

/* v1.3 优化后样式 */
.bp-clean-keyword-list {
  min-height: 80px;   /* v1.2: 60px */
  padding: 8px;        /* v1.2: 6px */
}

.bp-clean-keyword-item {
  padding: 4px 12px;  /* v1.2: 3px 10px */
  margin: 4px;        /* v1.2: 3px */
}
```

**遮罩层样式变更**:
```css
/* v1.2 样式 */
.bp-clean-overlay {
  background: rgba(0,0,0,0.4);
}

/* v1.3 优化后样式 */
.bp-clean-overlay {
  background: rgba(0,0,0,0.5);  /* v1.2: 0.4 - 加深遮罩 */
}
```

---

## 版本对比总结

### 新增功能

| 功能 | v1.2 | v1.3 | 说明 |
|------|------|------|------|
| 定时投递 | ❌ | ✅ | 支持设置每日投递时间 |
| 活跃状态筛选 | ❌ | ✅ | HR在线/刚刚活跃/今日活跃/3日内活跃 |
| 工作地址过滤 | ❌ | ✅ | 区/街道/园区级别，支持正则 |
| 跳过已收藏职位 | ❌ | ✅ | 自动跳过已标记的职位 |

### 问题修复

| 问题 | v1.2 | v1.3 | 说明 |
|------|------|------|------|
| 投递统计计数逻辑 | 每次点击都记录 | 仅成功投递才记录 | 更准确的统计 |
| 嵌套模态框滚动错误 | 存在 | ✅ 已修复 | 正确恢复滚动位置 |

### UI优化

| 项目 | v1.2 | v1.3 | 说明 |
|------|------|------|------|
| 面板宽度 | 500px | 600px | 更大显示空间 |
| 面板高度 | 70vh | 80vh | 更多内容 |
| 输入框 | 6px 10px | 8px 12px | 更大点击区域 |
| 遮罩透明度 | 0.4 | 0.5 | 更强遮罩 |

---

## 迭代建议

### v1.3 版本待优化点

1. **跳过已沟通公司**: 投递时自动跳过同一家公司
2. **岗位关键词白名单模式**: 只投标题命中的岗位
3. **设置面板侧边栏布局**: 改为右侧边栏，更方便操作
4. **薪资范围按K填写**: 改为10-20表示10K-20K

### 架构扩展点

v1.3版本在以下方面进行了扩展：

1. **过滤引擎**: 新增`isWorkingHours()`, `checkActivityStatus()`, `checkAddress()`等方法
2. **配置系统**: 新增`workTime`, `activityFilter`, `addressFilter`, `skipFavorited`等配置项
3. **BossPlusClean**: 新增定时投递调度逻辑

---

**文档版本**: 1.0
**生成日期**: 2026-04-27
**分析工具**: Boss-Helper Version Analyzer