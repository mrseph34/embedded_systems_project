const express = require('express');
const OpenAI = require('openai');
const path = require('path');
const app = express();

// API KEY: org-XMrN1YE1GvfPDlq4wDeVrUoT  |  proj_tMubI1ashPdjp7IGzyqZWYnJ  |  sk-svcacct-EC5pVSrloHHQLJNHVFzm_wxgKi5Y0WinAkEOr5ohw-8TcL6UqGAMaAG2is9w2eA1vT3BlbkFJm0j0AFMiN5c3aQHOcTZcbPIocflqZEbhWacxYUNahEMEvCTAn8o8SUY7h0JE6IKFAA
const API_KEY = "sk-f-lAjXo4J8o7CiLYhHPAKFa3GwHIhVjOOA5cxUPj6ET3BlbkFJSLJK-_AHk0AxNEsg9bz7zqtJmThXn0qV_PK-wMCsQA"

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up OpenAI API
const openai = new OpenAI({ apiKey: API_KEY });

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle form submission
app.post('/chat', async (req, res) => {
    const userInput = req.body.message;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Specify the model you want to use
            messages: [{ role: "user", content: userInput }],
        });

        // Extract the response from OpenAI
        const reply = response.choices[0].message.content;
        res.send(`AI Response: ${reply}`);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Error communicating with OpenAI API");
    }
});

// Start the server
app.listen(5000, () => {
    console.log('Server running on port 5000');
});