const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueId = crypto.randomBytes(16).toString('hex');
        const extension = path.extname(file.originalname);
        cb(null, uniqueId + extension);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow all file types
        cb(null, true);
    }
});

// Store file metadata
const fileMetadata = new Map();

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileInfo = {
            originalName: req.file.originalname,
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size,
            uploadDate: new Date().toISOString()
        };

        // Store metadata
        fileMetadata.set(req.file.filename, fileInfo);

        // Generate shareable URL
        const fileUrl = `${req.protocol}://${req.get('host')}/file/${req.file.filename}`;

        res.json({
            success: true,
            message: 'File uploaded successfully',
            url: fileUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Serve files endpoint
app.get('/file/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, 'uploads', filename);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Get file metadata
        const metadata = fileMetadata.get(filename);
        
        if (metadata) {
            // Set appropriate headers
            res.setHeader('Content-Type', metadata.mimetype);
            res.setHeader('Content-Disposition', `inline; filename="${metadata.originalName}"`);
        }

        // Send file
        res.sendFile(filePath);

    } catch (error) {
        console.error('File serve error:', error);
        res.status(500).json({ error: 'Failed to serve file' });
    }
});

// Get file info endpoint
app.get('/info/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const metadata = fileMetadata.get(filename);

        if (!metadata) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.json(metadata);

    } catch (error) {
        console.error('Info error:', error);
        res.status(500).json({ error: 'Failed to get file info' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

// Default route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
