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
    }

    async detectKeywords() {
        if (this.isDetecting) {
            return this.detectionResults;
        }
    
        if (this.keywords.length === 0) {
            return [];
        }
    
        this.isDetecting = true;
        this.clearResults();
    
        try {
            await this.detectInTextContent();
            await this.detectInAllAttributes();
            await this.detectInImages();
            await this.detectInForms();
    
            this.logFinalResults();
    
            return this.detectionResults;
        } catch (error) {
            console.error('检测失败:', error);
            return [];
        } finally {
            this.isDetecting = false;
        }
    }

    // 添加模糊匹配方法
    fuzzyMatch(text, keyword) {
        // 简单的编辑距离匹配
        const textLower = text.toLowerCase();
        const keywordLower = keyword.toLowerCase();
        
        // 精确匹配
        if (textLower.includes(keywordLower)) {
            return true;
        }
        
        // 容错匹配：允许1个字符差异
        if (Math.abs(textLower.length - keywordLower.length) <= 1) {
            let differences = 0;
            const maxLen = Math.max(textLower.length, keywordLower.length);
            
            for (let i = 0; i < maxLen; i++) {
                if (textLower[i] !== keywordLower[i]) {
                    differences++;
                    if (differences > 1) return false;
                }
            }
            return differences <= 1;
        }
        
        return false;
    }

    // 修改检测逻辑使用模糊匹配
    async detectInAllAttributes() {
        const allElements = document.querySelectorAll('*');
        let foundCount = 0;
    
        for (const element of allElements) {
            if (element.attributes) {
                for (const attr of element.attributes) {
                    if (typeof this.shouldSkipAttribute !== 'function') {
                        console.error('shouldSkipAttribute 方法未定义，跳过属性检测');
                        return foundCount;
                    }
                    
                    if (this.shouldSkipAttribute(attr.name)) {
                        continue;
                    }
    
                    const attrValue = attr.value.toLowerCase();
    
                    if (element.tagName === 'LINK' && attr.name === 'href') {
                        for (const keyword of this.keywords) {
                            // 使用模糊匹配
                            if (this.fuzzyMatch(attrValue, keyword)) {
                                this.addDetectionResult({
                                    type: 'link_href',
                                    keyword: keyword,
                                    element: element,
                                    content: attrValue,
                                    location: this.getElementLocation(element)
                                });
                                foundCount++;
                            }
                        }
                    } else {
                        for (const keyword of this.keywords) {
                            // 使用模糊匹配
                            if (this.fuzzyMatch(attrValue, keyword)) {
                                this.addDetectionResult({
                                    type: 'attribute',
                                    keyword: keyword,
                                    element: element,
                                    content: `${attr.name}="${attrValue}"`,
                                    location: this.getElementLocation(element)
                                });
                                foundCount++;
                            }
                        }
                    }
                }
            }
        }
    
        return foundCount;
    }

    // 修改shouldSkipAttribute方法以检测所有地址相关属性
    shouldSkipAttribute(attrName) {
        const skipAttributes = [
            'style', 'class', 'id', 'data-reactid', 'data-react-checksum',
            'data-reactroot', 'data-testid', 'aria-label', 'aria-describedby',
            'aria-hidden', 'tabindex', 'role', 'autocomplete', 'spellcheck',
            'contenteditable', 'draggable', 'translate', 'dir', 'lang',
            'xmlns', 'xml:lang', 'xml:space'
        ];
        
        // 地址相关的属性，这些都需要检测
        const urlAttributes = [
            'href', 'src', 'action', 'formaction', 'data-url', 'data-link',
            'data-href', 'data-src', 'data-action', 'poster', 'cite',
            'longdesc', 'usemap', 'manifest', 'ping', 'background',
            'codebase', 'archive', 'classid', 'data', 'profile'
        ];
        
        // 如果是地址相关属性，不跳过（需要检测）
        if (urlAttributes.includes(attrName.toLowerCase())) {
            return false;
        }
        
        // 如果属性名包含url、link、href等关键词，不跳过
        const attrLower = attrName.toLowerCase();
        if (attrLower.includes('url') || attrLower.includes('link') || 
            attrLower.includes('href') || attrLower.includes('src') ||
            attrLower.includes('action') || attrLower.includes('endpoint')) {
            return false;
        }
        
        // 跳过常见的非地址属性
        if (skipAttributes.includes(attrName.toLowerCase())) {
            return true;
        }
        
        // 跳过大部分data-属性，但保留可能包含地址的
        if (attrName.startsWith('data-') && 
            !attrLower.includes('url') && !attrLower.includes('link') && 
            !attrLower.includes('href') && !attrLower.includes('src') &&
            !attrLower.includes('action') && !attrLower.includes('endpoint')) {
            return true;
        }
        
        return false;
    }

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
     * 检测图片alt属性
     */
    async detectInImages() {
        const images = document.querySelectorAll('img[alt], img[title]');
        
        images.forEach(img => {
            const alt = img.alt || img.title || '';
            
            this.keywords.forEach(keyword => {
                if (alt.toLowerCase().includes(keyword.toLowerCase())) {
                    this.addDetectionResult({
                        type: 'image',
                        keyword: keyword,
                        element: img,
                        content: `图片: ${alt}`,
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
        const formElements = document.querySelectorAll('input, textarea, select, option');
        
        formElements.forEach(element => {
            const value = element.value || element.placeholder || element.textContent || '';
            
            this.keywords.forEach(keyword => {
                if (value.toLowerCase().includes(keyword.toLowerCase())) {
                    this.addDetectionResult({
                        type: 'form',
                        keyword: keyword,
                        element: element,
                        content: `表单: ${value}`,
                        location: this.getElementLocation(element)
                    });
                }
            });
        });
    }

    getAllTextNodes() {
        const textNodes = [];
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    if (node.parentElement.tagName === 'SCRIPT' || 
                        node.parentElement.tagName === 'STYLE' ||
                        node.parentElement.tagName === 'NOSCRIPT') {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );
        
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        
        return textNodes;
    }

    addDetectionResult(result) {
        result.timestamp = new Date().toISOString();
        result.url = window.location.href;
        result.selector = this.generateCSSSelector(result.element);
        result.xpath = this.generateXPath(result.element);
        
        this.detectionResults.push(result);
    }

    getElementLocation(element) {
        if (!element) return null;
        
        const rect = element.getBoundingClientRect();
        return {
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height
        };
    }

    generateCSSSelector(element) {
        if (!element) return '';
        
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
        
        return selector;
    }

    generateXPath(element) {
        if (!element) return '';
        
        if (element.id) {
            return `//*[@id="${element.id}"]`;
        }
        
        const parts = [];
        let current = element;
        
        while (current && current.nodeType === Node.ELEMENT_NODE) {
            let index = 1;
            let sibling = current.previousElementSibling;
            
            while (sibling) {
                if (sibling.tagName === current.tagName) {
                    index++;
                }
                sibling = sibling.previousElementSibling;
            }
            
            const tagName = current.tagName.toLowerCase();
            const part = index > 1 ? `${tagName}[${index}]` : tagName;
            parts.unshift(part);
            
            current = current.parentElement;
        }
        
        return '/' + parts.join('/');
    }

    // 简化的日志输出方法
    logFinalResults() {
        const totalChecked = document.querySelectorAll('*').length;
        const errorCount = this.detectionResults.length;
        
        if (errorCount > 0) {
            console.log(`🚨 检测结果: ${errorCount}/${totalChecked}`);
            console.log('错误列表:');
            this.detectionResults.forEach((result, index) => {
                console.log(`${index + 1}. "${result.keyword}" - ${result.content}`);
            });
        } else {
            console.log(`✅ 检测完成: 0/${totalChecked} - 未发现问题`);
        }
    }

    getTypeDisplayName(type) {
        const typeNames = {
            'text': '文本内容',
            'attribute': '元素属性',
            'image': '图片属性',
            'form': '表单元素'
        };
        return typeMap[type] || type;
    }

    clearResults() {
        this.detectionResults = [];
    }

    getResults() {
        return this.detectionResults;
    }

    getStatistics() {
        const uniqueKeywords = new Set(this.detectionResults.map(r => r.keyword));
        const typeBreakdown = {};
        
        this.detectionResults.forEach(result => {
            typeBreakdown[result.type] = (typeBreakdown[result.type] || 0) + 1;
        });
        
        return {
            totalIssues: this.detectionResults.length,
            uniqueKeywords: uniqueKeywords.size,
            keywordList: Array.from(uniqueKeywords),
            typeBreakdown: typeBreakdown
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeywordDetector;
} else {
    window.KeywordDetector = KeywordDetector;
}