// server.js

// Import các thư viện cần thiết
const express = require('express');
const fetch = require('node-fetch'); // Sử dụng node-fetch để gọi API
const path = require('path');
require('dotenv').config(); // Để đọc biến môi trường từ file .env (nếu có, hữu ích khi chạy local)

// Khởi tạo ứng dụng Express
const app = express();
const PORT = process.env.PORT || 3000; // Render sẽ tự cung cấp PORT

// Middleware để xử lý JSON và phục vụ các tệp tĩnh
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Phục vụ các tệp trong cùng thư mục

// Route chính để phục vụ file index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route API proxy để gọi đến Stability AI một cách an toàn
app.post('/api/generate-image', async (req, res) => {
    // Lấy prompt từ body của request gửi từ frontend
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    // Lấy API key từ biến môi trường trên server Render
    const apiKey = process.env.STABILITY_API_KEY;

    if (!apiKey) {
        console.error('Stability API key not found in environment variables.');
        return res.status(500).json({ error: 'API key is not configured on the server.' });
    }

    const engineId = 'stable-diffusion-xl-1024-v1-0';
    const apiHost = 'https://api.stability.ai';

    try {
		// ĐOẠN MÃ MỚI ĐỂ THAY THẾ
		try {
			const response = await fetch(`${apiHost}/v1/generation/${engineId}/text-to-image`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					text_prompts: [{ text: prompt }],
					cfg_scale: 7,
					height: 1024,
					width: 1024,
					steps: 30,
					samples: 1,
				}),
			});

			// --- BẮT ĐẦU PHẦN THAY ĐỔI ---

			if (!response.ok) {
				// Cố gắng đọc và phân tích chi tiết lỗi từ API
				const errorText = await response.text();
				let errorDetails;
				try {
					errorDetails = JSON.parse(errorText);
				} catch (e) {
					errorDetails = errorText;
				}

				// Tạo lỗi tùy chỉnh và đính kèm chi tiết vào
				const error = new Error('Non-200 response from Stability AI');
				error.apiResponse = errorDetails;
				throw error;
			}

			const responseJSON = await response.json();
			res.json(responseJSON);

			catch (error) {
				// Xây dựng đối tượng log có cấu trúc
				const logData = {
					level: "error",
					message: "Error calling Stability API",
					details: error.apiResponse || error.message
				};

				// Ghi log dưới dạng chuỗi JSON
				console.error(JSON.stringify(logData));

				// --- BẮT ĐẦU PHẦN SỬA LỖI ---
				
				// Chỉ gửi phản hồi lỗi nếu chưa có bất kỳ phản hồi nào được gửi đi trước đó
				if (!res.headersSent) {
					res.status(500).json({
						error: 'Failed to generate image.',
						details: error.apiResponse || error.message
					});
				}
				// --- KẾT THÚC PHẦN SỬA LỖI ---
			}

        const responseJSON = await response.json();
        // Gửi kết quả (dữ liệu ảnh base64) về lại cho frontend
        res.json(responseJSON);

    } catch (error) {
        console.error('Error calling Stability API:', error.message);
        res.status(500).json({ error: 'Failed to generate image.', details: error.message });
    }
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
