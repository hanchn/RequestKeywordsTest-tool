/**
 * 页面标注器 - 负责在网页上高亮显示检测到的问题元素
 */
class PageAnnotator {
    constructor() {
        this.annotations = new Map();
        this.isEnabled = true;
        this.annotationCounter = 0;
        this.styleSheet = null;
        this.init();
    }

    /**
     * 初始化标注器
     */
    init() {
        this.createStyleSheet();
        // 移除初始化日志
    }

    annotateResults(results) {
        if (!this.isEnabled) {
            return;
        }

        // 清除现有标注
        this.clearAnnotations();

        if (results.length === 0) {
            return; // 不输出"无需标注的内容"消息
        }

        results.forEach((result, index) => {
            this.annotateElement(result, index + 1);
        });

        // 只在有标注时输出简洁信息
        if (this.annotations.size > 0) {
            console.log(`🎨 已标注 ${this.annotations.size} 个元素`);
        }
    }

    clearAnnotations() {
        this.annotations.forEach((annotation) => {
            const { element, tooltip, badge } = annotation;
            
            // 移除样式类
            element.classList.remove(
                'keyword-annotation', 
                'keyword-annotation-warning', 
                'keyword-annotation-info',
                'keyword-highlight'
            );
            
            // 移除提示框和徽章
            if (tooltip && tooltip.parentNode) {
                tooltip.remove();
            }
            if (badge && badge.parentNode) {
                badge.remove();
            }
            
            // 移除事件监听器
            if (element._keywordClickHandler) {
                element.removeEventListener('click', element._keywordClickHandler);
                delete element._keywordClickHandler;
            }
        });
        
        this.annotations.clear();
        this.annotationCounter = 0;
        // 移除清除标注的日志
    }

    enable() {
        this.isEnabled = true;
        // 移除启用日志
    }

    disable() {
        this.isEnabled = false;
        this.clearAnnotations();
        // 移除禁用日志
    }

    /**
     * 创建样式表
     */
    createStyleSheet() {
        // 如果样式表已存在，先移除
        if (this.styleSheet) {
            this.styleSheet.remove();
        }

        this.styleSheet = document.createElement('style');
        this.styleSheet.id = 'keyword-detector-annotations';
        this.styleSheet.textContent = `
            /* 关键词检测标注样式 */
            .keyword-annotation {
                position: relative !important;
                background: rgba(239, 68, 68, 0.1) !important;
                border: 2px solid #ef4444 !important;
                border-radius: 4px !important;
                box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2) !important;
                animation: keyword-pulse 2s infinite !important;
            }

            .keyword-annotation-warning {
                background: rgba(245, 158, 11, 0.1) !important;
                border-color: #f59e0b !important;
                box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2) !important;
            }

            .keyword-annotation-info {
                background: rgba(59, 130, 246, 0.1) !important;
                border-color: #3b82f6 !important;
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
            }

            @keyframes keyword-pulse {
                0%, 100% {
                    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2) !important;
                }
                50% {
                    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.4) !important;
                }
            }

            .keyword-tooltip {
                position: absolute !important;
                top: -40px !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                background: #1f2937 !important;
                color: white !important;
                padding: 8px 12px !important;
                border-radius: 6px !important;
                font-size: 12px !important;
                font-weight: 500 !important;
                white-space: nowrap !important;
                z-index: 10000 !important;
                opacity: 0 !important;
                transition: opacity 0.3s ease !important;
                pointer-events: none !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
            }

            .keyword-tooltip::after {
                content: '' !important;
                position: absolute !important;
                top: 100% !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                border: 6px solid transparent !important;
                border-top-color: #1f2937 !important;
            }

            .keyword-annotation:hover .keyword-tooltip {
                opacity: 1 !important;
            }

            .keyword-badge {
                position: absolute !important;
                top: -8px !important;
                right: -8px !important;
                background: #ef4444 !important;
                color: white !important;
                border-radius: 50% !important;
                width: 20px !important;
                height: 20px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-size: 10px !important;
                font-weight: bold !important;
                z-index: 10001 !important;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
            }

            .keyword-badge-warning {
                background: #f59e0b !important;
            }

            .keyword-badge-info {
                background: #3b82f6 !important;
            }

            /* 确保标注在所有元素之上 */
            .keyword-annotation * {
                position: relative !important;
                z-index: 1 !important;
            }
        `;

        document.head.appendChild(this.styleSheet);
    }

    /**
     * 标注检测结果
     * @param {Array} results - 检测结果数组
     */
    annotateResults(results) {
        if (!this.isEnabled) {
            console.log('📍 标注功能已禁用');
            return;
        }

        // 清除现有标注
        this.clearAnnotations();

        if (results.length === 0) {
            console.log('📍 无需标注的内容');
            return;
        }

        console.log(`🎨 开始标注 ${results.length} 个检测结果`);

        results.forEach((result, index) => {
            this.annotateElement(result, index + 1);
        });

        console.log(`✅ 标注完成，共标注 ${this.annotations.size} 个元素`);
    }

    /**
     * 标注单个元素
     * @param {Object} result - 检测结果
     * @param {number} index - 索引
     */
    annotateElement(result, index) {
        const element = result.element;
        if (!element || !document.contains(element)) {
            console.warn('⚠️ 元素不存在或已被移除:', result);
            return;
        }

        try {
            // 确定标注类型和样式
            const annotationType = this.getAnnotationType(result.type);
            const annotationClass = `keyword-annotation ${annotationType}`;
            
            // 添加标注样式
            element.classList.add('keyword-annotation');
            if (annotationType !== 'keyword-annotation') {
                element.classList.add(annotationType.replace('keyword-annotation-', ''));
            }

            // 创建提示框
            const tooltip = this.createTooltip(result);
            element.appendChild(tooltip);

            // 创建标记徽章
            const badge = this.createBadge(index, result.type);
            element.appendChild(badge);

            // 存储标注信息
            const annotationId = `annotation_${this.annotationCounter++}`;
            this.annotations.set(annotationId, {
                element: element,
                result: result,
                tooltip: tooltip,
                badge: badge,
                originalClasses: element.className
            });

            // 添加点击事件
            this.addClickHandler(element, result);

            console.log(`📍 已标注元素:`, {
                keyword: result.keyword,
                type: result.type,
                selector: result.location.selector
            });

        } catch (error) {
            console.error('❌ 标注元素失败:', error, result);
        }
    }

    /**
     * 获取标注类型
     * @param {string} resultType - 结果类型
     * @returns {string} 标注类型
     */
    getAnnotationType(resultType) {
        const typeMap = {
            'text': 'keyword-annotation',
            'link': 'keyword-annotation-warning',
            'image': 'keyword-annotation-info',
            'form': 'keyword-annotation-warning'
        };
        return typeMap[resultType] || 'keyword-annotation';
    }

    /**
     * 创建提示框
     * @param {Object} result - 检测结果
     * @returns {HTMLElement} 提示框元素
     */
    createTooltip(result) {
        const tooltip = document.createElement('div');
        tooltip.className = 'keyword-tooltip';
        tooltip.innerHTML = `
            <strong>关键词:</strong> ${result.keyword}<br>
            <strong>类型:</strong> ${this.getTypeDisplayName(result.type)}<br>
            <strong>位置:</strong> ${result.location.tagName}
        `;
        return tooltip;
    }

    /**
     * 创建标记徽章
     * @param {number} index - 索引
     * @param {string} type - 类型
     * @returns {HTMLElement} 徽章元素
     */
    createBadge(index, type) {
        const badge = document.createElement('div');
        badge.className = `keyword-badge ${this.getBadgeClass(type)}`;
        badge.textContent = index;
        badge.title = `检测结果 #${index}`;
        return badge;
    }

    /**
     * 获取徽章样式类
     * @param {string} type - 类型
     * @returns {string} 样式类
     */
    getBadgeClass(type) {
        const classMap = {
            'text': '',
            'link': 'keyword-badge-warning',
            'image': 'keyword-badge-info',
            'form': 'keyword-badge-warning'
        };
        return classMap[type] || '';
    }

    /**
     * 添加点击事件处理器
     * @param {HTMLElement} element - 元素
     * @param {Object} result - 检测结果
     */
    addClickHandler(element, result) {
        const clickHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            console.group('🔍 点击了标注元素');
            console.log('关键词:', result.keyword);
            console.log('类型:', result.type);
            console.log('内容:', result.content);
            console.log('位置:', result.location);
            console.log('元素:', element);
            console.groupEnd();
            
            // 高亮显示元素
            this.highlightElement(element);
        };
        
        element.addEventListener('click', clickHandler);
        
        // 存储事件处理器以便后续移除
        element._keywordClickHandler = clickHandler;
    }

    /**
     * 高亮显示元素
     * @param {HTMLElement} element - 元素
     */
    highlightElement(element) {
        // 移除其他元素的高亮
        document.querySelectorAll('.keyword-highlight').forEach(el => {
            el.classList.remove('keyword-highlight');
        });
        
        // 添加高亮样式
        element.classList.add('keyword-highlight');
        
        // 滚动到元素位置
        element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        
        // 3秒后移除高亮
        setTimeout(() => {
            element.classList.remove('keyword-highlight');
        }, 3000);
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
     * 清除所有标注
     */
    clearAnnotations() {
        console.log('🧹 清除现有标注');
        
        this.annotations.forEach((annotation, id) => {
            const { element, tooltip, badge } = annotation;
            
            // 移除样式类
            element.classList.remove(
                'keyword-annotation', 
                'keyword-annotation-warning', 
                'keyword-annotation-info',
                'keyword-highlight'
            );
            
            // 移除提示框和徽章
            if (tooltip && tooltip.parentNode) {
                tooltip.remove();
            }
            if (badge && badge.parentNode) {
                badge.remove();
            }
            
            // 移除事件监听器
            if (element._keywordClickHandler) {
                element.removeEventListener('click', element._keywordClickHandler);
                delete element._keywordClickHandler;
            }
        });
        
        this.annotations.clear();
        this.annotationCounter = 0;
    }

    /**
     * 启用标注功能
     */
    enable() {
        this.isEnabled = true;
        console.log('✅ 标注功能已启用');
    }

    /**
     * 禁用标注功能
     */
    disable() {
        this.isEnabled = false;
        this.clearAnnotations();
        console.log('❌ 标注功能已禁用');
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStatistics() {
        return {
            totalAnnotations: this.annotations.size,
            isEnabled: this.isEnabled,
            annotationCounter: this.annotationCounter
        };
    }
}

    /**
     * 切换标注状态
     * @param {boolean} enabled - 是否启用
     */
    toggle(enabled) {
        if (enabled) {
            this.enable();
        } else {
            this.disable();
        }
    }

    /**
     * 获取标注统计信息
     * @returns {Object} 统计信息
     */
    getStatistics() {
        return {
            totalAnnotations: this.annotations.size,
            isEnabled: this.isEnabled
        };
    }

    /**
     * 销毁标注器
     */
    destroy() {
        this.clearAnnotations();
        
        if (this.styleSheet) {
            this.styleSheet.remove();
            this.styleSheet = null;
        }
        
        console.log('🗑️ 页面标注器已销毁');
    }
}

// 导出标注器类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PageAnnotator;
} else {
    window.PageAnnotator = PageAnnotator;
}