import { WIRING_TOOLS, runWiringTool, isWiringTool, WIRING_SYSTEM_HINT } from './wiring.js'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

async function callClaude(body) {
  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })
  return response.json()
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { messages, system, max_tokens } = req.body

    // Give Claude the wiring tools alongside web search, and tell it (server-side)
    // that the digitized electrical model exists so it prefers facts over guesses.
    const systemWithWiring = [system, WIRING_SYSTEM_HINT].filter(Boolean).join('\n\n')
    const tools = [
      { type: 'web_search_20250305', name: 'web_search' },
      ...WIRING_TOOLS,
    ]

    const convo = [...messages]
    let data

    // Tool-use loop: run our custom tools, feed results back, repeat until Claude
    // finishes (web_search is executed by Anthropic and doesn't pause us here).
    for (let turn = 0; turn < 6; turn++) {
      data = await callClaude({
        model: 'claude-sonnet-4-5',
        max_tokens: max_tokens || 1024,
        system: systemWithWiring,
        messages: convo,
        tools,
      })

      if (data.stop_reason !== 'tool_use') break

      const toolUses = (data.content || []).filter(b => b.type === 'tool_use' && isWiringTool(b.name))
      if (toolUses.length === 0) break // a tool_use we don't own (server tool) — let it stand

      convo.push({ role: 'assistant', content: data.content })
      convo.push({
        role: 'user',
        content: toolUses.map(tu => ({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: JSON.stringify(runWiringTool(tu.name, tu.input)),
        })),
      })
    }

    const reply = data && data.content
      ? data.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
      : 'Sorry, try again.'
    return res.status(200).json({ content: [{ type: 'text', text: reply }] })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
