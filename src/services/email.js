export async function sendContactEmail({ to, toName, fromBoat, fromName, message, marina }) {
  const res = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'contact', to, toName, fromBoat, fromName, message, marina }),
  })
  if (!res.ok) throw new Error('Failed to send email')
  return res.json()
}

export async function sendApprovalEmail({ to, toName }) {
  const res = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'approval', to, toName }),
  })
  if (!res.ok) throw new Error('Failed to send email')
  return res.json()
}
