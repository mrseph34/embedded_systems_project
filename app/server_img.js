const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs'); // Required for reading files
const { PassThrough } = require('stream');
const app = express();

const LM_STUDIO_URL = 'http://172.20.245.166:1008/v1/chat/completions';
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Function to convert an image to Base64
const getBase64Img = (imagePath) => {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
};

// Handle form submission
app.post('/chat', async (req, res) => {
    const userInput = req.body.message;
    
    // Path to your image
    const imagePath = path.join(__dirname, 'assets', 'image.jpeg');

    try {
        const base64Image = getBase64Img(imagePath); // Encode the image in Base64

        const responseStream = await axios.post(LM_STUDIO_URL, {
            model: "xtuner/llava-phi-3-mini-gguf",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: userInput },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/png;base64,${base64Image}` // Use Base64 image data
                            },
                        },
                    ],
                },
            ],
            temperature: 0,
            max_tokens: 1000,
            stream: true // Enable streaming
        }, {
            responseType: 'stream'
        });

        const passThrough = new PassThrough();
        responseStream.data.pipe(passThrough);

        passThrough.on('data', (chunk) => {
            const chunkStr = chunk.toString();
            const lines = chunkStr.split('\n').filter(line => line.trim());
            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    const jsonData = JSON.parse(line.substring(6));
                    if (jsonData.choices && jsonData.choices[0].delta.content) {
                        res.write(jsonData.choices[0].delta.content);
                    }
                }
            }
        });

        passThrough.on('end', () => {
            res.end();
        });

    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
        res.status(500).send("Error communicating with LM Studio");
    }
});

// Start the server
app.listen(5000, () => {
    console.log('Server running on port 5000');
});