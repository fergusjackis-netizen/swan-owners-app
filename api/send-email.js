export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { type, to, toName, fromBoat, fromName, message, marina } = req.body

  if (!to || !type) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured' })
  }

  let subject = ''
  let html = ''

  if (type === 'contact') {
    subject = 'A fellow Swan Owner would like to connect'
    html = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #0a0f1e; color: #e8e4d8; padding: 2rem;">
        <div style="border-bottom: 1px solid #1e3a5f; padding-bottom: 1rem; margin-bottom: 1.5rem;">
          <h1 style="color: #c9a84c; font-size: 1.5rem; margin: 0;">Swan Owners</h1>
        </div>
        <p style="color: #6b8cae; font-size: 0.85rem; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 0.5rem;">New connection request</p>
        <h2 style="color: #e8e4d8; margin-bottom: 1rem;">Hello ${toName || 'there'},</h2>
        <p style="color: #8aa4be; line-height: 1.7;">
          A fellow Swan Owner has spotted you on <strong style="color: #e8e4d8;">swan-owners.com</strong> and would like to connect.
        </p>
        <div style="background: #0d1629; border: 1px solid #1e3a5f; border-left: 3px solid #c9a84c; padding: 1rem 1.25rem; margin: 1.5rem 0;">
          <p style="color: #c9a84c; font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 0.5rem;">From</p>
          <p style="color: #e8e4d8; font-size: 1rem; margin: 0 0 0.25rem;"><strong>${fromBoat || 'A Swan'}</strong></p>
          <p style="color: #6b8cae; font-size: 0.85rem; margin: 0;">${fromName || ''}${marina ? ' - currently in ' + marina : ''}</p>
          ${message ? '<p style="color: #8aa4be; margin: 0.75rem 0 0; font-style: italic;">"' + message + '"</p>' : ''}
        </div>
        <p style="color: #8aa4be; line-height: 1.7;">
          Reply to this email to connect with them. Your email address will only be shared when you reply.
        </p>
        <div style="border-top: 1px solid #1e3a5f; margin-top: 2rem; padding-top: 1rem;">
          <p style="color: #3d5a78; font-size: 0.75rem;">
            This message was sent via Swan Owners Community. 
            <a href="https://swan-owners.com" style="color: #6b8cae;">swan-owners.com</a>
          </p>
        </div>
      </div>
    `
  } else if (type === 'approval') {
    subject = 'Your Swan Owners membership has been approved'
    html = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #0a0f1e; color: #e8e4d8; padding: 2rem;">
        <div style="border-bottom: 1px solid #1e3a5f; padding-bottom: 1rem; margin-bottom: 1.5rem;">
          <h1 style="color: #c9a84c; font-size: 1.5rem; margin: 0;">Swan Owners</h1>
        </div>
        <h2 style="color: #e8e4d8; margin-bottom: 1rem;">Welcome aboard, ${toName || 'there'}!</h2>
        <p style="color: #8aa4be; line-height: 1.7;">
          Your membership application to Swan Owners Community has been approved. You now have full access to the fleet, issues board, live map, and forum.
        </p>
        <div style="margin: 1.5rem 0;">
          <a href="https://swan-owners.com" style="background: #c9a84c; color: #0a0f1e; padding: 0.85rem 2rem; text-decoration: none; font-weight: 700; font-size: 0.85rem; letter-spacing: 0.1em; text-transform: uppercase; display: inline-block;">
            Visit Swan Owners
          </a>
        </div>
        <p style="color: #8aa4be; line-height: 1.7;">
          Start by registering your yacht in the <a href="https://swan-owners.com/my-yacht" style="color: #c9a84c;">My Yacht</a> section so other members can find you.
        </p>
        <div style="border-top: 1px solid #1e3a5f; margin-top: 2rem; padding-top: 1rem;">
          <p style="color: #3d5a78; font-size: 0.75rem;">Swan Owners Community - <a href="https://swan-owners.com" style="color: #6b8cae;">swan-owners.com</a></p>
        </div>
      </div>
    `
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Swan Owners <hello@swan-owners.com>',
        to: [to],
        subject,
        html,
        reply_to: type === 'contact' ? 'hello@swan-owners.com' : undefined,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Resend error:', error)
      return res.status(500).json({ error: 'Failed to send email' })
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('Email error:', err)
    return res.status(500).json({ error: 'Failed to send email' })
  }
}
