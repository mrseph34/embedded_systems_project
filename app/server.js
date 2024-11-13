const express = require('express');
const axios = require('axios');
const path = require('path');
const { PassThrough } = require('stream');
const app = express();

const LM_STUDIO_URL = 'http://172.20.245.166:1008/v1/chat/completions';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle form submission with streaming response
app.post('/chat', async (req, res) => {
    const userInput = req.body.message;

    try {
        const responseStream = await axios.post(LM_STUDIO_URL, {
            model: "xtuner/llava-phi-3-mini-gguf",
            messages: [
                { role: "system", content: "Answer nicely please." },
                { role: "user", content: userInput },
                { role: "user", content: `Image path: ${'assets/image.png'}` }
            ],
            temperature: 0.7,
            max_tokens: -1,
            stream: true // Set to true for streaming
        }, {
            responseType: 'stream'
        });

        const passThrough = new PassThrough();
        responseStream.data.pipe(passThrough);

        passThrough.on('data', (chunk) => {
            // Send the chunk of data directly to the client
            const chunkStr = chunk.toString();
            const lines = chunkStr.split('\n').filter(line => line.trim());
            for (const line of lines) {
                if (line.startsWith('data: ') && line != 'data: [DONE]') {
                    const jsonData = JSON.parse(line.substring(6));
                    if (jsonData.choices && jsonData.choices[0].delta.content) {
                        res.write(jsonData.choices[0].delta.content); // Append to the final response
                    }
                }
            }
        });

        passThrough.on('end', () => {
            res.end(); // End the response when streaming is done
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