class PopupController {
    constructor() {
        this.debounceTimer = null;
        this.init();
    }

    async init() {
        try {
            this.bindEventListeners();
            await this.loadSavedKeywords();
            
            // 自动开始检测
            this.debounceAutoDetect();
        } catch (error) {
            console.error('❌ Popup初始化失败:', error);
        }
    }

    bindEventListeners() {
        const keywordsInput = document.getElementById('keywordsInput');
        if (keywordsInput) {
            keywordsInput.addEventListener('input', () => {
                this.saveKeywords();
                this.debounceAutoDetect();
            });
        }
    }

    debounceAutoDetect() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.autoStartScan();
        }, 1000);
    }

    async loadSavedKeywords() {
        try {
            const result = await chrome.storage.local.get(['keywords']);
            if (result.keywords && Array.isArray(result.keywords)) {
                const keywordsInput = document.getElementById('keywordsInput');
                if (keywordsInput) {
                    keywordsInput.value = result.keywords.join(', ');
                }
            }
        } catch (error) {
            console.error('❌ 加载关键词失败:', error);
        }
    }

    async saveKeywords() {
        try {
            const keywordsInput = document.getElementById('keywordsInput');
            if (keywordsInput) {
                const keywords = keywordsInput.value
                    .split(',')
                    .map(k => k.trim())
                    .filter(k => k);
                
                await chrome.storage.local.set({ keywords: keywords });
            }
        } catch (error) {
            console.error('❌ 保存关键词失败:', error);
        }
    }

    async autoStartScan() {
        const keywordsInput = document.getElementById('keywordsInput');
        if (!keywordsInput) return;

        const keywords = keywordsInput.value.trim();
        
        if (!keywords) {
            this.updateStatus('请输入关键词', 0);
            return;
        }

        try {
            this.showLoading(true);
            this.updateStatus('正在检测...', 0);
            
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k);
            
            // 设置关键词
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'setKeywords',
                keywords: keywordArray
            });
            
            if (response && response.success) {
                // 开始检测
                const scanResponse = await chrome.tabs.sendMessage(tab.id, {
                    action: 'startScan'
                });
                
                if (scanResponse && scanResponse.success) {
                    const resultCount = scanResponse.results.length;
                    if (resultCount > 0) {
                        this.updateStatus(`发现 ${resultCount} 个问题`, resultCount);
                        console.log('检测结果:', scanResponse.results);
                    } else {
                        this.updateStatus('未发现问题', 0);
                    }
                } else {
                    this.updateStatus('检测失败', 0);
                }
            }
        } catch (error) {
            console.error('❌ 自动检测失败:', error);
            this.updateStatus('检测失败', 0);
        } finally {
            this.showLoading(false);
        }
    }

    updateStatus(text, count) {
        const statusText = document.getElementById('statusText');
        const resultCount = document.getElementById('resultCount');
        
        if (statusText) {
            statusText.textContent = text;
        }
        
        if (resultCount) {
            resultCount.textContent = count;
            resultCount.className = count > 0 ? 'result-count warning' : 'result-count';
        }
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = show ? 'block' : 'none';
        }
    }
}

new PopupController();