// ==UserScript==
// @name         Boss-Helper Clean
// @namespace    https://github.com/boss-helper
// @version 1.5.0
// @description  自动投递、黑名单过滤、界面优化
// @match        https://www.zhipin.com/*
// @grant        GM_addStyle
// @grant        GM_info
// @run-at       document-end
// ==/UserScript==

(function() {
  'use strict';

  /**
   * Boss-Helper 
   * 
   * 核心功能：
   * 1. 自动投递功能
   * 2. 黑名单过滤
   * 3. 界面优化
   * 4. 可配置系统
   * 5. 日志系统
   *
   * 版本说明：
   * - 【新增】跳过已沟通公司，自动投递遇到同一家公司会直接跳过，减少重复打招呼
   * - 【新增】岗位关键词支持白名单模式，只投标题命中的岗位
   * - 【修复】薪资范围筛选不再放行部分重叠的薪资区间，岗位薪资必须完整落在设置范围内
   * - 【优化】薪资范围改为按 K 填写，10-20 表示 10K-20K
   * - 【优化】设置面板改为侧边栏布局，配置项更容易查找
   * - 【优化】设置面板部分控件的 UI 显示细节
   * - 【优化】岗位关键词过滤不再隐藏列表岗位，只用于自动投递判断，减少翻页和投递异常
   * - 【优化】清理部分设置代码和判断逻辑，减少冗余 
   */

  // ============================================================================
  // 1. 工具层 - 常量定义
  // ============================================================================

  const APP_CONSTANTS = {
    VERSION: '1.0.0',
    STORAGE_KEYS: {
      SETTINGS: 'bp_clean_settings',
      HISTORY: 'bp_clean_history',
      BLACKLIST: 'bp_clean_blacklist',
    },
    SELECTORS: {
      JOB_CARD: '.job-card',
      APPLY_BUTTON: '.btn-apply',
      COMPANY_NAME: '.company-name',
      JOB_TITLE: '.job-title',
      JOB_DESCRIPTION: '.job-desc',
    },
    DEFAULT_SETTINGS: {
      autoApply: false,
      rateLimit: 3000,
      excludeKeywords: [],
      requiredKeywords: [],
      companyBlacklist: [],
      maxApplications: 50,
      workTime: {
        start: '09:00',
        end: '18:00'
      }
    }
  };

  // ============================================================================
  // 2. 工具层 - 存储管理
  // ============================================================================

  class Storage {
    static get(key, defaultValue = null) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : defaultValue;
      } catch (error) {
        console.error(`Storage.get failed: ${error.message}`);
        return defaultValue;
      }
    }

    static set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error(`Storage.set failed: ${error.message}`);
        return false;
      }
    }

    static remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error(`Storage.remove failed: ${error.message}`);
        return false;
      }
    }
  }

  // ============================================================================
  // 3. 数据层 - 配置管理
  // ============================================================================

  class ConfigManager {
    constructor() {
      this.settings = Storage.get(APP_CONSTANTS.STORAGE_KEYS.SETTINGS, APP_CONSTANTS.DEFAULT_SETTINGS);
    }

    get(key) {
      return this.settings[key];
    }

    set(key, value) {
      this.settings[key] = value;
      this.save();
    }

    save() {
      Storage.set(APP_CONSTANTS.STORAGE_KEYS.SETTINGS, this.settings);
    }

    reset() {
      this.settings = { ...APP_CONSTANTS.DEFAULT_SETTINGS };
      this.save();
    }

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
  }

  // ============================================================================
  // 4. 数据层 - 历史记录管理
  // ============================================================================

  class HistoryManager {
    constructor() {
      this.history = Storage.get(APP_CONSTANTS.STORAGE_KEYS.HISTORY, []);
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
    }

    hasApplied(jobId) {
      return this.history.some(entry => entry.id === jobId);
    }

    getTodayCount() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return this.history.filter(entry => entry.timestamp >= today.getTime()).length;
    }

    cleanup() {
      const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000);
      this.history = this.history.filter(entry => entry.timestamp >= cutoff);
      this.save();
    }

    save() {
      Storage.set(APP_CONSTANTS.STORAGE_KEYS.HISTORY, this.history);
    }
  }

  // ============================================================================
  // 5. 业务层 - 过滤引擎
  // ============================================================================

  class FilterEngine {
    constructor(config) {
      this.config = config;
    }

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

      // 检查必需关键词
      if (this.config.settings.requiredKeywords.length > 0) {
        const hasRequired = this.config.settings.requiredKeywords.some(keyword => 
          searchText.includes(keyword.toLowerCase())
        );
        if (!hasRequired) {
          return { shouldApply: false, reason: '不包含必需关键词' };
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
  }

  // ============================================================================
  // 6. 业务层 - 限流器
  // ============================================================================

  class RateLimiter {
    constructor(interval) {
      this.interval = interval;
      this.lastExecution = 0;
    }

    async execute(fn) {
      const now = Date.now();
      const timeSinceLast = now - this.lastExecution;

      if (timeSinceLast < this.interval) {
        const waitTime = this.interval - timeSinceLast;
        await this.sleep(waitTime);
      }

      this.lastExecution = Date.now();
      return fn();
    }

    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  // ============================================================================
  // 7. 业务层 - 自动投递器
  // ============================================================================

  class AutoApplier {
    constructor(config) {
      this.config = config;
      this.filterEngine = new FilterEngine(config);
      this.rateLimiter = new RateLimiter(config.settings.rateLimit);
      this.isRunning = false;
    }

    start() {
      if (this.isRunning) return;

      this.isRunning = true;
      this.processJobs();
    }

    stop() {
      this.isRunning = false;
    }

    async processJobs() {
      if (!this.isRunning) return;

      const jobs = this.scrapeJobs();
      
      for (const job of jobs) {
        if (!this.isRunning) break;

        const filterResult = this.filterEngine.evaluate(job);
        
        if (filterResult.shouldApply) {
          await this.rateLimiter.execute(async () => {
            await this.applyJob(job);
          });
        }

        // 短暂休息，避免过度占用CPU
        await this.rateLimiter.sleep(100);
      }

      // 继续处理新加载的职位
      setTimeout(() => this.processJobs(), 5000);
    }

    scrapeJobs() {
      const jobCards = document.querySelectorAll(APP_CONSTANTS.SELECTORS.JOB_CARD);
      const jobs = [];

      jobCards.forEach(card => {
        const id = card.getAttribute('data-job-id') || card.getAttribute('data-id');
        const title = card.querySelector(APP_CONSTANTS.SELECTORS.JOB_TITLE)?.textContent.trim() || '';
        const company = card.querySelector(APP_CONSTANTS.SELECTORS.COMPANY_NAME)?.textContent.trim() || '';
        const description = card.querySelector(APP_CONSTANTS.SELECTORS.JOB_DESCRIPTION)?.textContent.trim() || '';
        const applyButton = card.querySelector(APP_CONSTANTS.SELECTORS.APPLY_BUTTON);

        if (id && title && company && applyButton) {
          jobs.push({
            id,
            title,
            company,
            description,
            applyButton
          });
        }
      });

      return jobs;
    }

    async applyJob(job) {
      try {
        job.applyButton.click();
        this.config.history.add(job.id, job.company, job.title);
        console.log(`已投递: ${job.title} - ${job.company}`);
      } catch (error) {
        console.error(`投递失败: ${error.message}`);
      }
    }
  }

  // ============================================================================
  // 8. UI层 - 样式管理
  // ============================================================================

  class StyleManager {
    static load() {
      const styles = `
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
          border-radius: 50%;
          background: #00a6a7;
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        
        .bp-clean-floating-actions .action-btn:hover {
          background: #008c8d;
          transform: scale(1.05);
        }
        
        .bp-clean-floating-actions .action-btn.active {
          background: #30d158;
        }
        
        .bp-clean-toast {
          position: fixed;
          top: 24px;
          right: 24px;
          padding: 12px 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 999999;
          animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .bp-clean-settings-panel {
          position: fixed;
          top: 0;
          right: 0;
          width: 400px;
          height: 100vh;
          background: white;
          box-shadow: -2px 0 8px rgba(0,0,0,0.1);
          z-index: 999998;
          padding: 24px;
          overflow-y: auto;
          transform: translateX(100%);
          transition: transform 0.3s ease;
        }
        
        .bp-clean-settings-panel.open {
          transform: translateX(0);
        }
        
        .bp-clean-settings-panel h2 {
          margin-top: 0;
          color: #1f2329;
        }
        
        .bp-clean-settings-group {
          margin-bottom: 24px;
        }
        
        .bp-clean-settings-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #4b5563;
        }
        
        .bp-clean-settings-group input[type="text"],
        .bp-clean-settings-group input[type="number"],
        .bp-clean-settings-group input[type="range"] {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
        }
        
        .bp-clean-settings-group input[type="checkbox"] {
          margin-right: 8px;
        }
        
        .bp-clean-keyword-list {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 8px;
          min-height: 100px;
        }
        
        .bp-clean-keyword-item {
          display: inline-block;
          background: #f3f4f6;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 12px;
          margin: 4px;
        }
        
        .bp-clean-keyword-item .remove {
          margin-left: 8px;
          color: #ef4444;
          cursor: pointer;
        }
      `;

      if (typeof GM_addStyle === 'function') {
        GM_addStyle(styles);
      } else {
        const style = document.createElement('style');
        style.textContent = styles;
        document.head.appendChild(style);
      }
    }
  }

  // ============================================================================
  // 9. UI层 - 组件
  // ============================================================================

  class Toast {
    static show(message, type = 'info', duration = 3000) {
      const toast = document.createElement('div');
      toast.className = `bp-clean-toast bp-clean-toast-${type}`;
      toast.textContent = message;

      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }

    static success(message, duration) {
      this.show(message, 'success', duration);
    }

    static error(message, duration) {
      this.show(message, 'error', duration);
    }

    static info(message, duration) {
      this.show(message, 'info', duration);
    }
  }

  class FloatingActions {
    constructor(app) {
      this.app = app;
      this.container = null;
      this.autoApplyBtn = null;
      this.settingsBtn = null;
    }

    create() {
      this.container = document.createElement('div');
      this.container.className = 'bp-clean-floating-actions';

      // 自动投递按钮
      this.autoApplyBtn = document.createElement('button');
      this.autoApplyBtn.className = 'action-btn';
      this.autoApplyBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
      this.autoApplyBtn.title = '自动投递';
      this.autoApplyBtn.addEventListener('click', () => this.toggleAutoApply());

      // 设置按钮
      this.settingsBtn = document.createElement('button');
      this.settingsBtn.className = 'action-btn';
      this.settingsBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>';
      this.settingsBtn.title = '设置';
      this.settingsBtn.addEventListener('click', () => this.toggleSettings());

      this.container.appendChild(this.autoApplyBtn);
      this.container.appendChild(this.settingsBtn);
      document.body.appendChild(this.container);
    }

    toggleAutoApply() {
      const isActive = this.autoApplyBtn.classList.contains('active');
      
      if (isActive) {
        this.app.autoApplier.stop();
        this.autoApplyBtn.classList.remove('active');
        Toast.info('自动投递已停止');
      } else {
        this.app.autoApplier.start();
        this.autoApplyBtn.classList.add('active');
        Toast.success('自动投递已启动');
      }
    }

    toggleSettings() {
      this.app.settingsPanel.toggle();
    }
  }

  class SettingsPanel {
    constructor(config) {
      this.config = config;
      this.panel = null;
    }

    create() {
      this.panel = document.createElement('div');
      this.panel.className = 'bp-clean-settings-panel';
      this.panel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <h2>Boss-Helper 设置</h2>
          <button id="bp-clean-close-settings" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
        </div>
        
        <div class="bp-clean-settings-group">
          <label>
            <input type="checkbox" id="bp-clean-auto-apply" ${this.config.get('autoApply') ? 'checked' : ''}>
            启用自动投递
          </label>
        </div>
        
        <div class="bp-clean-settings-group">
          <label for="bp-clean-rate-limit">投递间隔 (毫秒): <span id="bp-clean-rate-limit-value">${this.config.get('rateLimit')}</span></label>
          <input type="range" id="bp-clean-rate-limit" min="1000" max="10000" step="500" value="${this.config.get('rateLimit')}">
        </div>
        
        <div class="bp-clean-settings-group">
          <label for="bp-clean-max-applications">每日最大投递数: <span id="bp-clean-max-applications-value">${this.config.get('maxApplications')}</span></label>
          <input type="range" id="bp-clean-max-applications" min="10" max="100" step="5" value="${this.config.get('maxApplications')}">
        </div>
        
        <div class="bp-clean-settings-group">
          <label>排除关键词</label>
          <div class="bp-clean-keyword-list" id="bp-clean-exclude-keywords">
            ${this.config.get('excludeKeywords').map(keyword => `
              <span class="bp-clean-keyword-item">
                ${keyword}
                <span class="remove" data-type="exclude" data-keyword="${keyword}">&times;</span>
              </span>
            `).join('')}
          </div>
          <input type="text" id="bp-clean-add-exclude" placeholder="添加排除关键词" style="margin-top: 8px;">
        </div>
        
        <div class="bp-clean-settings-group">
          <label>必需关键词</label>
          <div class="bp-clean-keyword-list" id="bp-clean-required-keywords">
            ${this.config.get('requiredKeywords').map(keyword => `
              <span class="bp-clean-keyword-item">
                ${keyword}
                <span class="remove" data-type="required" data-keyword="${keyword}">&times;</span>
              </span>
            `).join('')}
          </div>
          <input type="text" id="bp-clean-add-required" placeholder="添加必需关键词" style="margin-top: 8px;">
        </div>
        
        <div class="bp-clean-settings-group">
          <label>公司黑名单</label>
          <div class="bp-clean-keyword-list" id="bp-clean-company-blacklist">
            ${this.config.get('companyBlacklist').map(company => `
              <span class="bp-clean-keyword-item">
                ${company}
                <span class="remove" data-type="company" data-keyword="${company}">&times;</span>
              </span>
            `).join('')}
          </div>
          <input type="text" id="bp-clean-add-company" placeholder="添加公司到黑名单" style="margin-top: 8px;">
        </div>
        
        <div class="bp-clean-settings-group">
          <label>工作时间</label>
          <div style="display: flex; gap: 12px;">
            <div>
              <label>开始: <input type="time" id="bp-clean-work-start" value="${this.config.get('workTime').start}"></label>
            </div>
            <div>
              <label>结束: <input type="time" id="bp-clean-work-end" value="${this.config.get('workTime').end}"></label>
            </div>
          </div>
        </div>
        
        <button id="bp-clean-save" style="background: #00a6a7; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin-top: 24px;">保存设置</button>
        <button id="bp-clean-reset" style="background: #f3f4f6; color: #4b5563; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin-top: 12px;">重置默认</button>
      `;

      document.body.appendChild(this.panel);
      this.bindEvents();
    }

    bindEvents() {
      // 关闭按钮
      document.getElementById('bp-clean-close-settings').addEventListener('click', () => this.hide());

      // 保存按钮
      document.getElementById('bp-clean-save').addEventListener('click', () => this.save());

      // 重置按钮
      document.getElementById('bp-clean-reset').addEventListener('click', () => this.reset());

      // 投递间隔
      const rateLimitInput = document.getElementById('bp-clean-rate-limit');
      const rateLimitValue = document.getElementById('bp-clean-rate-limit-value');
      rateLimitInput.addEventListener('input', (e) => {
        rateLimitValue.textContent = e.target.value;
      });

      // 最大投递数
      const maxApplicationsInput = document.getElementById('bp-clean-max-applications');
      const maxApplicationsValue = document.getElementById('bp-clean-max-applications-value');
      maxApplicationsInput.addEventListener('input', (e) => {
        maxApplicationsValue.textContent = e.target.value;
      });

      // 添加排除关键词
      document.getElementById('bp-clean-add-exclude').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.addKeyword('excludeKeywords', e.target.value);
          e.target.value = '';
        }
      });

      // 添加必需关键词
      document.getElementById('bp-clean-add-required').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.addKeyword('requiredKeywords', e.target.value);
          e.target.value = '';
        }
      });

      // 添加公司黑名单
      document.getElementById('bp-clean-add-company').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.addKeyword('companyBlacklist', e.target.value);
          e.target.value = '';
        }
      });

      // 移除关键词
      document.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove')) {
          const type = e.target.dataset.type;
          const keyword = e.target.dataset.keyword;
          this.removeKeyword(type === 'exclude' ? 'excludeKeywords' : 
                          type === 'required' ? 'requiredKeywords' : 'companyBlacklist', keyword);
        }
      });
    }

    addKeyword(type, keyword) {
      if (!keyword.trim()) return;
      
      const keywords = this.config.get(type);
      if (!keywords.includes(keyword.trim())) {
        keywords.push(keyword.trim());
        this.config.set(type, keywords);
        this.updateKeywordList(type);
      }
    }

    removeKeyword(type, keyword) {
      const keywords = this.config.get(type);
      const index = keywords.indexOf(keyword);
      if (index > -1) {
        keywords.splice(index, 1);
        this.config.set(type, keywords);
        this.updateKeywordList(type);
      }
    }

    updateKeywordList(type) {
      const containerId = type === 'excludeKeywords' ? 'bp-clean-exclude-keywords' :
                        type === 'requiredKeywords' ? 'bp-clean-required-keywords' : 'bp-clean-company-blacklist';
      const container = document.getElementById(containerId);
      const keywords = this.config.get(type);
      
      container.innerHTML = keywords.map(keyword => `
        <span class="bp-clean-keyword-item">
          ${keyword}
          <span class="remove" data-type="${type === 'excludeKeywords' ? 'exclude' : 
                                           type === 'requiredKeywords' ? 'required' : 'company'}" 
                data-keyword="${keyword}">&times;</span>
        </span>
      `).join('');
    }

    save() {
      this.config.set('autoApply', document.getElementById('bp-clean-auto-apply').checked);
      this.config.set('rateLimit', parseInt(document.getElementById('bp-clean-rate-limit').value));
      this.config.set('maxApplications', parseInt(document.getElementById('bp-clean-max-applications').value));
      this.config.set('workTime', {
        start: document.getElementById('bp-clean-work-start').value,
        end: document.getElementById('bp-clean-work-end').value
      });
      
      Toast.success('设置已保存');
      this.hide();
    }

    reset() {
      this.config.reset();
      Toast.info('已重置为默认设置');
      this.show(); // 重新显示以更新UI
    }

    show() {
      this.panel.classList.add('open');
    }

    hide() {
      this.panel.classList.remove('open');
    }

    toggle() {
      if (this.panel.classList.contains('open')) {
        this.hide();
      } else {
        this.show();
      }
    }
  }

  // ============================================================================
  // 10. 应用主类
  // ============================================================================

  class BossPlusClean {
    constructor() {
      this.config = new ConfigManager();
      this.history = new HistoryManager();
      this.autoApplier = new AutoApplier({ config: this.config, history: this.history });
      this.floatingActions = new FloatingActions(this);
      this.settingsPanel = new SettingsPanel(this.config);
    }

    initialize() {
      StyleManager.load();
      this.floatingActions.create();
      this.settingsPanel.create();
      
      console.log('Boss-Helper Clean 已初始化');
      console.log('版本:', APP_CONSTANTS.VERSION);
    }
  }

  // 启动应用
  const app = new BossPlusClean();
  app.initialize();

})();

// ============================================================================
// 测试用例 (可在浏览器控制台运行)
// ============================================================================

/**
 * 测试过滤引擎
 */
function testFilterEngine() {
  const config = {
    settings: {
      excludeKeywords: ['外包', '派遣'],
      requiredKeywords: ['前端', 'React'],
      companyBlacklist: ['外包公司'],
      maxApplications: 50,
      workTime: { start: '09:00', end: '18:00' }
    },
    history: {
      hasApplied: (id) => id === 'job-001',
      getTodayCount: () => 10
    }
  };

  const filterEngine = new FilterEngine(config);
  
  const testJobs = [
    { id: 'job-001', title: '前端工程师', company: '好公司', description: 'React' },
    { id: 'job-002', title: '前端外包', company: '好公司', description: 'React' },
    { id: 'job-003', title: '后端工程师', company: '好公司', description: 'Java' },
    { id: 'job-004', title: '前端工程师', company: '外包公司', description: 'React' },
    { id: 'job-005', title: '前端React工程师', company: '好公司', description: 'React' }
  ];

  testJobs.forEach(job => {
    const result = filterEngine.evaluate(job);
    console.log(`职位: ${job.title} - ${job.company}`);
    console.log(`结果: ${result.shouldApply ? '通过' : '拒绝'}`);
    console.log(`原因: ${result.reason}`);
    console.log('---');
  });
}

/**
 * 测试限流器
 */
async function testRateLimiter() {
  const limiter = new RateLimiter(1000);
  
  console.log('开始测试限流器...');
  
  const startTime = Date.now();
  
  for (let i = 1; i <= 3; i++) {
    await limiter.execute(() => {
      console.log(`执行任务 ${i}，时间: ${Date.now() - startTime}ms`);
    });
  }
  
  console.log('限流器测试完成');
}

/**
 * 测试存储管理
 */
function testStorage() {
  const testKey = 'test_bp_clean';
  const testValue = { foo: 'bar', number: 42 };
  
  console.log('测试存储...');
  
  // 测试设置
  const setResult = Storage.set(testKey, testValue);
  console.log('设置结果:', setResult);
  
  // 测试获取
  const getResult = Storage.get(testKey);
  console.log('获取结果:', getResult);
  
  // 测试删除
  const removeResult = Storage.remove(testKey);
  console.log('删除结果:', removeResult);
  
  // 测试默认值
  const defaultResult = Storage.get(testKey, 'default');
  console.log('默认值测试:', defaultResult);
}

// 导出测试函数
if (typeof window !== 'undefined') {
  window.testBossPlus = {
    filterEngine: testFilterEngine,
    rateLimiter: testRateLimiter,
    storage: testStorage
  };
}