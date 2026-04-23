import { SignJWT, importPKCS8 } from 'jose'

export const config = { maxDuration: 60 }

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
    if (!pdfResponse.ok) return res.status(400).json({ error: 'Could not fetch PDF: ' + pdfResponse.status })
    const buffer = await pdfResponse.arrayBuffer()

    // Use pdf-parse for proper text extraction
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default
    let extracted = ''
    try {
      const data = await pdfParse(Buffer.from(buffer))
      extracted = data.text || ''
    } catch(parseErr) {
      console.log('pdf-parse failed:', parseErr.message)
      return res.status(200).json({ success: true, extracted: false, reason: 'Parse error: ' + parseErr.message })
    }

    // Clean the text
    extracted = extracted
      .replace(/\x00/g, ' ')
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .replace(/\s{3,}/g, '  ')
      .trim()

    if (extracted.length < 200) {
      return res.status(200).json({ 
        success: true, extracted: false, 
        reason: 'Image-based PDF or insufficient text',
        chars: extracted.length
      })
    }

    // Store in Firestore via REST API
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT
    if (!serviceAccountStr) {
      return res.status(200).json({ success: true, extracted: true, chars: extracted.length, warning: 'No service account' })
    }

    const serviceAccount = JSON.parse(serviceAccountStr)
    const projectId = serviceAccount.project_id

    // Get access token
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
    if (!access_token) return res.status(500).json({ error: 'Could not get access token' })

    // Chunk and store
    const chunkSize = 800000
    const chunks = []
    for (let i = 0; i < extracted.length; i += chunkSize) chunks.push(extracted.slice(i, i + chunkSize))

    const safeDocId = (docId || filename || 'doc').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)

    for (let i = 0; i < chunks.length; i++) {
      const path = `projects/${projectId}/databases/(default)/documents/yachts/${yachtId}/knowledge/${safeDocId}_${i}`
      const storeRes = await fetch(`https://firestore.googleapis.com/v1/${path}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            docId: { stringValue: safeDocId },
            filename: { stringValue: filename || docId || 'unknown' },
            category: { stringValue: category || 'General' },
            chunk: { integerValue: i },
            totalChunks: { integerValue: chunks.length },
            content: { stringValue: chunks[i] },
            extractedAt: { stringValue: new Date().toISOString() }
          }
        })
      })
      if (!storeRes.ok) {
        const err = await storeRes.text()
        console.error('Firestore error:', err)
      }
    }

    return res.status(200).json({ 
      success: true, extracted: true,
      chars: extracted.length, chunks: chunks.length,
      filename
    })
  } catch(e) {
    console.error('Extract error:', e)
    return res.status(500).json({ error: e.message })
  }
}
