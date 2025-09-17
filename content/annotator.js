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
    }

    /**
     * 标注检测结果
     * @param {Array} results - 检测结果数组
     */
    annotateResults(results) {
        if (!this.isEnabled) {
            return;
        }

        // 清除现有标注
        this.clearAnnotations();

        if (results.length === 0) {
            return;
        }

        results.forEach((result, index) => {
            this.annotateElement(result, index + 1);
        });

        // 只在有标注时输出简洁信息
        if (this.annotations.size > 0) {
            console.log(`🎨 已标注 ${this.annotations.size} 个元素`);
        }
    }

    /**
     * 清除所有标注
     */
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
     * 创建样式表
     */
    createStyleSheet() {
        // 移除现有样式表
        if (this.styleSheet) {
            this.styleSheet.remove();
        }

        // 创建新的样式表
        this.styleSheet = document.createElement('style');
        this.styleSheet.textContent = `
            .keyword-annotation {
                position: relative !important;
                background-color: rgba(255, 235, 59, 0.3) !important;
                border: 2px solid #FFC107 !important;
                border-radius: 4px !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
            }
            
            .keyword-annotation-warning {
                background-color: rgba(255, 152, 0, 0.3) !important;
                border-color: #FF9800 !important;
            }
            
            .keyword-annotation-info {
                background-color: rgba(33, 150, 243, 0.3) !important;
                border-color: #2196F3 !important;
            }
            
            .keyword-highlight {
                animation: keyword-pulse 2s infinite;
            }
            
            @keyframes keyword-pulse {
                0% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(255, 193, 7, 0); }
                100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
            }
            
            .keyword-tooltip {
                position: absolute !important;
                top: -40px !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                background: rgba(0, 0, 0, 0.9) !important;
                color: white !important;
                padding: 8px 12px !important;
                border-radius: 6px !important;
                font-size: 12px !important;
                white-space: nowrap !important;
                z-index: 10000 !important;
                opacity: 0 !important;
                pointer-events: none !important;
                transition: opacity 0.3s ease !important;
            }
            
            .keyword-annotation:hover .keyword-tooltip {
                opacity: 1 !important;
            }
            
            .keyword-badge {
                position: absolute !important;
                top: -8px !important;
                right: -8px !important;
                background: #FF5722 !important;
                color: white !important;
                border-radius: 50% !important;
                width: 20px !important;
                height: 20px !important;
                font-size: 10px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-weight: bold !important;
                z-index: 10001 !important;
            }
        `;
        
        document.head.appendChild(this.styleSheet);
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
        tooltip.textContent = `关键词: ${result.keyword} | 类型: ${this.getTypeDisplayName(result.type)}`;
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
        return badge;
    }

    /**
     * 获取徽章样式类
     * @param {string} type - 类型
     * @returns {string} 样式类
     */
    getBadgeClass(type) {
        const classMap = {
            'text': 'badge-text',
            'link': 'badge-warning',
            'image': 'badge-info',
            'form': 'badge-warning'
        };
        return classMap[type] || 'badge-default';
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
            
            console.log('🔍 点击了标注元素:', {
                keyword: result.keyword,
                type: result.type,
                element: element,
                location: result.location
            });
            
            // 高亮显示元素
            this.highlightElement(element);
        };
        
        element.addEventListener('click', clickHandler);
        element._keywordClickHandler = clickHandler;
    }

    /**
     * 高亮显示元素
     * @param {HTMLElement} element - 要高亮的元素
     */
    highlightElement(element) {
        // 移除现有高亮
        document.querySelectorAll('.keyword-highlight').forEach(el => {
            el.classList.remove('keyword-highlight');
        });
        
        // 添加高亮效果
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
            isEnabled: this.isEnabled,
            annotationCounter: this.annotationCounter
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