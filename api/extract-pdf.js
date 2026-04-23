export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { yachtId, docId, url, filename, category } = req.body
    if (!yachtId || !url) return res.status(400).json({ error: 'Missing yachtId or url' })

    // Fetch the PDF
    const pdfResponse = await fetch(url)
    if (!pdfResponse.ok) return res.status(400).json({ error: 'Could not fetch PDF' })
    const buffer = await pdfResponse.arrayBuffer()

    // Extract text from PDF binary
    // Look for text streams in the PDF
    const bytes = new Uint8Array(buffer)
    const decoder = new TextDecoder('latin1')
    const raw = decoder.decode(bytes)

    // Extract readable text - find BT/ET text blocks and readable ASCII
    const textBlocks = []
    
    // Method 1: Extract text between BT and ET markers
    const btMatches = raw.matchAll(/BT[\s\S]{0,2000}?ET/g)
    for (const match of btMatches) {
      const block = match[0]
      // Extract strings in parentheses (PDF text)
      const strings = block.match(/\(([^)]{2,100})\)/g) || []
      strings.forEach(s => {
        const text = s.slice(1,-1).replace(/\\n/g,' ').replace(/\\r/g,' ').trim()
        if (text.length > 2 && /[a-zA-Z]/.test(text)) textBlocks.push(text)
      })
    }

    // Method 2: Extract readable ASCII sequences
    const asciiMatches = raw.match(/[\x20-\x7E]{5,}/g) || []
    asciiMatches.forEach(t => {
      if (/[a-zA-Z]{3,}/.test(t) && t.length > 5) textBlocks.push(t.trim())
    })

    const extracted = [...new Set(textBlocks)]
      .filter(t => t.trim().length > 3)
      .filter(t => !/^[\d\s.\-+/]+$/.test(t))
      .join(' ')
      .slice(0, 500000)

    if (extracted.length < 100) {
      return res.status(200).json({ 
        success: true, extracted: false, 
        reason: 'Image-based PDF, no text extracted',
        chars: extracted.length
      })
    }

    // Store in Firestore via REST API
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'swan-owners'
    const safeDocId = (docId || filename || 'doc').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
    
    // Get Firebase auth token
    const tokenRes = await fetch(
      'https://identitytoolkit.googleapis.com/v1/token?key=' + process.env.VITE_FIREBASE_API_KEY,
      { method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: process.env.FIREBASE_REFRESH_TOKEN||'' }) }
    )

    // Chunk content
    const chunkSize = 800000
    const chunks = []
    for (let i = 0; i < extracted.length; i += chunkSize) {
      chunks.push(extracted.slice(i, i + chunkSize))
    }

    // Store each chunk
    const { initializeApp, getApps, cert } = await import('firebase-admin/app').catch(() => null) || {}
    
    if (!initializeApp) {
      // Fallback: return extracted text for client to store
      return res.status(200).json({ 
        success: true, extracted: true,
        chars: extracted.length, chunks: chunks.length,
        content: extracted.slice(0, 100000),
        storeViaClient: true
      })
    }

    return res.status(200).json({ 
      success: true, extracted: true,
      chars: extracted.length, chunks: chunks.length
    })
  } catch(e) {
    return res.status(500).json({ error: e.message })
  }
}
