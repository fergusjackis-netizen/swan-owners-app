import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import PendingApproval from './pages/PendingApproval'
import Fleet from './pages/Fleet'
import YachtProfile from './pages/YachtProfile'
import MyYacht from './pages/MyYacht'
import Issues from './pages/Issues'
import IssueDetail from './pages/IssueDetail'
import Forum from './pages/Forum'
import ForumTopic from './pages/ForumTopic'
import Map from './pages/Map'
import Contacts from './pages/Contacts'
import Messages from './pages/Messages'
import Admin from './pages/Admin'
import MaintenanceLogs from './pages/MaintenanceLogs'
import Models from './pages/Models'

// Route guard — must be logged in
function PrivateRoute({ children }) {
  const { user, userProfile, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!user) return <Navigate to="/login" />
  if (userProfile?.status === 'pending') return <Navigate to="/pending" />
  return children
}

// Route guard — must be admin
function AdminRoute({ children }) {
  const { userProfile, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (userProfile?.role !== 'admin') return <Navigate to="/" />
  return children
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="pending" element={<PendingApproval />} />
          <Route path="fleet" element={<Fleet />} />
          <Route path="fleet/:yachtId" element={<YachtProfile />} />
          <Route path="issues" element={<Issues />} />
          <Route path="issues/:issueId" element={<IssueDetail />} />
          <Route path="models" element={<Models />} />

          {/* Private routes */}
          <Route path="my-yacht" element={<PrivateRoute><MyYacht /></PrivateRoute>} />
          <Route path="map" element={<PrivateRoute><Map /></PrivateRoute>} />
          <Route path="forum" element={<PrivateRoute><Forum /></PrivateRoute>} />
          <Route path="forum/:topicId" element={<PrivateRoute><ForumTopic /></PrivateRoute>} />
          <Route path="contacts" element={<PrivateRoute><Contacts /></PrivateRoute>} />
          <Route path="messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
          <Route path="messages/:threadId" element={<PrivateRoute><Messages /></PrivateRoute>} />

          {/* Admin */}
          <Route path="admin" element={<AdminRoute><Admin /></AdminRoute>} />
        </Route>
      </Routes>
    </Router>
  )
}
