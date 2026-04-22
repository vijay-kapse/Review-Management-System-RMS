const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, 'build')));

// Proxy API requests to your Django backend
app.use('/api', createProxyMiddleware({
    target: process.env.BACKEND_URL || 'http://localhost:8100',
    changeOrigin: true,
    pathRewrite: {
        '^/api': '/api'  // Maintain /api prefix
    }
}));

// For any other routes, serve the index.html
// This is crucial for React Router to work with direct URL access
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
