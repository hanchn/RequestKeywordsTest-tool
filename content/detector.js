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
        console.log('🎯 设置检测关键词:', this.keywords);
    }

    // 在 detectKeywords 方法开始处添加更多调试信息
    async detectKeywords() {
        if (this.isDetecting) {
            console.log('⚠️ 检测正在进行中，返回现有结果');
            return this.detectionResults;
        }
    
        if (this.keywords.length === 0) {
            console.log('⚠️ 没有设置关键词，跳过检测');
            return [];
        }
    
        console.log('🔍 开始关键词检测...');
        console.log('🎯 检测关键词:', this.keywords);
        console.log('📄 当前页面URL:', window.location.href);
        console.log('📊 页面状态:', document.readyState);
        
        this.isDetecting = true;
        this.detectionResults = [];
    
        try {
            // 检测页面文本内容
            await this.detectInTextContent();
            
            // 检测所有元素属性（包括link标签的href）
            await this.detectInAllAttributes();
            
            // 检测图片alt属性
            await this.detectInImages();
            
            // 检测表单元素
            await this.detectInForms();
            
            // 输出检测结果
            this.logDetectionResults();
            
            return this.detectionResults;
            
        } catch (error) {
            console.error('❌ 检测过程中发生错误:', error);
            throw error;
        } finally {
            this.isDetecting = false;
        }
    }

    /**
     * 检测所有元素的所有属性
     */
    async detectInAllAttributes() {
        console.log('🔍 开始检测所有元素属性...');
        const allElements = document.querySelectorAll('*');
        console.log(`📊 总共找到 ${allElements.length} 个元素`);
        
        let attributeCount = 0;
        let foundCount = 0;
        
        allElements.forEach(element => {
            const attributes = element.attributes;
            
            for (let i = 0; i < attributes.length; i++) {
                const attr = attributes[i];
                const attrName = attr.name;
                const attrValue = attr.value;
                attributeCount++;
                
                // 跳过一些不需要检测的属性
                if (this.shouldSkipAttribute(attrName)) {
                    continue;
                }
                
                // 特别关注link标签的href属性
                if (element.tagName.toLowerCase() === 'link' && attrName === 'href') {
                    console.log(`🔗 检查link标签: ${attrValue}`);
                }
                
                this.keywords.forEach(keyword => {
                    if (attrValue && attrValue.toLowerCase().includes(keyword.toLowerCase())) {
                        foundCount++;
                        console.log(`✅ 在属性中发现关键词: ${keyword} -> ${element.tagName}[${attrName}="${attrValue}"]`);
                        
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
        
        console.log(`📊 检查了 ${attributeCount} 个属性，发现 ${foundCount} 个匹配`);
    }

    /**
     * 判断是否应该跳过某个属性的检测
     */
    shouldSkipAttribute(attrName) {
        const skipAttributes = [
            'style', 'class', 'id', 
            'role', 'tabindex', 'contenteditable',
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
                    if (node.nodeValue.trim().length > 0) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_REJECT;
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
        // 避免重复添加相同的结果
        const exists = this.detectionResults.some(existing => 
            existing.keyword === result.keyword && 
            existing.content === result.content &&
            existing.type === result.type
        );
        
        if (!exists) {
            this.detectionResults.push({
                ...result,
                id: Date.now() + Math.random(),
                timestamp: new Date().toISOString()
            });
        }
    }

    getElementLocation(element) {
        if (!element) return null;
        
        const rect = element.getBoundingClientRect();
        return {
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height,
            selector: this.generateCSSSelector(element),
            xpath: this.generateXPath(element)
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
        
        const parts = [];
        
        while (element && element.nodeType === Node.ELEMENT_NODE) {
            let index = 0;
            let sibling = element.previousSibling;
            
            while (sibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === element.tagName) {
                    index++;
                }
                sibling = sibling.previousSibling;
            }
            
            const tagName = element.tagName.toLowerCase();
            const pathIndex = index > 0 ? `[${index + 1}]` : '';
            parts.unshift(`${tagName}${pathIndex}`);
            
            element = element.parentNode;
        }
        
        return parts.length ? '/' + parts.join('/') : '';
    }

    logDetectionResults() {
        if (this.detectionResults.length === 0) {
            return;
        }

        console.log(`🚨 发现 ${this.detectionResults.length} 个问题:`);
        this.detectionResults.forEach((result, index) => {
            console.log(`${index + 1}. "${result.keyword}" - ${result.content}`);
        });
    }

    getTypeDisplayName(type) {
        const typeMap = {
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