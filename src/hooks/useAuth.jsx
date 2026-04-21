import { useState, useEffect, createContext, useContext } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (snap.exists()) {
            const data = snap.data()
            console.log('Profile loaded:', data.role, data.status)
            setUserProfile({ id: snap.id, ...data })
          } else {
            console.log('No profile found for', firebaseUser.uid)
            setUserProfile(null)
          }
        } catch (e) {
          console.error('Profile load error:', e.message)
          setUserProfile(null)
        }
      } else {
        setUser(null)
        setUserProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  async function registerWithEmail(email, password, profileData) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const profile = {
      uid: cred.user.uid,
      email,
      name: profileData.name,
      nationality: profileData.nationality || '',
      role: profileData.role || 'owner',
      status: 'pending',
      createdAt: serverTimestamp(),
    }
    await setDoc(doc(db, 'users', cred.user.uid), profile)
    return profile
  }

  async function loginWithEmail(email, password) {
    return signInWithEmailAndPassword(auth, email, password)
  }

  async function logout() {
    await signOut(auth)
    setUser(null)
    setUserProfile(null)
  }

  const isAdmin = userProfile?.role === 'admin'
  const isApproved = userProfile?.status === 'approved'

  return (
    <AuthContext.Provider value={{
      user, userProfile, loading, isAdmin, isApproved,
      registerWithEmail, loginWithEmail, logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}