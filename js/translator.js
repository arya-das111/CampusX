class TranslationEngine {
    constructor() {
        this.cache = JSON.parse(localStorage.getItem('campusai_translations')) || {};
        this.currentLang = localStorage.getItem('campusai_lang') || 'en-IN';
        this.originalTexts = new Map(); // textNode -> originalText
        
        // Define common Indic languages supported by Sarvam
        this.languages = [
            { code: 'en-IN', name: 'English' },
            { code: 'hi-IN', name: 'Hindi (हिंदी)' },
            { code: 'bn-IN', name: 'Bengali (বাংলা)' },
            { code: 'ta-IN', name: 'Tamil (தமிழ்)' },
            { code: 'te-IN', name: 'Telugu (తెలుగు)' },
            { code: 'mr-IN', name: 'Marathi (मराठी)' },
            { code: 'gu-IN', name: 'Gujarati (ગુજરાતી)' },
            { code: 'kn-IN', name: 'Kannada (ಕನ್ನಡ)' },
            { code: 'ml-IN', name: 'Malayalam (മലയാളം)' },
            { code: 'pa-IN', name: 'Punjabi (ਪੰਜਾਬੀ)' }
        ];

        this.init();
    }

    init() {
        // Inject UI when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
        
        // Observe dynamic DOM changes (e.g. tab switching)
        this.observer = new MutationObserver((mutations) => {
            if (this.currentLang !== 'en-IN') {
                // Short debounce before translating new content
                clearTimeout(this.mutationTimeout);
                this.mutationTimeout = setTimeout(() => {
                    this.translatePage(this.currentLang, true);
                }, 500);
            }
        });
        
        this.observer.observe(document.body, { childList: true, subtree: true });
    }

    setup() {
        this.injectLanguageSelector();
        if (this.currentLang !== 'en-IN') {
            this.translatePage(this.currentLang, false);
        }
    }

    injectLanguageSelector() {
        // Avoid duplicate injection
        if (document.getElementById('campusai-lang-selector')) return;

        const selectorContainer = document.createElement('div');
        selectorContainer.id = 'campusai-lang-selector';
        selectorContainer.style.position = 'fixed';
        selectorContainer.style.bottom = '24px';
        selectorContainer.style.right = '24px';
        selectorContainer.style.zIndex = '99999';
        selectorContainer.style.background = 'rgba(255, 255, 255, 0.95)';
        selectorContainer.style.padding = '10px 16px';
        selectorContainer.style.borderRadius = '50px';
        selectorContainer.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)';
        selectorContainer.style.display = 'flex';
        selectorContainer.style.alignItems = 'center';
        selectorContainer.style.gap = '10px';
        selectorContainer.style.backdropFilter = 'blur(10px)';
        selectorContainer.style.border = '1px solid rgba(0,0,0,0.05)';
        selectorContainer.style.transition = 'all 0.3s ease';

        const icon = document.createElement('span');
        // using an icon indicating translation
        icon.innerHTML = '🌍'; 
        icon.style.fontSize = '1.3rem';

        const select = document.createElement('select');
        select.style.border = 'none';
        select.style.background = 'transparent';
        select.style.fontSize = '14px';
        select.style.fontWeight = '700';
        select.style.color = '#1e293b';
        select.style.outline = 'none';
        select.style.cursor = 'pointer';

        this.languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = lang.name;
            if (lang.code === this.currentLang) option.selected = true;
            select.appendChild(option);
        });

        // Loading spinner
        const spinner = document.createElement('div');
        spinner.innerHTML = `<svg class="lang-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>`;
        spinner.style.display = 'none';
        spinner.style.animation = 'spin 1s linear infinite';
        
        // Add styles for spinner
        if (!document.getElementById('lang-spinner-style')) {
            const style = document.createElement('style');
            style.id = 'lang-spinner-style';
            style.innerHTML = `@keyframes spin { 100% { transform: rotate(360deg); } }`;
            document.head.appendChild(style);
        }

        select.addEventListener('change', (e) => {
            this.currentLang = e.target.value;
            localStorage.setItem('campusai_lang', this.currentLang);
            if (this.currentLang === 'en-IN') {
                this.restoreOriginal();
            } else {
                spinner.style.display = 'inline-block';
                icon.style.display = 'none';
                this.translatePage(this.currentLang, false).finally(() => {
                    spinner.style.display = 'none';
                    icon.style.display = 'inline-block';
                });
            }
        });

        selectorContainer.appendChild(icon);
        selectorContainer.appendChild(spinner);
        selectorContainer.appendChild(select);
        document.body.appendChild(selectorContainer);
    }

    getTextNodes(element) {
        const textNodes = [];
        const walk = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    const parent = node.parentNode;
                    // Ignore scripts, styles, noscripts, language selector itself, icons
                    if (parent && (
                        parent.tagName === 'SCRIPT' || 
                        parent.tagName === 'STYLE' || 
                        parent.tagName === 'NOSCRIPT' ||
                        parent.closest('#campusai-lang-selector') ||
                        parent.getAttribute('data-notranslate') !== null ||
                        getComputedStyle(parent).fontFamily.toLowerCase().includes('icon')
                    )) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    // Only accept nodes with actual letters/numbers
                    if (/[a-zA-Z0-9]/.test(node.nodeValue)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }
            },
            false
        );

        let node;
        while (node = walk.nextNode()) {
            textNodes.push(node);
            if (!this.originalTexts.has(node)) {
                // Store the text ignoring extra surrounding white space to make translation cleaner
                this.originalTexts.set(node, node.nodeValue);
            }
        }
        return textNodes;
    }

    restoreOriginal() {
        for (const [node, originalText] of this.originalTexts.entries()) {
            if (node.parentNode) {
                node.nodeValue = originalText;
            }
        }
    }

    async translatePage(targetLangCode, isDynamicUpdate = false) {
        if (this.isTranslating) {
            this.pendingTranslation = true;
            return;
        }
        this.isTranslating = true;

        try {
            const textNodes = this.getTextNodes(document.body);
            
            const nodesToTranslate = [];
            
            for (const node of textNodes) {
                const originalTextFull = this.originalTexts.get(node);
                const textToScan = originalTextFull.trim();
                
                // Skip really short non-word stuff
                if (textToScan.length < 2 && !/[a-zA-Z]/.test(textToScan)) continue;

                const cacheKey = `${targetLangCode}_${textToScan}`;
                
                if (this.cache[cacheKey]) {
                    // Use cached translation
                    node.nodeValue = originalTextFull.replace(textToScan, this.cache[cacheKey]);
                } else {
                    nodesToTranslate.push({ node, originalTextFull, textToScan });
                }
            }

            if (nodesToTranslate.length === 0) return;

            // Group into sentences if there are many nodes
            // Or batch translation to avoid making 100s of requests
            // Maximum 10 items per batch to preserve delimiter accurately
            const BATCH_SIZE = 10; 
            
            const langSelect = document.querySelector('#campusai-lang-selector select');
            if (langSelect && !isDynamicUpdate) langSelect.disabled = true;

            for (let i = 0; i < nodesToTranslate.length; i += BATCH_SIZE) {
                const batch = nodesToTranslate.slice(i, i + BATCH_SIZE);
                await this.processBatch(batch, targetLangCode);
            }

            if (langSelect && !isDynamicUpdate) langSelect.disabled = false;
            
            localStorage.setItem('campusai_translations', JSON.stringify(this.cache));
        } finally {
            this.isTranslating = false;
            if (this.pendingTranslation) {
                this.pendingTranslation = false;
                // Defer following translation slightly
                setTimeout(() => this.translatePage(this.currentLang, true), 500);
            }
        }
    }

    async processBatch(batch, targetLang) {
        const delimiter = " ||| ";
        const combinedText = batch.map(b => b.textToScan).join(delimiter);

        // Don't send huge requests (2000 chars limit on Sarvam)
        if (combinedText.length > 1800) {
            // Split batch in half and recurse if it's too big
            const half = Math.ceil(batch.length / 2);
            await this.processBatch(batch.slice(0, half), targetLang);
            await this.processBatch(batch.slice(half), targetLang);
            return;
        }

        try {
            // Determine API base URL to support Live Server extension
            const apiBase = window.location.port === '5000' ? '' : 'http://localhost:5000';
            
            const res = await fetch(`${apiBase}/api/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: combinedText,
                    target_language_code: targetLang
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success && data.translated_text) {
                    // Try to split logic
                    const translatedParts = data.translated_text.split(delimiter);
                    
                    batch.forEach((b, index) => {
                        let translated = translatedParts[index];
                        if (translated) {
                            translated = translated.trim();
                            const cacheKey = `${targetLang}_${b.textToScan}`;
                            this.cache[cacheKey] = translated;
                            if (b.node.parentNode) {
                                b.node.nodeValue = b.originalTextFull.replace(b.textToScan, translated);
                            }
                        }
                    });
                }
            } else {
                console.warn('Translation batch failed', await res.text());
            }
        } catch (err) {
            console.error('Batch translation error', err);
        }
        
        // Small delay to prevent rate limit
        await new Promise(r => setTimeout(r, 200));
    }
}

// Initialize
window.translationEngine = new TranslationEngine();
