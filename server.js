// server.js

// Import các thư viện cần thiết
const express = require('express');
const fetch = require('node-fetch'); // Sử dụng node-fetch để gọi API
const path = require('path');
require('dotenv').config(); // Để đọc biến môi trường từ file .env

// Khởi tạo ứng dụng Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware để xử lý JSON và phục vụ các tệp tĩnh
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Route chính để phục vụ file index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route API proxy để gọi đến Google AI một cách an toàn
app.post('/api/generate-image', async (req, res) => {
    // Lấy prompt từ body của request gửi từ frontend
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    // Lấy API key từ biến môi trường.
    // **LƯU Ý:** Bạn cần tạo API key từ Google AI Studio và đặt tên biến là GOOGLE_API_KEY
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        console.error('Google API key not found in environment variables.');
        return res.status(500).json({ error: 'API key is not configured on the server.' });
    }

    // API endpoint cho mô hình Imagen 3 của Google
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

    try {
        // Cấu trúc payload cho API của Google Imagen
        const payload = {
            instances: [{ prompt: prompt }],
            parameters: {
                sampleCount: 1
            }
        };

        // Gọi đến API của Google từ backend
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            // Nếu có lỗi, ném ra lỗi để khối catch xử lý
            const errorText = await response.text();
            throw new Error(`Non-200 response from Google AI: ${errorText}`);
        }

        const responseJSON = await response.json();
        
        // Kiểm tra xem có dữ liệu ảnh trả về không
        if (responseJSON.predictions && responseJSON.predictions.length > 0 && responseJSON.predictions[0].bytesBase64Encoded) {
            // Trả về một object đơn giản chứa dữ liệu base64
            res.json({ base64: responseJSON.predictions[0].bytesBase64Encoded });
        } else {
            throw new Error('No image data received from Google AI.');
        }

    } catch (error) {
        console.error('Error calling Google AI API:', error.message);
        res.status(500).json({ error: 'Failed to generate image.', details: error.message });
    }
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
