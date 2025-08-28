class MediaUploader {
    constructor() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadProgress = document.getElementById('uploadProgress');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.resultsSection = document.getElementById('resultsSection');
        this.resultsList = document.getElementById('resultsList');
        this.recentUploads = document.getElementById('recentUploads');
        this.recentList = document.getElementById('recentList');

        this.initializeEventListeners();
        this.loadRecentUploads();
    }

    initializeEventListeners() {
        // File input change
        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // Drag and drop
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });

        this.uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
        });

        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });

        // Click to browse
        this.uploadArea.addEventListener('click', () => {
            this.fileInput.click();
        });
    }

    async handleFiles(files) {
        if (files.length === 0) return;

        this.showProgress();
        this.resultsList.innerHTML = '';
        
        const results = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            try {
                this.updateProgress((i / files.length) * 100, `Uploading ${file.name}...`);
                const result = await this.uploadFile(file);
                results.push(result);
                this.saveToRecentUploads(result);
            } catch (error) {
                console.error('Upload failed:', error);
                results.push({
                    error: true,
                    filename: file.name,
                    message: error.message || 'Upload failed'
                });
            }
        }

        this.updateProgress(100, 'Upload complete!');
        setTimeout(() => {
            this.hideProgress();
            this.displayResults(results);
            this.loadRecentUploads();
        }, 1000);
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    showProgress() {
        this.uploadProgress.style.display = 'block';
        this.progressFill.style.width = '0%';
    }

    updateProgress(percent, text) {
        this.progressFill.style.width = `${percent}%`;
        this.progressText.textContent = text;
    }

    hideProgress() {
        this.uploadProgress.style.display = 'none';
    }

    displayResults(results) {
        this.resultsSection.style.display = 'block';
        
        results.forEach(result => {
            const resultElement = this.createResultElement(result);
            this.resultsList.appendChild(resultElement);
        });

        // Scroll to results
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    createResultElement(result) {
        const div = document.createElement('div');
        div.className = 'file-result';

        if (result.error) {
            div.innerHTML = `
                <div class="error">
                    <h4>❌ Upload Failed: ${result.filename}</h4>
                    <p>${result.message}</p>
                </div>
            `;
            return div;
        }

        const fileType = this.getFileType(result.mimetype);
        const fileSize = this.formatFileSize(result.size);

        div.innerHTML = `
            <div class="file-info">
                <div class="file-details">
                    <h4>📄 ${result.originalName}</h4>
                    <p>Size: ${fileSize} • Type: ${result.mimetype}</p>
                </div>
                <span class="file-type">${fileType}</span>
            </div>
            <div class="url-section">
                <div class="url-input">
                    <input type="text" class="url-field" value="${result.url}" readonly>
                    <button class="copy-btn" onclick="mediaUploader.copyToClipboard(this, '${result.url}')">
                        📋 Copy
                    </button>
                    <button class="open-btn" onclick="window.open('${result.url}', '_blank')">
                        🔗 Open
                    </button>
                </div>
            </div>
        `;

        return div;
    }

    createRecentItem(item) {
        const div = document.createElement('div');
        div.className = 'recent-item';

        const fileType = this.getFileType(item.mimetype);
        const fileSize = this.formatFileSize(item.size);
        const uploadDate = new Date(item.uploadDate).toLocaleDateString();

        div.innerHTML = `
            <div class="file-info">
                <div class="file-details">
                    <h4>📄 ${item.originalName}</h4>
                    <p>Uploaded: ${uploadDate} • Size: ${fileSize}</p>
                </div>
                <span class="file-type">${fileType}</span>
            </div>
            <div class="url-section">
                <div class="url-input">
                    <input type="text" class="url-field" value="${item.url}" readonly>
                    <button class="copy-btn" onclick="mediaUploader.copyToClipboard(this, '${item.url}')">
                        📋 Copy
                    </button>
                    <button class="open-btn" onclick="window.open('${item.url}', '_blank')">
                        🔗 Open
                    </button>
                </div>
            </div>
        `;

        return div;
    }

    async copyToClipboard(button, text) {
        try {
            await navigator.clipboard.writeText(text);
            const originalText = button.textContent;
            button.textContent = '✅ Copied!';
            button.classList.add('copied');
            
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('copied');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            button.textContent = '✅ Copied!';
            setTimeout(() => {
                button.textContent = '📋 Copy';
            }, 2000);
        }
    }

    getFileType(mimetype) {
        if (mimetype.startsWith('image/')) return 'Image';
        if (mimetype.startsWith('video/')) return 'Video';
        if (mimetype.startsWith('audio/')) return 'Audio';
        if (mimetype.includes('pdf')) return 'PDF';
        if (mimetype.includes('text/')) return 'Text';
        if (mimetype.includes('application/zip') || mimetype.includes('application/x-rar')) return 'Archive';
        return 'File';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    saveToRecentUploads(result) {
        let recent = JSON.parse(localStorage.getItem('recentUploads') || '[]');
        
        // Add new upload to beginning
        recent.unshift({
            ...result,
            uploadDate: new Date().toISOString()
        });
        
        // Keep only last 10 uploads
        recent = recent.slice(0, 10);
        
        localStorage.setItem('recentUploads', JSON.stringify(recent));
    }

    loadRecentUploads() {
        const recent = JSON.parse(localStorage.getItem('recentUploads') || '[]');
        
        if (recent.length > 0) {
            this.recentUploads.style.display = 'block';
            this.recentList.innerHTML = '';
            
            recent.forEach(item => {
                const recentElement = this.createRecentItem(item);
                this.recentList.appendChild(recentElement);
            });
        }
    }
}

// Initialize the uploader when the page loads
const mediaUploader = new MediaUploader();
