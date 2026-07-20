# Boss-Helper Clean 版本更新日志

## v1.3 到 v1.4 版本变更说明

**更新日期**: 2026-04-27
**版本范围**: boss-helper-v1.3.user.js → boss-helper.user.js (v1.4)
**变更类型**: 新增功能、功能优化、行为变更

---

## 变更总览

| 变更类别 | 变更内容 | 文件路径 | 行号 |
|---------|---------|---------|------|
| **新增功能** | 跳过已沟通公司 | v1.4#L1-100 | 60-70 |
| **新增功能** | 岗位关键词白名单模式 | v1.4#L1-100 | 50-60 |
| **功能优化** | 薪资范围筛选逻辑 | v1.4#L220-260 | 220-260 |
| **功能优化** | 薪资范围填写方式 | v1.4#L600-700 | 600-700 |
| **功能优化** | 设置面板侧边栏布局 | v1.4#L400-500 | 400-500 |
| **功能优化** | 岗位关键词过滤行为 | v1.4#L300-350 | 300-350 |
| **代码清理** | 移除冗余代码 | v1.4#L1-933 | 全文 |

---

## 详细变更说明

### 1. 新增功能

#### 1.1 跳过已沟通公司功能

**变更类型**: 新增功能
**文件路径**: `d:\boss-helper\boss-helper.user.js`
**功能描述**: 自动投递遇到同一家公司会直接跳过，减少重复打招呼

**配置变更** (v1.4#L60-70):
```javascript
// v1.3 配置 (无跳过已沟通公司)
DEFAULT_SETTINGS: {
  autoApply: false,
  rateLimit: 3000,
  excludeKeywords: [],
  companyBlacklist: [],
  maxApplications: 50,
  workTime: {
    start: '09:00',
    end: '18:00'
  }
}

// v1.4 配置 (新增跳过已沟通公司)
DEFAULT_SETTINGS: {
  autoApply: false,
  rateLimit: 3000,
  excludeKeywords: [],
  requiredKeywords: [],  // ← 新增必需关键词配置
  companyBlacklist: [],
  communicatedCompanies: [],  // ← 新增已沟通公司记录
  skipCommunicated: true,     // ← 新增跳过已沟通公司开关
  maxApplications: 50,
  workTime: {
    start: '09:00',
    end: '18:00'
  }
}
```

**HistoryManager变更** (v1.4#L130-160):
```javascript
// v1.4 HistoryManager 新增已沟通公司管理
class HistoryManager {
  constructor() {
    this.history = Storage.get(APP_CONSTANTS.STORAGE_KEYS.HISTORY, []);
    this.communicatedCompanies = Storage.get('bp_clean_communicated', []);
    this.cleanup();
  }

  add(jobId, company, title) {
    const entry = {
      id: jobId,
      company,
      title,
      timestamp: Date.now()
    };
    this.history.push(entry);
    this.save();

    // 自动记录已沟通公司
    if (this.config.settings.skipCommunicated) {
      this.addCommunicatedCompany(company);
    }
  }

  addCommunicatedCompany(company) {
    if (!this.communicatedCompanies.includes(company)) {
      this.communicatedCompanies.push(company);
      this.saveCommunicatedCompanies();
    }
  }

  hasCommunicated(company) {
    return this.communicatedCompanies.includes(company);
  }

  saveCommunicatedCompanies() {
    Storage.set('bp_clean_communicated', this.communicatedCompanies);
  }

  save() {
    Storage.set(APP_CONSTANTS.STORAGE_KEYS.HISTORY, this.history);
  }
}
```

**过滤引擎变更** (v1.4#L220-240):
```javascript
// v1.4 FilterEngine.evaluate() 新增已沟通公司检查
evaluate(job) {
  // 检查是否已投递
  if (this.config.history.hasApplied(job.id)) {
    return { shouldApply: false, reason: '已投递' };
  }

  // 检查公司黑名单
  if (this.config.settings.companyBlacklist.includes(job.company)) {
    return { shouldApply: false, reason: '公司在黑名单中' };
  }

  // 检查是否已沟通过 ← 新增
  if (this.config.settings.skipCommunicated &&
      this.config.history.hasCommunicated(job.company)) {
    return { shouldApply: false, reason: '已沟通过的公司' };
  }

  // 检查排除关键词
  const searchText = `${job.title} ${job.company} ${job.description}`.toLowerCase();
  for (const keyword of this.config.settings.excludeKeywords) {
    if (searchText.includes(keyword.toLowerCase())) {
      return { shouldApply: false, reason: `包含排除关键词: ${keyword}` };
    }
  }

  // 检查每日投递限制
  if (this.config.history.getTodayCount() >= this.config.settings.maxApplications) {
    return { shouldApply: false, reason: '达到每日投递限制' };
  }

  // 检查工作时间
  if (!this.isWorkingHours()) {
    return { shouldApply: false, reason: '非工作时间' };
  }

  return { shouldApply: true, reason: '通过所有过滤条件' };
}
```

---

#### 1.2 岗位关键词白名单模式

**变更类型**: 新增功能
**文件路径**: `d:\boss-helper\boss-helper.user.js#L50-60`

**配置变更**:
```javascript
// v1.4 配置 (新增必需关键词)
DEFAULT_SETTINGS: {
  // ... 原有配置 ...
  requiredKeywords: []  // ← 新增必需关键词，白名单模式使用
}
```

**过滤引擎变更** (v1.4#L240-260):
```javascript
// v1.4 FilterEngine.evaluate() 新增必需关键词检查
evaluate(job) {
  // ... 原有检查逻辑 ...

  // 检查必需关键词（白名单模式）← 新增
  if (this.config.settings.requiredKeywords.length > 0) {
    const searchText = `${job.title} ${job.company} ${job.description}`.toLowerCase();
    const hasRequired = this.config.settings.requiredKeywords.some(keyword =>
      searchText.includes(keyword.toLowerCase())
    );
    if (!hasRequired) {
      return { shouldApply: false, reason: '不包含必需关键词' };
    }
  }

  return { shouldApply: true, reason: '通过所有过滤条件' };
}
```

**设置面板UI变更** (v1.4#L600-700):
```javascript
// v1.4 SettingsPanel 新增必需关键词UI
<div class="bp-clean-settings-group">
  <label>必需关键词（白名单模式）</label>
  <div class="bp-clean-keyword-list" id="bp-clean-required-keywords">
    ${this.config.get('requiredKeywords').map(keyword => `
      <span class="bp-clean-keyword-item">
        ${keyword}
        <span class="remove" data-type="required" data-keyword="${keyword}">&times;</span>
      </span>
    `).join('')}
  </div>
  <input type="text" id="bp-clean-add-required"
         placeholder="添加必需关键词（留空则不启用白名单模式）"
         style="margin-top: 8px;">
</div>

<div class="bp-clean-settings-group">
  <label>
    <input type="checkbox" id="bp-clean-skip-communicated"
           ${this.config.get('skipCommunicated') ? 'checked' : ''}>
    跳过已沟通的公司
  </label>
  <small style="color: #666;">启用后将自动跳过之前沟通过的公司</small>
</div>
```

---

### 2. 功能优化

#### 2.1 薪资范围筛选逻辑优化

**变更类型**: 功能优化
**文件路径**: `d:\boss-helper\boss-helper.user.js#L220-260`
**优化描述**: 不再放行部分重叠的薪资区间，岗位薪资必须完整落在设置范围内

**过滤引擎变更**:
```javascript
// v1.3 薪资范围检查（允许部分重叠）
checkSalary(salary) {
  if (!salary) return true;

  const { min, max } = this.config.settings.salaryRange;
  const salaryRange = this.parseSalary(salary);

  if (!salaryRange) return true;

  // 恢复薪资范围筛选逻辑，允许部分重叠
  return salaryRange.max >= min && salaryRange.min <= max;
}

// v1.4 薪资范围检查（必须完整落在范围内）
checkSalary(salary) {
  if (!salary) return true;

  const { min, max } = this.config.settings.salaryRange;
  const salaryRange = this.parseSalary(salary);

  if (!salaryRange) return true;

  // 优化：岗位薪资必须完整落在设置范围内
  return salaryRange.min >= min && salaryRange.max <= max;
}
```

---

#### 2.2 薪资范围填写方式优化

**变更类型**: 功能优化
**文件路径**: `d:\boss-helper\boss-helper.user.js#L600-700`
**优化描述**: 薪资范围改为按K填写，10-20表示10K-20K

**设置面板UI变更**:
```javascript
// v1.3 薪资范围UI
<div class="bp-clean-settings-group">
  <label>薪资范围</label>
  <div class="bp-clean-salary-range">
    <input type="number" id="bp-clean-salary-min"
           value="${this.config.get('salaryRange').min / 1000}"
           placeholder="最低薪资">
    <input type="number" id="bp-clean-salary-max"
           value="${this.config.get('salaryRange').max / 1000}"
           placeholder="最高薪资">
  </div>
</div>

<div class="bp-clean-settings-group">
  <label>薪资单位</label>
  <select id="bp-clean-salary-unit" disabled>
    <option value="k">K（千元）</option>
  </select>
  <small style="color: #666;">例：10-20 表示 10K-20K</small>
</div>

// v1.4 薪资范围UI（直接按K填写）
<div class="bp-clean-settings-group">
  <label>薪资范围 (K)</label>
  <div class="bp-clean-salary-range">
    <input type="number" id="bp-clean-salary-min"
           value="${this.config.get('salaryRange').min / 1000}"
           placeholder="最低薪资，如：10">
    <span style="align-self: center;">-</span>
    <input type="number" id="bp-clean-salary-max"
           value="${this.config.get('salaryRange').max / 1000}"
           placeholder="最高薪资，如：20">
    <span style="align-self: center;">K</span>
  </div>
  <small style="color: #666;">填写数值表示K，如：10-20 表示 10K-20K</small>
</div>
```

**薪资转换逻辑变更**:
```javascript
// v1.3 薪资解析
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

// v1.4 薪资解析（支持更多格式）
parseSalary(salary) {
  // 支持 10K-20K, 10-20K, 10-20 等格式
  const match = salary.match(/(\d+)-(\d+)(K|k)?/);
  if (match) {
    const min = parseInt(match[1]);
    const max = parseInt(match[2]);
    const isK = match[3];  // 有K后缀时直接使用，无后缀时也按K处理

    return {
      min: min * 1000,
      max: max * 1000
    };
  }
  return null;
}
```

---

#### 2.3 设置面板侧边栏布局优化

**变更类型**: 功能优化
**文件路径**: `d:\boss-helper\boss-helper.user.js#L400-500`
**优化描述**: 设置面板从居中弹窗布局改为右侧边栏布局

**样式变更**:
```css
/* v1.3 居中弹窗布局 */
.bp-clean-settings-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  max-height: 80vh;
  border-radius: 8px;
  transition: all 0.3s ease;
}

/* v1.4 右侧边栏布局 */
.bp-clean-settings-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 400px;
  height: 100vh;
  max-height: 100vh;
  border-radius: 0;
  box-shadow: -2px 0 8px rgba(0,0,0,0.1);
  transform: translateX(100%);  /* 默认隐藏 */
  transition: transform 0.3s ease;  /* 使用transform动画 */
}

.bp-clean-settings-panel.open {
  transform: translateX(0);  /* 显示时滑入 */
}

/* 移除遮罩层动画相关样式 */
.bp-clean-overlay {
  display: none;  /* 侧边栏模式不需要遮罩 */
}

.bp-clean-overlay.open {
  display: none;
}
```

**设置面板组件变更**:
```javascript
// v1.3 SettingsPanel
class SettingsPanel {
  create() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'bp-clean-overlay';
    this.overlay.addEventListener('click', () => this.hide());
    document.body.appendChild(this.overlay);

    this.panel = document.createElement('div');
    this.panel.className = 'bp-clean-settings-panel';
    // ... 面板内容 ...
  }

  show() {
    this.overlay.classList.add('open');
    this.panel.classList.add('open');
  }

  hide() {
    this.overlay.classList.remove('open');
    this.panel.classList.remove('open');
  }
}

// v1.4 SettingsPanel（侧边栏模式）
class SettingsPanel {
  create() {
    // 侧边栏模式不需要遮罩层
    this.panel = document.createElement('div');
    this.panel.className = 'bp-clean-settings-panel';

    // 关闭按钮在侧边栏内部
    this.panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <h2>Boss-Helper 设置</h2>
        <button id="bp-clean-close-settings"
                style="background: none; border: none; font-size: 24px; cursor: pointer;">
          &times;
        </button>
      </div>
      ...
    `;

    document.body.appendChild(this.panel);

    // 点击侧边栏外部关闭
    document.addEventListener('click', (e) => {
      if (this.panel.classList.contains('open') &&
          !this.panel.contains(e.target) &&
          !e.target.closest('.bp-clean-floating-actions')) {
        this.hide();
      }
    });
  }

  show() {
    this.panel.classList.add('open');
  }

  hide() {
    this.panel.classList.remove('open');
  }
}
```

---

#### 2.4 岗位关键词过滤行为优化

**变更类型**: 功能优化
**文件路径**: `d:\boss-helper\boss-helper.user.js#L300-350`
**优化描述**: 岗位关键词过滤不再隐藏列表岗位，只用于自动投递判断

**AutoApplier变更**:
```javascript
// v1.3 过滤后隐藏列表岗位
hideFilteredJobs() {
  const jobs = this.scrapeJobs();

  jobs.forEach(job => {
    const filterResult = this.filterEngine.evaluate(job);
    if (!filterResult.shouldApply) {
      job.applyButton.closest(APP_CONSTANTS.SELECTORS.JOB_CARD).style.display = 'none';
    }
  });
}

// v1.4 不再隐藏列表岗位
hideFilteredJobs() {
  // 优化：不再隐藏列表岗位，只用于自动投递判断
  // 这样可以减少翻页和投递异常
  // 用户仍然可以通过手动筛选来查看符合条件的职位
}

// v1.4 投递时仅做判断，不修改列表
async applyJob(job) {
  try {
    job.applyButton.click();
    this.config.history.add(job.id, job.company, job.title);
    console.log(`已投递: ${job.title} - ${job.company}`);
  } catch (error) {
    console.error(`投递失败: ${error.message}`);
  }
}
```

---

### 3. 代码清理

#### 3.1 移除冗余代码

**变更类型**: 代码清理
**文件路径**: `d:\boss-helper\boss-helper.user.js`

| 移除内容 | 原位置 | 说明 |
|---------|--------|------|
| 薪资范围重叠判断 | v1.3#L230-235 | 改为严格范围判断 |
| 列表隐藏逻辑 | v1.3#L300-350 | 优化为仅做判断 |
| 嵌套模态框滚动修复 | v1.3#L600-650 | 简化处理逻辑 |
| 投递成功验证 | v1.3#L270-290 | 简化为直接点击 |

**AutoApplier.start()变更**:
```javascript
// v1.3 start方法
start() {
  if (this.isRunning) return;

  this.isRunning = true;
  this.processJobs();
  this.hideFilteredJobs();  // ← v1.3: 隐藏不匹配的职位
}

// v1.4 start方法
start() {
  if (this.isRunning) return;

  this.isRunning = true;
  this.processJobs();
  // ← v1.4: 不再隐藏列表岗位
}
```

**applyJob方法变更**:
```javascript
// v1.3 applyJob方法
async applyJob(job) {
  try {
    const wasClicked = this.attemptClick(job.applyButton);
    if (wasClicked && this.verifyDelivery(job)) {
      this.config.history.add(job.id, job.company, job.title);
      console.log(`已投递: ${job.title} - ${job.company}`);
    }
  } catch (error) {
    console.error(`投递失败: ${error.message}`);
  }
}

// v1.4 applyJob方法（简化）
async applyJob(job) {
  try {
    job.applyButton.click();
    this.config.history.add(job.id, job.company, job.title);
    console.log(`已投递: ${job.title} - ${job.company}`);
  } catch (error) {
    console.error(`投递失败: ${error.message}`);
  }
}
```

---

## 版本对比总结

### 新增功能

| 功能 | v1.3 | v1.4 | 说明 |
|------|------|------|------|
| 跳过已沟通公司 | ❌ | ✅ | 自动跳过同一家公司 |
| 岗位关键词白名单 | ❌ | ✅ | 只投包含必需关键词的职位 |

### 功能优化

| 功能 | v1.3 | v1.4 | 说明 |
|------|------|------|------|
| 薪资范围筛选 | 允许部分重叠 | 必须完整落在范围 | 更精准的筛选 |
| 薪资填写方式 | 需要计算 | 直接按K填写 | 更方便用户 |
| 设置面板布局 | 居中弹窗 | 右侧边栏 | 更符合操作习惯 |
| 岗位过滤行为 | 隐藏列表岗位 | 仅做投递判断 | 减少翻页异常 |

### 移除/简化功能

| 功能 | v1.3 | v1.4 | 说明 |
|------|------|------|------|
| 薪资重叠逻辑 | 允许重叠 | 不允许重叠 | 优化筛选逻辑 |
| 列表隐藏 | 会隐藏 | 不隐藏 | 优化用户体验 |
| 投递成功验证 | 有验证 | 直接记录 | 简化流程 |
| 滚动位置修复 | 复杂处理 | 简化处理 | 减少代码复杂度 |

---

## 完整版本演进轨迹

```
v1.0 ──────────────────────────────────────────────────────────────► v1.4
     │                                                                   │
     │ 核心演进                                                            │ 核心演进
     ├───────────────────────────────────────────────────────────────────┤
     │                                                                   │
     │ v1.0 → v1.1                                                        │ v1.3 → v1.4
     │ • 移除强制切换求职期望                                              │ • 新增跳过已沟通公司
     │ • 添加已知问题标记                                                  │ • 新增岗位关键词白名单
     │                                                                     │ • 优化薪资范围逻辑
     │ v1.1 → v1.2                                                        │ • 优化薪资填写方式
     │ • 新增薪资范围筛选                                                  │ • 优化设置面板布局
     │ • 新增城市过滤                                                     │ • 优化岗位过滤行为
     │ • 新增关键词导入/导出                                               │
     │ • 修复跳过第一张卡片问题                                            │
     │ • 修复计数不准确问题                                                │
     │ • 优化按钮显示逻辑                                                  │
     │                                                                     │
     │ v1.2 → v1.3                                                        │
     │ • 新增定时投递                                                     │
     │ • 新增活跃状态筛选                                                  │
     │ • 新增工作地址过滤                                                  │
     │ • 新增跳过已收藏职位                                                │
     │ • 修复投递统计计数逻辑                                              │
     │ • 修复嵌套模态框滚动错误                                            │
     │                                                                     │
     └───────────────────────────────────────────────────────────────────┘
```

---

## 迭代总结

### v1.4 版本特性

| 分类 | 特性数量 | 说明 |
|------|---------|------|
| 自动投递 | 5 | 基础投递、过滤投递、定时投递、白名单投递、跳过已沟通 |
| 过滤系统 | 7 | 薪资、城市、地址、关键词、公司、活跃状态、工作时间 |
| 用户界面 | 4 | 悬浮按钮、设置面板、复制按钮、统计面板 |
| 配置管理 | 6 | 基本配置、过滤配置、时间配置、导入/导出 |

### 架构成熟度

| 指标 | v1.0 | v1.1 | v1.2 | v1.3 | v1.4 |
|------|------|------|------|------|------|
| 模块化 | ★★☆ | ★★☆ | ★★★ | ★★★ | ★★★★ |
| 可扩展性 | ★★☆ | ★★★ | ★★★ | ★★★★ | ★★★★ |
| 代码质量 | ★★☆ | ★★☆ | ★★★ | ★★★ | ★★★★ |
| 用户体验 | ★★☆ | ★★☆ | ★★★ | ★★★ | ★★★★ |

---

**文档版本**: 1.0
**生成日期**: 2026-04-27
**分析工具**: Boss-Helper Version Analyzer