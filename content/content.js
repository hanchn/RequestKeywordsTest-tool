/**
 * 内容脚本主入口 - 关键词检测功能
 */
class ContentScriptManager {
    constructor() {
        this.detector = new KeywordDetector();
        this.isInitialized = false;
        this.currentResults = [];
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 内容脚本初始化开始');
            
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            if (document.readyState !== 'complete') {
                await new Promise(resolve => {
                    window.addEventListener('load', resolve);
                });
            }
            
            this.setupMessageListener();
            await this.loadKeywordsFromStorage();
            
            this.isInitialized = true;
            console.log('✅ 内容脚本初始化完成');
            
        } catch (error) {
            console.error('❌ 内容脚本初始化失败:', error);
        }
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('📨 收到消息:', message.action);
            
            switch (message.action) {
                case 'startScan':
                    this.handleStartScan(message, sendResponse);
                    break;
                    
                case 'setKeywords':
                    this.handleSetKeywords(message, sendResponse);
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
            console.log('🔍 开始执行扫描...');
            
            if (!this.isInitialized) {
                throw new Error('内容脚本未完全初始化');
            }
            
            if (this.detector.keywords.length === 0) {
                sendResponse({
                    success: true,
                    results: [],
                    message: '没有设置关键词'
                });
                return;
            }
            
            const results = await this.detector.detectKeywords();
            this.currentResults = results;
            
            await this.saveResultsToStorage(results);
            
            const response = {
                success: true,
                results: results,
                statistics: this.detector.getStatistics(),
                url: window.location.href,
                timestamp: new Date().toISOString()
            };
            
            if (results.length > 0) {
                console.log(`🚨 发现 ${results.length} 个问题:`, results);
            } else {
                console.log('✅ 未发现问题');
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
            console.log('🎯 设置关键词:', keywords);
            
            this.detector.setKeywords(keywords);
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

    handleGetResults(message, sendResponse) {
        try {
            const response = {
                success: true,
                results: this.currentResults,
                statistics: this.detector.getStatistics(),
                url: window.location.href,
                timestamp: new Date().toISOString()
            };
            
            sendResponse(response);
            
        } catch (error) {
            console.error('❌ 获取结果失败:', error);
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }

    async loadKeywordsFromStorage() {
        try {
            const result = await chrome.storage.local.get(['keywords']);
            if (result.keywords && Array.isArray(result.keywords)) {
                this.detector.setKeywords(result.keywords);
                console.log('📚 从存储加载关键词:', result.keywords);
            }
        } catch (error) {
            console.error('❌ 加载关键词失败:', error);
        }
    }

    async saveKeywordsToStorage(keywords) {
        try {
            await chrome.storage.local.set({ keywords: keywords });
        } catch (error) {
            console.error('❌ 保存关键词失败:', error);
        }
    }

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
            
        } catch (error) {
            console.error('❌ 保存结果失败:', error);
        }
    }
}

const contentScriptManager = new ContentScriptManager();
window.contentScriptManager = contentScriptManager;

console.log('🎯 关键词检测内容脚本已加载');