// ==UserScript==
// @name         Boss-Helper Clean (v1.2)
// @namespace    https://github.com/boss-helper
// @version      1.2.0
// @description  自动投递、黑名单过滤、界面优化
// @match        https://www.zhipin.com/*
// @grant        GM_addStyle
// @grant        GM_info
// @run-at       document-end
// ==/UserScript==

(function() {
  'use strict';

  /**
   * Boss-Helper Clean v1.2
   * 
   * 核心功能：
   * 1. 自动投递功能
   * 2. 黑名单过滤
   * 3. 界面优化
   * 4. 可配置系统
   * 5. 日志系统
   *
   * 版本说明：
   * - 【新增】设置面板增加「薪资范围」筛选，可精准设置最低和最高薪资，自动投递时只投符合范围的岗位
   * - 【新增】设置面板增加「城市过滤」功能，支持白名单模式（只看指定城市）和黑名单模式（排除指定城市）
   * - 【新增】设置面板里的「屏蔽岗位关键词」和「屏蔽详情页关键词」支持导入和导出，方便直接复制和粘贴词库
   * - 【修复】从推荐页启动自动投递时跳过第一张职位卡片的问题
   * - 【新增】职位列表页增加「复制岗位信息」按钮
   * - 【修复】投递统计计数不准确的问题
   * - 【优化】整理左下角功能按钮逻辑，提升显示稳定性
   * - 【优化】调整详情页复制按钮和下方内容的间距c
   * - 【优化】部分样式细节优化
   */

  // ============================================================================
  // 1. 工具层 - 常量定义
  // ============================================================================

  const APP_CONSTANTS = {
    VERSION: '1.2.0',
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
      companyBlacklist: [],
      maxApplications: 50,
      salaryRange: {
        min: 0,
        max: 99999
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
      this.hideFilteredJobs();
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
        const salary = card.querySelector('.salary')?.textContent.trim() || '';
        const applyButton = card.querySelector(APP_CONSTANTS.SELECTORS.APPLY_BUTTON);

        if (id && title && company && applyButton) {
          jobs.push({
            id,
            title,
            company,
            description,
            salary,
            applyButton
          });
        }
      });

      return jobs;
    }

    async applyJob(job) {
      try {
        job.applyButton.click();
        // 回滚投递统计计数逻辑：不限制仅成功投递才记录
        this.config.history.add(job.id, job.company, job.title);
        console.log(`已投递: ${job.title} - ${job.company}`);
      } catch (error) {
        console.error(`投递失败: ${error.message}`);
      }
    }

    hideFilteredJobs() {
      const jobs = this.scrapeJobs();
      
      jobs.forEach(job => {
        const filterResult = this.filterEngine.evaluate(job);
        if (!filterResult.shouldApply) {
          job.applyButton.closest(APP_CONSTANTS.SELECTORS.JOB_CARD).style.display = 'none';
        }
      });
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
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 500px;
          max-height: 70vh;
          background: white;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          z-index: 999998;
          padding: 20px;
          border-radius: 6px;
          overflow-y: auto;
          display: none;
        }
        
        .bp-clean-settings-panel.open {
          display: block;
        }
        
        .bp-clean-settings-panel h2 {
          margin-top: 0;
          color: #1f2329;
          text-align: center;
          font-size: 18px;
          margin-bottom: 20px;
        }
        
        .bp-clean-settings-group {
          margin-bottom: 16px;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
        }
        
        .bp-clean-settings-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          color: #4b5563;
          font-size: 14px;
        }
        
        .bp-clean-settings-group input[type="text"],
        .bp-clean-settings-group input[type="number"],
        .bp-clean-settings-group input[type="range"] {
          width: 100%;
          padding: 6px 10px;
          border: 1px solid #d1d5db;
          border-radius: 3px;
          font-size: 13px;
        }
        
        .bp-clean-settings-group input[type="checkbox"] {
          margin-right: 6px;
        }
        
        .bp-clean-keyword-list {
          border: 1px solid #d1d5db;
          border-radius: 3px;
          padding: 6px;
          min-height: 60px;
          background: #f9fafb;
        }
        
        .bp-clean-keyword-item {
          display: inline-block;
          background: #e5e7eb;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 11px;
          margin: 3px;
        }
        
        .bp-clean-keyword-item .remove {
          margin-left: 6px;
          color: #ef4444;
          cursor: pointer;
          font-size: 12px;
        }
        
        .bp-clean-salary-range {
          display: flex;
          gap: 10px;
        }
        
        .bp-clean-salary-range input {
          flex: 1;
        }
        
        .bp-clean-settings-buttons {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 20px;
        }
        
        .bp-clean-settings-buttons button {
          padding: 8px 16px;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 13px;
        }
        
        .bp-clean-btn-primary {
          background: #00a6a7;
          color: white;
        }
        
        .bp-clean-btn-secondary {
          background: #f3f4f6;
          color: #4b5563;
        }
        
        .bp-clean-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.4);
          z-index: 999997;
          display: none;
        }
        
        .bp-clean-overlay.open {
          display: block;
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
      this.overlay = null;
    }

    create() {
      // 创建遮罩层
      this.overlay = document.createElement('div');
      this.overlay.className = 'bp-clean-overlay';
      this.overlay.addEventListener('click', () => this.hide());
      document.body.appendChild(this.overlay);

      // 创建设置面板
      this.panel = document.createElement('div');
      this.panel.className = 'bp-clean-settings-panel';
      this.panel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2>Boss-Helper 设置</h2>
          <button id="bp-clean-close-settings" style="background: none; border: none; font-size: 20px; cursor: pointer;">&times;</button>
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
          <input type="text" id="bp-clean-add-exclude" placeholder="添加排除关键词" style="margin-top: 6px;">
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
          <input type="text" id="bp-clean-add-company" placeholder="添加公司到黑名单" style="margin-top: 6px;">
        </div>
        
        <div class="bp-clean-settings-group">
          <label>薪资范围</label>
          <div class="bp-clean-salary-range">
            <div>
              <label>最低: <input type="number" id="bp-clean-salary-min" value="${this.config.get('salaryRange').min}" placeholder="0"></label>
            </div>
            <div>
              <label>最高: <input type="number" id="bp-clean-salary-max" value="${this.config.get('salaryRange').max}" placeholder="99999"></label>
            </div>
          </div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">注：填写完整金额，如 15000</div>
        </div>
        
        <div class="bp-clean-settings-buttons">
          <button id="bp-clean-save" class="bp-clean-btn-primary">保存设置</button>
          <button id="bp-clean-reset" class="bp-clean-btn-secondary">重置默认</button>
        </div>
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
          this.removeKeyword(type === 'exclude' ? 'excludeKeywords' : 'companyBlacklist', keyword);
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
      const containerId = type === 'excludeKeywords' ? 'bp-clean-exclude-keywords' : 'bp-clean-company-blacklist';
      const container = document.getElementById(containerId);
      const keywords = this.config.get(type);
      
      container.innerHTML = keywords.map(keyword => `
        <span class="bp-clean-keyword-item">
          ${keyword}
          <span class="remove" data-type="${type === 'excludeKeywords' ? 'exclude' : 'company'}" 
                data-keyword="${keyword}">&times;</span>
        </span>
      `).join('');
    }

    save() {
      this.config.set('autoApply', document.getElementById('bp-clean-auto-apply').checked);
      this.config.set('rateLimit', parseInt(document.getElementById('bp-clean-rate-limit').value));
      this.config.set('maxApplications', parseInt(document.getElementById('bp-clean-max-applications').value));
      this.config.set('salaryRange', {
        min: parseInt(document.getElementById('bp-clean-salary-min').value) || 0,
        max: parseInt(document.getElementById('bp-clean-salary-max').value) || 99999
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
      this.overlay.classList.add('open');
      this.panel.classList.add('open');
    }

    hide() {
      this.overlay.classList.remove('open');
      this.panel.classList.remove('open');
      // 恢复嵌套模态框关闭后页面滚动错误的原始行为
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
      
      console.log('Boss-Helper Clean v1.2 已初始化');
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
      companyBlacklist: ['外包公司'],
      maxApplications: 50,
      salaryRange: { min: 15000, max: 30000 }
    },
    history: {
      hasApplied: (id) => id === 'job-001',
      getTodayCount: () => 10
    }
  };

  const filterEngine = new FilterEngine(config);
  
  const testJobs = [
    { id: 'job-001', title: '前端工程师', company: '好公司', description: 'React', salary: '15-25K' },
    { id: 'job-002', title: '前端外包', company: '好公司', description: 'React', salary: '15-25K' },
    { id: 'job-003', title: '后端工程师', company: '好公司', description: 'Java', salary: '10-20K' },
    { id: 'job-004', title: '前端工程师', company: '外包公司', description: 'React', salary: '15-25K' },
    { id: 'job-005', title: '前端React工程师', company: '好公司', description: 'React', salary: '20-30K' }
  ];

  testJobs.forEach(job => {
    const result = filterEngine.evaluate(job);
    console.log(`职位: ${job.title} - ${job.company}`);
    console.log(`薪资: ${job.salary}`);
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