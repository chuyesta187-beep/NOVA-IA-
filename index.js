require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '30kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        error: 'La API de Groq no está configurada.'
      });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Escribe un mensaje para comenzar.'
      });
    }

    if (
      messages.length > 20 ||
      messages.some(
        m =>
          !m ||
          !['user', 'assistant'].includes(m.role) ||
          typeof m.content !== 'string' ||
          m.content.length > 4000
      )
    ) {
      return res.status(400).json({
        error: 'La conversación es demasiado larga o no es válida.'
      });
    }

    if (messages[messages.length - 1].role !== 'user') {
      return res.status(400).json({
        error: 'El último mensaje debe ser tu pregunta.'
      });
    }

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'Eres NOVA AI, un asistente inteligente que responde en español. Ayudas con preguntas, tareas, programación y tecnología. Explica de forma clara y útil.'
            },
            ...messages
          ],
          temperature: 0.7,
          max_tokens: 1500
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Error de Groq:', data.error?.message || response.status);

      return res.status(502).json({
        error: 'No se pudo obtener una respuesta de la IA. Intenta de nuevo.'
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(502).json({
        error: 'La IA no devolvió una respuesta.'
      });
    }

    res.json({ reply });
  } catch (error) {
    console.error('Error del servidor:', error.message);

    res.status(500).json({
      error: 'Ocurrió un error interno. Intenta de nuevo.'
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`NOVA AI funcionando en el puerto ${PORT}`);
});
