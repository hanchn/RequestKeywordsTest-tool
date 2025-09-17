/**
 * 网络请求监控器 - 拦截和检测网络请求中的关键词
 */
class NetworkMonitor {
    constructor(detector) {
        this.detector = detector;
        this.isMonitoring = false;
        this.requestResults = [];
        this.originalFetch = null;
        this.originalXHROpen = null;
    }

    start() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.interceptFetch();
        this.interceptXHR();
    }

    stop() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        this.restoreFetch();
        this.restoreXHR();
    }

    /**
     * 拦截 fetch 请求
     */
    interceptFetch() {
        const self = this;
        this.originalFetch = window.fetch;
        
        window.fetch = function(input, init) {
            const url = typeof input === 'string' ? input : input.url;
            
            // 检测请求URL
            self.checkRequestUrl(url, 'fetch');
            
            // 检测请求体
            if (init && init.body) {
                self.checkRequestBody(init.body, url, 'fetch');
            }
            
            // 调用原始fetch并检测响应
            return self.originalFetch.apply(this, arguments)
                .then(response => {
                    self.checkResponse(response.clone(), url, 'fetch');
                    return response;
                })
                .catch(error => {
                    throw error;
                });
        };
    }

    /**
     * 拦截 XMLHttpRequest
     */
    interceptXHR() {
        const self = this;
        this.originalXHROpen = XMLHttpRequest.prototype.open;
        
        XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
            this._url = url;
            this._method = method;
            
            // 检测请求URL
            self.checkRequestUrl(url, 'xhr');
            
            // 监听响应
            this.addEventListener('load', function() {
                if (this.responseText) {
                    self.checkResponseText(this.responseText, url, 'xhr');
                }
            });
            
            return self.originalXHROpen.apply(this, arguments);
        };
        
        // 拦截send方法检测请求体
        const originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(data) {
            if (data) {
                self.checkRequestBody(data, this._url, 'xhr');
            }
            return originalSend.apply(this, arguments);
        };
    }

    /**
     * 检测请求URL中的关键词
     */
    checkRequestUrl(url, type) {
        if (!url || !this.detector.keywords) return;
        
        this.detector.keywords.forEach(keyword => {
            if (url.toLowerCase().includes(keyword.toLowerCase())) {
                this.addNetworkResult({
                    type: 'request_url',
                    keyword: keyword,
                    url: url,
                    method: type,
                    content: `请求URL: ${url}`,
                    timestamp: new Date().toISOString()
                });
            }
        });
    }

    /**
     * 检测请求体中的关键词
     */
    checkRequestBody(body, url, type) {
        if (!body || !this.detector.keywords) return;
        
        let bodyText = '';
        if (typeof body === 'string') {
            bodyText = body;
        } else if (body instanceof FormData) {
            // 处理FormData
            for (let [key, value] of body.entries()) {
                bodyText += `${key}=${value}&`;
            }
        } else if (body instanceof URLSearchParams) {
            bodyText = body.toString();
        } else {
            try {
                bodyText = JSON.stringify(body);
            } catch (e) {
                bodyText = body.toString();
            }
        }
        
        this.detector.keywords.forEach(keyword => {
            if (bodyText.toLowerCase().includes(keyword.toLowerCase())) {
                this.addNetworkResult({
                    type: 'request_body',
                    keyword: keyword,
                    url: url,
                    method: type,
                    content: `请求参数: ${bodyText.substring(0, 200)}${bodyText.length > 200 ? '...' : ''}`,
                    timestamp: new Date().toISOString()
                });
            }
        });
    }

    /**
     * 检测响应内容
     */
    async checkResponse(response, url, type) {
        try {
            const text = await response.text();
            this.checkResponseText(text, url, type);
        } catch (error) {
            // 忽略响应读取错误
        }
    }

    /**
     * 检测响应文本中的关键词
     */
    checkResponseText(text, url, type) {
        if (!text || !this.detector.keywords) return;
        
        this.detector.keywords.forEach(keyword => {
            if (text.toLowerCase().includes(keyword.toLowerCase())) {
                this.addNetworkResult({
                    type: 'response',
                    keyword: keyword,
                    url: url,
                    method: type,
                    content: `响应内容: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`,
                    timestamp: new Date().toISOString()
                });
            }
        });
    }

    /**
     * 添加网络检测结果
     */
    addNetworkResult(result) {
        this.requestResults.push(result);
        
        // 输出到控制台
        console.log(`🌐 网络请求检测: 发现关键词"${result.keyword}" - ${result.content}`);
    }

    /**
     * 获取网络检测结果
     */
    getResults() {
        return this.requestResults;
    }

    /**
     * 清除检测结果
     */
    clearResults() {
        this.requestResults = [];
    }

    /**
     * 恢复原始fetch
     */
    restoreFetch() {
        if (this.originalFetch) {
            window.fetch = this.originalFetch;
        }
    }

    /**
     * 恢复原始XMLHttpRequest
     */
    restoreXHR() {
        if (this.originalXHROpen) {
            XMLHttpRequest.prototype.open = this.originalXHROpen;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NetworkMonitor;
} else {
    window.NetworkMonitor = NetworkMonitor;
}