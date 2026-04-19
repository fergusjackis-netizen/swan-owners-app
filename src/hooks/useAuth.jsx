import { useState, useEffect, createContext, useContext } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, signOut, 
  GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        setUserProfile(snap.exists() ? snap.data() : null)
      } else {
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
      nationality: profileData.nationality,
      role: profileData.role,
      status: 'pending',
      createdAt: serverTimestamp(),
    }
    await setDoc(doc(db, 'users', cred.user.uid), profile)
    return profile
  }

  async function loginWithEmail(email, password) {
    return signInWithEmailAndPassword(auth, email, password)
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider()
    const cred = await signInWithPopup(auth, provider)
    const snap = await getDoc(doc(db, 'users', cred.user.uid))
    if (!snap.exists()) {
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        email: cred.user.email,
        name: cred.user.displayName,
        nationality: '',
        role: 'owner',
        status: 'pending',
        createdAt: serverTimestamp(),
      })
    }
    return cred
  }

  async function logout() {
    await signOut(auth)
    setUserProfile(null)
  }

  const isAdmin = userProfile?.role === 'admin'
  const isApproved = userProfile?.status === 'approved'

  return (
    <AuthContext.Provider value={{ 
      user, userProfile, loading, isAdmin, isApproved, 
      registerWithEmail, loginWithEmail, loginWithGoogle, logout 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}