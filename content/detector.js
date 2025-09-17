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
        // 移除设置关键词的日志
    }

    async detectKeywords() {
        if (this.isDetecting) {
            return this.detectionResults;
        }

        if (this.keywords.length === 0) {
            return [];
        }

        this.isDetecting = true;
        this.detectionResults = [];

        try {
            // 检测页面文本内容
            await this.detectInTextContent();
            
            // 检测所有元素属性
            await this.detectInAllAttributes();
            
            // 检测图片alt属性
            await this.detectInImages();
            
            // 检测表单元素
            await this.detectInForms();
            
            // 只输出简洁的检测结果
            this.logDetectionResults();
            
            return this.detectionResults;
        } catch (error) {
            console.error('❌ 检测失败:', error);
            return [];
        } finally {
            this.isDetecting = false;
        }
    }

    /**
     * 输出检测结果到控制台（简化版）
     */
    logDetectionResults() {
        if (this.detectionResults.length === 0) {
            return; // 不输出"未发现违规关键词"的消息
        }

        // 只输出问题列表，不使用console.group
        console.log('🚨 检测到的问题:');
        
        this.detectionResults.forEach((result, index) => {
            console.log(`${index + 1}. 关键词"${result.keyword}" - ${this.getTypeDisplayName(result.type)}: ${result.content.substring(0, 50)}${result.content.length > 50 ? '...' : ''}`);
        });
        
        // 输出简洁的统计信息
        const uniqueKeywords = new Set(this.detectionResults.map(r => r.keyword)).size;
        console.log(`📊 总计: ${this.detectionResults.length} 个问题，${uniqueKeywords} 个关键词`);
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
        // 检测所有带href属性的元素，包括a标签、link标签等
        const linkElements = document.querySelectorAll('[href]');
        
        linkElements.forEach(element => {
            const href = element.href || element.getAttribute('href');
            const text = element.textContent ? element.textContent.trim() : '';
            const tagName = element.tagName.toLowerCase();
            
            this.keywords.forEach(keyword => {
                if (href && href.toLowerCase().includes(keyword.toLowerCase())) {
                    let content = '';
                    if (tagName === 'link') {
                        content = `${tagName}标签: ${href}`;
                    } else if (tagName === 'a') {
                        content = `链接: ${href}${text ? ` | 文本: ${text}` : ''}`;
                    } else {
                        content = `${tagName}标签: ${href}`;
                    }
                    
                    this.addDetectionResult({
                        type: 'link',
                        keyword: keyword,
                        element: element,
                        content: content,
                        location: this.getElementLocation(element)
                    });
                }
                
                // 对于有文本内容的元素，也检测文本
                if (text && text.toLowerCase().includes(keyword.toLowerCase())) {
                    this.addDetectionResult({
                        type: 'link',
                        keyword: keyword,
                        element: element,
                        content: `链接文本: ${text}`,
                        location: this.getElementLocation(element)
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
    logDetectionResults(results) {
        if (results.length === 0) {
            return; // 无问题时不输出任何信息
        }
        
        console.log(`检测到 ${results.length} 个问题:`);
        results.forEach((result, index) => {
            const content = result.content.length > 50 ? 
                result.content.substring(0, 50) + '...' : result.content;
            console.log(`${index + 1}. "${content}" - ${this.getTypeDisplayName(result.type)}`);
        });
    }

    /**
     * 获取类型显示名称
     * @param {string} type - 类型
     * @returns {string} 显示名称
     */
    getTypeDisplayName(type) {
        const typeMap = {
            'text': '文本内容',
            'link': '链接地址',
            'image': '图片属性',
            'form': '表单元素',
            'attribute': '元素属性'
        };
        return typeMap[type] || type;
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

/**
 * 检测所有元素的所有属性
 */
async detectInAllAttributes() {
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach(element => {
        // 获取元素的所有属性
        const attributes = element.attributes;
        
        for (let i = 0; i < attributes.length; i++) {
            const attr = attributes[i];
            const attrName = attr.name;
            const attrValue = attr.value;
            
            // 跳过一些不需要检测的属性
            if (this.shouldSkipAttribute(attrName)) {
                continue;
            }
            
            this.keywords.forEach(keyword => {
                if (attrValue && attrValue.toLowerCase().includes(keyword.toLowerCase())) {
                    this.addDetectionResult({
                        type: 'attribute',
                        keyword: keyword,
                        element: element,
                        content: `${element.tagName.toLowerCase()}[${attrName}="${attrValue}"]`,
                        location: this.getElementLocation(element),
                        attributeName: attrName,
                        attributeValue: attrValue
                    });
                }
            });
        }
    });
}

/**
 * 判断是否应该跳过某个属性的检测
 */
shouldSkipAttribute(attrName) {
    const skipAttributes = [
        'style', 'class', 'id', 'data-*', 
        'aria-*', 'role', 'tabindex', 'contenteditable',
        'draggable', 'hidden', 'lang', 'dir', 'translate'
    ];
    
    // 检查是否在跳过列表中
    if (skipAttributes.includes(attrName)) {
        return true;
    }
    
    // 检查通配符匹配
    if (attrName.startsWith('data-') || attrName.startsWith('aria-')) {
        return true;
    }
    
    return false;
}