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
            
        } catch (error) {
            console.error('初始化失败:', error);
        }
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
            }
            
            return true;
        });
    }

    async handleStartScan(message, sendResponse) {
        try {
            if (!this.isInitialized) {
                sendResponse({ success: false, error: '内容脚本未初始化' });
                return;
            }

            const results = await this.detector.detectKeywords();
            this.currentResults = results;
            
            await this.saveResultsToStorage(results);
            
            // 只输出最终统计
            if (results.length > 0) {
                console.log(`发现 ${results.length} 个问题`);
            }
            
            sendResponse({ 
                success: true, 
                results: results,
                count: results.length
            });
            
        } catch (error) {
            console.error('扫描失败:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleSetKeywords(message, sendResponse) {
        try {
            const keywords = message.keywords || [];
            this.detector.setKeywords(keywords);
            await this.saveKeywordsToStorage(keywords);
            
            sendResponse({ success: true });
        } catch (error) {
            console.error('设置关键词失败:', error);
            sendResponse({ success: false, error: error.message });
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