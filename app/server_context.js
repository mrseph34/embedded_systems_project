const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');

const LM_STUDIO_URL = 'http://172.20.245.166:1008/v1/chat/completions';
const app = express();
app.use(express.json());

// Serve the HTML file for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index_context.html'));
});

// Function to convert an image to Base64
const getBase64Img = (imagePath) => {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
};

// Initialize the message history array
let messageHistory = [];

// Handle form submission
app.post('/chat', async (req, res) => {
    const { message, context, image } = req.body;
    console.log(req.body);

    // Prepare the messages array
    let messages = [
        {
            role: "user",
            content: [
                { type: "text", text: message } // Original user message
            ]
        }
    ];

    // Check if context is provided and format it
    if (context) {
        // Split by commas to handle multiple key-value pairs
        const contextPairs = context.split(',').map(pair => pair.trim());
        const contextMessage = contextPairs.map(pair => {
            const contextParts = pair.split(':').map(part => part.trim());
            if (contextParts.length === 2) {
                return `${contextParts[0]}: ${contextParts[1]}`; // Format as "key: value"
            }
            return '';
        }).join(', ');

        // Add context to the assistant role
        messages.push({
            role: "assistant",
            content: [
                { type: "text", text: "This is the CONTEXT for this situation--> " + contextMessage } // Combine all context into a single message
            ]
        });
    }

    // If an imageInput is provided, convert it to Base64 and add it to the context
    if (image) {
        try {
            const base64Image = getBase64Img('assets/' + image);
            messages[0].content.push({
                 type: "image_url",
                 image_url: {
                     url: `data:image/png;base64,${base64Image}`
                 }
            });
        } catch (error) {
            console.error("Error reading the image:", error.message);
            return res.status(500).send("Error reading the image.");
        }
    }

    // Include the message history in the system role
    messages.unshift({
        role: "system",
        content: messageHistory.map(msg => ({ type: "text", text: "This is the history for this conversation (use it as such): " + msg })) // Map history to content
    });

    // Add the current message to history
    messageHistory.push(message);

    try {
        const responseStream = await axios.post(LM_STUDIO_URL, {
            model: "xtuner/llava-phi-3-mini-gguf",
            messages,
            temperature: 0,
            max_tokens: 1000,
            stream: true
        }, { responseType: 'stream' });

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