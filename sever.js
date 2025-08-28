import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// security & rate limit
app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60 * 1000, max: 60 }));

const API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 3000;
const MODEL = 'gemini-2.0-flash';

function buildContents(history = [], userMessage = '') {
  const mapped = history
    .filter(h => h && h.role && h.content)
    .map(h => ({
      role: h.role,
      parts: [{ text: h.content }]
    }));
  if (userMessage) {
    mapped.push({ role: 'user', parts: [{ text: userMessage }] });
  }
  return mapped;
}

app.post('/api/chat', async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY in .env' });
    }
    const { message, history = [] } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Missing "message" (string).' });
    }
    
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    
    const payload = {
      systemInstruction: {
        role: 'system',
        parts: [{ text: 'You are a helpful chatbot assistant.' }]
      },
      contents: buildContents(history, message),
      generationConfig: { temperature: 0.7, topP: 0.95, maxOutputTokens: 512 }
    };
    
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: 'Upstream error', details: data });
    }
    
    const text =
      data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') ||
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      '';
    
    return res.json({ reply: text, raw: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error', details: String(err) });
  }
});

// serve frontend
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});