import { WIRING_TOOLS, runWiringTool, isWiringTool, WIRING_SYSTEM_HINT } from './wiring.js'
import { FORUM_TOOLS, runForumTool, isForumTool, FORUM_SYSTEM_HINT, forumEnabled } from './forum.js'

// Run one of our custom tools (wiring = sync, forum = async). Returns the result
// object, or null if the tool isn't one of ours (e.g. a server tool like web_search).
async function runLocalTool(name, input) {
  if (isWiringTool(name)) return runWiringTool(name, input)
  if (isForumTool(name)) return await runForumTool(name, input)
  return null
}
const isLocalTool = name => isWiringTool(name) || isForumTool(name)

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

    // Give Claude the wiring tools alongside web search (and the forum search tool
    // when configured), and tell it server-side these exist so it prefers facts
    // and real owner threads over guessing.
    const useForum = forumEnabled()
    const systemWithTools = [system, WIRING_SYSTEM_HINT, useForum ? FORUM_SYSTEM_HINT : null]
      .filter(Boolean).join('\n\n')
    const tools = [
      { type: 'web_search_20250305', name: 'web_search' },
      ...WIRING_TOOLS,
      ...(useForum ? FORUM_TOOLS : []),
    ]

    const convo = [...messages]
    let data

    // Tool-use loop: run our custom tools, feed results back, repeat until Claude
    // finishes (web_search is executed by Anthropic and doesn't pause us here).
    for (let turn = 0; turn < 6; turn++) {
      data = await callClaude({
        model: 'claude-sonnet-4-5',
        max_tokens: max_tokens || 1024,
        system: systemWithTools,
        messages: convo,
        tools,
      })

      if (data.stop_reason !== 'tool_use') break

      const toolUses = (data.content || []).filter(b => b.type === 'tool_use' && isLocalTool(b.name))
      if (toolUses.length === 0) break // a tool_use we don't own (server tool) — let it stand

      const results = await Promise.all(toolUses.map(tu => runLocalTool(tu.name, tu.input)))
      convo.push({ role: 'assistant', content: data.content })
      convo.push({
        role: 'user',
        content: toolUses.map((tu, i) => ({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: JSON.stringify(results[i]),
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
