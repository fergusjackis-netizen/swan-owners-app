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
    const bytes = new Uint8Array(buffer)
    const raw = new TextDecoder('latin1').decode(bytes)

    // Extract text from PDF string objects
    const texts = new Set()
    const matches = raw.match(/\(([^\)\\]{2,200})\)/g) || []
    matches.forEach(m => {
      const t = m.slice(1,-1).trim()
      if (t.length > 3 && /[a-zA-Z]{2,}/.test(t)) texts.add(t)
    })
    const ascii = raw.match(/[\x20-\x7E]{8,}/g) || []
    ascii.forEach(t => { if (/[a-zA-Z]{4,}/.test(t)) texts.add(t.trim()) })

    const extracted = [...texts].filter(t => t.length > 4).join(' ')

    if (extracted.length < 200) {
      return res.status(200).json({ success: true, extracted: false, reason: 'Image-based PDF', chars: extracted.length })
    }

    // Store in Firestore using REST API with service account
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT
    if (!serviceAccountStr) {
      return res.status(200).json({ success: true, extracted: true, chars: extracted.length, warning: 'No service account configured' })
    }

    const serviceAccount = JSON.parse(serviceAccountStr)
    const projectId = serviceAccount.project_id

    // Get access token using service account JWT
    const now = Math.floor(Date.now() / 1000)
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify({
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    }))

    // Use Firebase REST API to store - import jose for JWT signing
    const { SignJWT, importPKCS8 } = await import('jose')
    const privateKey = await importPKCS8(serviceAccount.private_key, 'RS256')
    const jwt = await new SignJWT({ 
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token'
    }).setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey)

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    })
    const { access_token } = await tokenRes.json()

    // Chunk and store in Firestore
    const chunkSize = 800000
    const chunks = []
    for (let i = 0; i < extracted.length; i += chunkSize) chunks.push(extracted.slice(i, i + chunkSize))

    const safeDocId = (docId || filename || 'doc').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)

    for (let i = 0; i < chunks.length; i++) {
      const path = `projects/${projectId}/databases/(default)/documents/yachts/${yachtId}/knowledge/${safeDocId}_${i}`
      await fetch(`https://firestore.googleapis.com/v1/${path}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            docId: { stringValue: safeDocId },
            filename: { stringValue: filename || docId },
            category: { stringValue: category || 'General' },
            chunk: { integerValue: i },
            totalChunks: { integerValue: chunks.length },
            content: { stringValue: chunks[i] },
            extractedAt: { stringValue: new Date().toISOString() }
          }
        })
      })
    }

    return res.status(200).json({ success: true, extracted: true, chars: extracted.length, chunks: chunks.length })
  } catch(e) {
    return res.status(500).json({ error: e.message })
  }
}
