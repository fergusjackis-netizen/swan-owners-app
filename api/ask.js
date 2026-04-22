export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { messages, system, max_tokens, documents } = req.body

    // Build messages with PDF documents injected into first user message
    let apiMessages = [...messages]
    if (documents && documents.length > 0) {
      // Add documents to the first user message as document content blocks
      const lastUserIdx = apiMessages.map(m => m.role).lastIndexOf('user')
      if (lastUserIdx >= 0) {
        const userMsg = apiMessages[lastUserIdx]
        const docBlocks = documents.map(doc => ({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: doc.base64,
          },
          title: doc.name,
          context: doc.category,
        }))
        const textContent = typeof userMsg.content === 'string'
          ? [{ type: 'text', text: userMsg.content }]
          : userMsg.content
        apiMessages[lastUserIdx] = {
          ...userMsg,
          content: [...docBlocks, ...textContent]
        }
      }
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: max_tokens || 2048,
        system,
        messages: apiMessages,
      })
    })
    const data = await response.json()
    const reply = data.content
      ? data.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
      : 'Sorry, try again.'
    return res.status(200).json({ content: [{ type: 'text', text: reply }] })
  } catch(e) {
    return res.status(500).json({ error: e.message })
  }
}
