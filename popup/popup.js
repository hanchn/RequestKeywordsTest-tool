class PopupController {
    constructor() {
        console.log('🚀 Popup 初始化');
        this.init();
    }

    async init() {
        try {
            // 绑定事件监听器
            this.bindEventListeners();
            
            // 加载已保存的关键词
            await this.loadSavedKeywords();
            
            // 自动开始检测（如果有关键词）
            await this.autoStartScan();
        } catch (error) {
            console.error('❌ Popup 初始化失败:', error);
        }
    }

    bindEventListeners() {
        // 保存关键词按钮
        const saveBtn = document.getElementById('saveKeywords');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveKeywords());
        }

        // 标注切换开关
        const annotationToggle = document.getElementById('annotationToggle');
        if (annotationToggle) {
            annotationToggle.addEventListener('change', (e) => {
                this.toggleAnnotation(e.target.checked);
            });
        }

        // 关键词输入框变化时自动检测
        const keywordsInput = document.getElementById('keywordsInput');
        if (keywordsInput) {
            keywordsInput.addEventListener('input', () => {
                this.debounceAutoDetect();
            });
        }
    }

    // 防抖自动检测
    debounceAutoDetect() {
        clearTimeout(this.detectTimeout);
        this.detectTimeout = setTimeout(() => {
            this.autoStartScan();
        }, 1000); // 1秒后自动检测
    }

    async loadSavedKeywords() {
        try {
            const result = await chrome.storage.local.get(['keywords']);
            const keywordsInput = document.getElementById('keywordsInput');
            if (result.keywords && keywordsInput) {
                keywordsInput.value = result.keywords;
            }
        } catch (error) {
            console.error('❌ 加载关键词失败:', error);
        }
    }

    async saveKeywords() {
        const keywordsInput = document.getElementById('keywordsInput');
        if (!keywordsInput) return;

        const keywords = keywordsInput.value.trim();
        try {
            await chrome.storage.local.set({ keywords });
            console.log('✅ 关键词已保存:', keywords);
            
            // 保存后自动开始检测
            await this.autoStartScan();
        } catch (error) {
            console.error('❌ 保存关键词失败:', error);
        }
    }

    async autoStartScan() {
        const keywordsInput = document.getElementById('keywordsInput');
        if (!keywordsInput) return;

        const keywords = keywordsInput.value.trim();
        
        // 如果没有关键词，不执行检测
        if (!keywords) {
            console.log('⚠️ 未输入关键词，跳过检测');
            this.updateStatus('请输入关键词', 0);
            return;
        }

        console.log('🔄 开始自动检测...');
        
        try {
            // 显示加载状态
            this.showLoading(true);
            this.updateStatus('正在检测...', 0);
            
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // 发送关键词到内容脚本
            const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k);
            
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
                    console.log(`📊 检测完成，发现 ${resultCount} 个问题`);
                    this.updateStatus('检测完成', resultCount);
                    
                    // 默认开启标注
                    const annotationToggle = document.getElementById('annotationToggle');
                    if (annotationToggle && annotationToggle.checked) {
                        await this.toggleAnnotation(true);
                    }
                } else {
                    console.log('✅ 检测完成，未发现问题');
                    this.updateStatus('未发现问题', 0);
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
            resultCount.textContent = count > 0 ? `发现 ${count} 个问题` : '';
        }
    }

    showLoading(show) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? 'flex' : 'none';
        }
    }

    async toggleAnnotation(enabled) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.tabs.sendMessage(tab.id, {
                action: 'toggleAnnotation',
                enabled: enabled
            });
        } catch (error) {
            console.error('❌ 切换标注失败:', error);
        }
    }
}

// 初始化
new PopupController();