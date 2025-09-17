/**
 * 内容脚本主入口 - 协调关键词检测和页面标注功能
 */
class ContentScriptManager {
    constructor() {
        this.detector = new KeywordDetector();
        this.annotator = new PageAnnotator();
        this.isInitialized = false;
        this.currentResults = [];
        
        this.init();
    }

    /**
     * 初始化内容脚本
     */
    async init() {
        try {
            console.log('🚀 内容脚本初始化开始');
            
            // 等待页面完全加载
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // 设置消息监听器
            this.setupMessageListener();
            
            // 从存储中加载关键词设置
            await this.loadKeywordsFromStorage();
            
            this.isInitialized = true;
            console.log('✅ 内容脚本初始化完成');
            
            // 通知popup脚本初始化完成
            this.sendMessageToPopup({
                action: 'contentScriptReady',
                url: window.location.href
            });
            
        } catch (error) {
            console.error('❌ 内容脚本初始化失败:', error);
        }
    }

    /**
     * 设置消息监听器
     */
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            // 移除冗余的消息日志
            
            switch (message.action) {
                case 'startScan':
                    this.handleStartScan(message, sendResponse);
                    break;
                    
                case 'setKeywords':
                    this.handleSetKeywords(message, sendResponse);
                    break;
                    
                case 'toggleAnnotation':
                    this.handleToggleAnnotation(message, sendResponse);
                    break;
                    
                case 'clearResults':
                    this.handleClearResults(message, sendResponse);
                    break;
                    
                case 'getResults':
                    this.handleGetResults(message, sendResponse);
                    break;
                    
                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
            
            return true;
        });
    }

    async handleStartScan(message, sendResponse) {
        try {
            // 执行检测
            const results = await this.detector.detectKeywords();
            this.currentResults = results;
            
            // 执行标注
            this.annotator.annotateResults(results);
            
            // 保存结果到存储
            await this.saveResultsToStorage(results);
            
            const response = {
                success: true,
                results: results,
                statistics: this.detector.getStatistics(),
                url: window.location.href,
                timestamp: new Date().toISOString()
            };
            
            // 只在有问题时输出简洁的统计信息
            if (results.length > 0) {
                console.log(`🚨 发现 ${results.length} 个问题`);
            }
            
            sendResponse(response);
            
        } catch (error) {
            console.error('❌ 扫描失败:', error);
            sendResponse({
                success: false,
                error: error.message,
                results: []
            });
        }
    }

    async handleSetKeywords(message, sendResponse) {
        try {
            const keywords = message.keywords || [];
            
            // 设置检测器关键词
            this.detector.setKeywords(keywords);
            
            // 保存到存储
            await this.saveKeywordsToStorage(keywords);
            
            sendResponse({ 
                success: true, 
                keywords: keywords,
                count: keywords.length
            });
            
        } catch (error) {
            console.error('❌ 设置关键词失败:', error);
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }

    handleToggleAnnotation(message, sendResponse) {
        try {
            const enabled = message.enabled;
            
            if (enabled) {
                this.annotator.enable();
                // 重新标注当前结果
                if (this.currentResults.length > 0) {
                    this.annotator.annotateResults(this.currentResults);
                }
            } else {
                this.annotator.disable();
            }
            
            sendResponse({ success: true, enabled: enabled });
            
        } catch (error) {
            console.error('❌ 切换标注失败:', error);
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 处理清除结果消息
     * @param {Object} message - 消息对象
     * @param {Function} sendResponse - 响应函数
     */
    handleClearResults(message, sendResponse) {
        try {
            console.log('🧹 清除检测结果');
            
            this.detector.clearResults();
            this.annotator.clearAnnotations();
            this.currentResults = [];
            
            sendResponse({
                success: true
            });
            
        } catch (error) {
            console.error('❌ 清除结果失败:', error);
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 处理获取结果消息
     * @param {Object} message - 消息对象
     * @param {Function} sendResponse - 响应函数
     */
    handleGetResults(message, sendResponse) {
        try {
            const results = this.detector.getResults();
            const statistics = this.detector.getStatistics();
            
            sendResponse({
                success: true,
                results: results,
                statistics: statistics,
                url: window.location.href
            });
            
        } catch (error) {
            console.error('❌ 获取结果失败:', error);
            sendResponse({
                success: false,
                error: error.message,
                results: []
            });
        }
    }

    /**
     * 从存储中加载关键词
     */
    async loadKeywordsFromStorage() {
        try {
            const result = await chrome.storage.local.get(['keywords']);
            const keywords = result.keywords || [];
            
            if (keywords.length > 0) {
                console.log('📚 从存储加载关键词:', keywords);
                this.detector.setKeywords(keywords);
            }
        } catch (error) {
            console.warn('⚠️ 加载关键词失败:', error);
        }
    }

    /**
     * 保存关键词到存储
     * @param {string[]} keywords - 关键词数组
     */
    async saveKeywordsToStorage(keywords) {
        try {
            await chrome.storage.local.set({ keywords: keywords });
            console.log('💾 关键词已保存到存储');
        } catch (error) {
            console.warn('⚠️ 保存关键词失败:', error);
        }
    }

    /**
     * 保存检测结果到存储
     * @param {Array} results - 检测结果
     */
    async saveResultsToStorage(results) {
        try {
            const storageData = {
                results: results,
                url: window.location.href,
                timestamp: new Date().toISOString(),
                statistics: this.detector.getStatistics()
            };
            
            await chrome.storage.local.set({ 
                [`results_${window.location.hostname}`]: storageData 
            });
            
            console.log('💾 检测结果已保存到存储');
        } catch (error) {
            console.warn('⚠️ 保存结果失败:', error);
        }
    }

    /**
     * 发送消息到popup
     * @param {Object} message - 消息对象
     */
    sendMessageToPopup(message) {
        try {
            chrome.runtime.sendMessage(message);
        } catch (error) {
            console.warn('⚠️ 发送消息到popup失败:', error);
        }
    }

    /**
     * 获取当前状态
     * @returns {Object} 当前状态
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            currentResults: this.currentResults.length,
            detectorStats: this.detector.getStatistics(),
            annotatorStats: this.annotator.getStatistics(),
            url: window.location.href
        };
    }
}

// 创建并初始化内容脚本管理器
const contentScriptManager = new ContentScriptManager();

// 将管理器暴露到全局作用域（用于调试）
window.contentScriptManager = contentScriptManager;

console.log('🎯 关键词检测内容脚本已加载');

class ContentScript {
    constructor() {
        this.detector = null;
        this.annotator = null;
        this.networkMonitor = null;
        this.init();
    }

    init() {
        this.detector = new KeywordDetector();
        this.annotator = new PageAnnotator();
        this.networkMonitor = new NetworkMonitor(this.detector);
        this.setupMessageListener();
        this.startNetworkMonitoring();
    }

    startNetworkMonitoring() {
        if (this.networkMonitor) {
            this.networkMonitor.start();
        }
    }
}