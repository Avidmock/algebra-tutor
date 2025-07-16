// api/math-tutor.js
export default async function handler(req, res) {
  // Enable CORS for frontend requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, subject = 'algebra' } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'No question provided' });
  }

  // Check if API key exists
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    const systemPrompt = getSystemPrompt(subject);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const answer = data.choices[0].message.content;
    return res.status(200).json({ answer, subject });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

function getSystemPrompt(subject) {
  const prompts = {
    algebra: `You are an expert algebra tutor. Use the Socratic method to guide students to discover answers themselves. Ask leading questions, provide hints, and break down complex problems into smaller steps. Focus only on algebraic concepts like linear equations, quadratic equations, polynomials, and systems of equations. If asked about other math topics, politely redirect to algebra.`,
    
    geometry: `You are an expert geometry tutor. Use the Socratic method to guide students through geometric concepts. Focus on shapes, angles, proofs, area, volume, and spatial reasoning. Ask questions that help students visualize and understand geometric relationships. Stay within geometry topics only.`,
    
    'advanced-math': `You are an expert tutor for advanced mathematics including calculus, trigonometry, and pre-calculus. Use the Socratic method to guide students through complex mathematical concepts. Break down problems step by step and help students understand the underlying principles. Focus only on advanced math topics.`,
    
    'data-analysis': `You are an expert statistics and data analysis tutor. Help students understand statistical concepts, probability, data interpretation, and basic statistical analysis. Use the Socratic method and real-world examples to make concepts clear. Focus only on statistics and data analysis topics.`
  };

  return prompts[subject] || prompts.algebra;
}
