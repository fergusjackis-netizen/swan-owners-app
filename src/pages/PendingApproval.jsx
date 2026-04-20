import { useAuth } from '../hooks/useAuth'
import './AuthPages.css'

export default function PendingApproval() {
  const { logout } = useAuth()
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Application received</h1>
          <p>Thank you for applying to join Swan Owners. Your membership is currently pending approval. You will be able to access the full community once an administrator has reviewed your application.</p>
          <p style={{ marginTop: '1rem' }}>This usually takes no more than 24-48 hours. There is nothing further you need to do.</p>
        </div>
        <button className="btn-auth" onClick={logout}>Sign out</button>
      </div>
    </div>
  )
}
