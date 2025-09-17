/**
 * 关键词检测器 - 负责在网页中检测非法关键词
 */
class KeywordDetector {
    constructor() {
        this.keywords = [];
        this.detectionResults = [];
        this.isDetecting = false;
    }

    /**
     * 设置检测关键词
     * @param {string[]} keywords - 关键词数组
     */
    setKeywords(keywords) {
        this.keywords = keywords.filter(keyword => keyword.trim().length > 0);
        console.log('🔍 设置检测关键词:', this.keywords);
    }

    /**
     * 开始检测当前页面
     * @returns {Promise<Array>} 检测结果
     */
    async detectKeywords() {
        if (this.isDetecting) {
            console.log('⚠️ 检测正在进行中...');
            return this.detectionResults;
        }

        if (this.keywords.length === 0) {
            console.log('⚠️ 未设置检测关键词');
            return [];
        }

        this.isDetecting = true;
        this.detectionResults = [];

        try {
            console.log('🚀 开始关键词检测...');
            
            // 检测页面文本内容
            await this.detectInTextContent();
            
            // 检测链接地址
            await this.detectInLinks();
            
            // 检测图片alt属性
            await this.detectInImages();
            
            // 检测表单元素
            await this.detectInForms();
            
            console.log(`✅ 检测完成，发现 ${this.detectionResults.length} 个问题`);
            
            // 输出详细结果到控制台
            this.logDetectionResults();
            
            return this.detectionResults;
        } catch (error) {
            console.error('❌ 检测过程中发生错误:', error);
            return [];
        } finally {
            this.isDetecting = false;
        }
    }

    /**
     * 检测页面文本内容
     */
    async detectInTextContent() {
        const textNodes = this.getAllTextNodes();
        
        textNodes.forEach(node => {
            const text = node.textContent.trim();
            if (text.length === 0) return;

            this.keywords.forEach(keyword => {
                if (text.toLowerCase().includes(keyword.toLowerCase())) {
                    this.addDetectionResult({
                        type: 'text',
                        keyword: keyword,
                        element: node.parentElement,
                        content: text,
                        location: this.getElementLocation(node.parentElement)
                    });
                }
            });
        });
    }

    /**
     * 检测链接地址
     */
    async detectInLinks() {
        const links = document.querySelectorAll('a[href]');
        
        links.forEach(link => {
            const href = link.href;
            const text = link.textContent.trim();
            
            this.keywords.forEach(keyword => {
                if (href.toLowerCase().includes(keyword.toLowerCase()) || 
                    text.toLowerCase().includes(keyword.toLowerCase())) {
                    this.addDetectionResult({
                        type: 'link',
                        keyword: keyword,
                        element: link,
                        content: `链接: ${href} | 文本: ${text}`,
                        location: this.getElementLocation(link)
                    });
                }
            });
        });
    }

    /**
     * 检测图片alt属性
     */
    async detectInImages() {
        const images = document.querySelectorAll('img[alt], img[title]');
        
        images.forEach(img => {
            const alt = img.alt || '';
            const title = img.title || '';
            const src = img.src || '';
            
            this.keywords.forEach(keyword => {
                if (alt.toLowerCase().includes(keyword.toLowerCase()) || 
                    title.toLowerCase().includes(keyword.toLowerCase()) ||
                    src.toLowerCase().includes(keyword.toLowerCase())) {
                    this.addDetectionResult({
                        type: 'image',
                        keyword: keyword,
                        element: img,
                        content: `图片: ${src} | Alt: ${alt} | Title: ${title}`,
                        location: this.getElementLocation(img)
                    });
                }
            });
        });
    }

    /**
     * 检测表单元素
     */
    async detectInForms() {
        const formElements = document.querySelectorAll('input, textarea, select, label');
        
        formElements.forEach(element => {
            const value = element.value || '';
            const placeholder = element.placeholder || '';
            const label = element.textContent || '';
            
            this.keywords.forEach(keyword => {
                if (value.toLowerCase().includes(keyword.toLowerCase()) || 
                    placeholder.toLowerCase().includes(keyword.toLowerCase()) ||
                    label.toLowerCase().includes(keyword.toLowerCase())) {
                    this.addDetectionResult({
                        type: 'form',
                        keyword: keyword,
                        element: element,
                        content: `表单元素: ${element.tagName} | 值: ${value} | 占位符: ${placeholder}`,
                        location: this.getElementLocation(element)
                    });
                }
            });
        });
    }

    /**
     * 获取所有文本节点
     * @returns {Node[]} 文本节点数组
     */
    getAllTextNodes() {
        const textNodes = [];
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // 排除脚本和样式标签中的文本
                    const parent = node.parentElement;
                    if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            if (node.textContent.trim().length > 0) {
                textNodes.push(node);
            }
        }

        return textNodes;
    }

    /**
     * 添加检测结果
     * @param {Object} result - 检测结果对象
     */
    addDetectionResult(result) {
        // 避免重复添加相同的结果
        const exists = this.detectionResults.some(existing => 
            existing.element === result.element && 
            existing.keyword === result.keyword &&
            existing.type === result.type
        );

        if (!exists) {
            this.detectionResults.push({
                ...result,
                timestamp: new Date().toISOString(),
                id: `${result.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            });
        }
    }

    /**
     * 获取元素在页面中的位置信息
     * @param {Element} element - DOM元素
     * @returns {Object} 位置信息
     */
    getElementLocation(element) {
        if (!element) return { selector: 'unknown', xpath: 'unknown' };

        try {
            // 生成CSS选择器
            const selector = this.generateCSSSelector(element);
            
            // 生成XPath
            const xpath = this.generateXPath(element);
            
            // 获取元素在视口中的位置
            const rect = element.getBoundingClientRect();
            
            return {
                selector: selector,
                xpath: xpath,
                tagName: element.tagName.toLowerCase(),
                className: element.className || '',
                id: element.id || '',
                position: {
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                }
            };
        } catch (error) {
            console.warn('获取元素位置信息失败:', error);
            return { selector: 'error', xpath: 'error' };
        }
    }

    /**
     * 生成CSS选择器
     * @param {Element} element - DOM元素
     * @returns {string} CSS选择器
     */
    generateCSSSelector(element) {
        if (element.id) {
            return `#${element.id}`;
        }
        
        let selector = element.tagName.toLowerCase();
        
        if (element.className) {
            const classes = element.className.split(' ').filter(c => c.trim());
            if (classes.length > 0) {
                selector += '.' + classes.join('.');
            }
        }
        
        // 添加nth-child选择器以确保唯一性
        const parent = element.parentElement;
        if (parent) {
            const siblings = Array.from(parent.children);
            const index = siblings.indexOf(element) + 1;
            selector += `:nth-child(${index})`;
        }
        
        return selector;
    }

    /**
     * 生成XPath
     * @param {Element} element - DOM元素
     * @returns {string} XPath
     */
    generateXPath(element) {
        if (element.id) {
            return `//*[@id="${element.id}"]`;
        }
        
        const parts = [];
        let current = element;
        
        while (current && current.nodeType === Node.ELEMENT_NODE) {
            let part = current.tagName.toLowerCase();
            
            if (current.parentElement) {
                const siblings = Array.from(current.parentElement.children)
                    .filter(child => child.tagName === current.tagName);
                
                if (siblings.length > 1) {
                    const index = siblings.indexOf(current) + 1;
                    part += `[${index}]`;
                }
            }
            
            parts.unshift(part);
            current = current.parentElement;
        }
        
        return '/' + parts.join('/');
    }

    /**
     * 输出检测结果到控制台
     */
    logDetectionResults() {
        if (this.detectionResults.length === 0) {
            console.log('✅ 未发现违规关键词');
            return;
        }

        console.group('🚨 关键词检测结果详情');
        
        // 按类型分组显示结果
        const groupedResults = this.detectionResults.reduce((groups, result) => {
            const type = result.type;
            if (!groups[type]) {
                groups[type] = [];
            }
            groups[type].push(result);
            return groups;
        }, {});

        Object.entries(groupedResults).forEach(([type, results]) => {
            console.group(`📍 ${this.getTypeDisplayName(type)} (${results.length}个)`);
            
            results.forEach((result, index) => {
                console.group(`${index + 1}. 关键词: "${result.keyword}"`);
                console.log('📄 内容:', result.content);
                console.log('🎯 元素:', result.element);
                console.log('📍 位置:', result.location.selector);
                console.log('🔗 XPath:', result.location.xpath);
                console.log('⏰ 检测时间:', result.timestamp);
                console.groupEnd();
            });
            
            console.groupEnd();
        });
        
        console.groupEnd();
        
        // 输出统计信息
        console.log(`📊 检测统计: 共发现 ${this.detectionResults.length} 个问题，涉及 ${new Set(this.detectionResults.map(r => r.keyword)).size} 个关键词`);
    }

    /**
     * 获取类型显示名称
     * @param {string} type - 类型
     * @returns {string} 显示名称
     */
    getTypeDisplayName(type) {
        const typeNames = {
            'text': '文本内容',
            'link': '链接地址',
            'image': '图片信息',
            'form': '表单元素'
        };
        return typeNames[type] || type;
    }

    /**
     * 清除检测结果
     */
    clearResults() {
        this.detectionResults = [];
        console.log('🧹 已清除检测结果');
    }

    /**
     * 获取检测结果
     * @returns {Array} 检测结果数组
     */
    getResults() {
        return this.detectionResults;
    }

    /**
     * 获取检测统计信息
     * @returns {Object} 统计信息
     */
    getStatistics() {
        const uniqueKeywords = new Set(this.detectionResults.map(r => r.keyword));
        const typeStats = this.detectionResults.reduce((stats, result) => {
            stats[result.type] = (stats[result.type] || 0) + 1;
            return stats;
        }, {});

        return {
            totalIssues: this.detectionResults.length,
            uniqueKeywords: uniqueKeywords.size,
            keywordList: Array.from(uniqueKeywords),
            typeBreakdown: typeStats
        };
    }
}

// 导出检测器类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeywordDetector;
} else {
    window.KeywordDetector = KeywordDetector;
}