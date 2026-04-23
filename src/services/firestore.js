import {
  collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, increment, arrayUnion, arrayRemove
} from 'firebase/firestore'
import { db } from '../firebase'
import { containsBadLanguage } from '../data/swanModels'

// ── YACHTS ──────────────────────────────────────────────────────────────────

export async function saveYacht(uid, data) {
  const ref = doc(db, 'yachts', uid)
  await setDoc(ref, { ...data, ownerId: uid, updatedAt: serverTimestamp() }, { merge: true })
}

export async function getYacht(yachtId) {
  const snap = await getDoc(doc(db, 'yachts', yachtId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function getFleet() {
  const snap = await getDocs(collection(db, 'yachts'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function updateYachtStatus(uid, status) {
  await updateDoc(doc(db, 'yachts', uid), { currentStatus: status, updatedAt: serverTimestamp() })
}

// ── LOCATIONS ────────────────────────────────────────────────────────────────

export async function updateLocation(uid, { lat, lng, boatName, model }) {
  await setDoc(doc(db, 'locations', uid), {
    lat, lng, boatName, model,
    timestamp: serverTimestamp(),
    visible: true,
    uid,
  })
}

export async function hideLocation(uid) {
  await updateDoc(doc(db, 'locations', uid), { visible: false })
}

export async function getActiveLocations() {
  const q = query(collection(db, 'locations'), where('visible', '==', true))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── ISSUES ───────────────────────────────────────────────────────────────────

export async function postIssue(uid, data) {
  const flagged = containsBadLanguage((data.title || '') + ' ' + (data.description || ''))
  return addDoc(collection(db, 'issues'), {
    ...data,
    authorUid: uid,
    upvotes: 0,
    upvotedBy: [],
    resolved: false,
    flagged,
    createdAt: serverTimestamp(),
  })
}

export async function getIssues(filters = {}) {
  let q = query(collection(db, 'issues'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  let results = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  if (filters.model) results = results.filter(i => i.swanModel === filters.model)
  if (filters.system) results = results.filter(i => i.system === filters.system)
  if (filters.resolved !== undefined) results = results.filter(i => i.resolved === filters.resolved)
  return results
}

export async function getIssueReplies(issueId) {
  const q = query(collection(db, 'issues', issueId, 'replies'), orderBy('createdAt', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function postIssueReply(issueId, uid, text) {
  const flagged = containsBadLanguage(text)
  return addDoc(collection(db, 'issues', issueId, 'replies'), {
    text, authorUid: uid, flagged,
    createdAt: serverTimestamp(),
  })
}

export async function upvoteIssue(issueId, uid) {
  const ref = doc(db, 'issues', issueId)
  const snap = await getDoc(ref)
  const data = snap.data()
  if (data.upvotedBy?.includes(uid)) {
    await updateDoc(ref, { upvotes: increment(-1), upvotedBy: arrayRemove(uid) })
  } else {
    await updateDoc(ref, { upvotes: increment(1), upvotedBy: arrayUnion(uid) })
  }
}

export async function markIssueResolved(issueId, resolvedByUid) {
  await updateDoc(doc(db, 'issues', issueId), {
    resolved: true,
    resolvedBy: resolvedByUid,
    resolvedAt: serverTimestamp(),
  })
}


export async function deleteIssue(issueId) {
  await deleteDoc(doc(db, 'issues', issueId))
}

// ── FORUM ────────────────────────────────────────────────────────────────────

export async function createForumTopic(uid, data) {
  const flagged = containsBadLanguage((data.title || '') + ' ' + (data.body || ''))
  return addDoc(collection(db, 'forum'), {
    ...data,
    authorUid: uid,
    replyCount: 0,
    flagged,
    createdAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
  })
}

export async function postForumReply(topicId, uid, text) {
  const flagged = containsBadLanguage(text)
  await addDoc(collection(db, 'forum', topicId, 'replies'), {
    text, authorUid: uid, flagged,
    createdAt: serverTimestamp(),
  })
  await updateDoc(doc(db, 'forum', topicId), {
    replyCount: increment(1),
    lastActivityAt: serverTimestamp(),
  })
}

export async function getForumTopics() {
  const q = query(collection(db, 'forum'), orderBy('lastActivityAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getForumReplies(topicId) {
  const q = query(collection(db, 'forum', topicId, 'replies'), orderBy('createdAt', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── CONTACTS ─────────────────────────────────────────────────────────────────

export async function addContact(uid, data) {
  return addDoc(collection(db, 'contacts'), {
    ...data,
    addedBy: uid,
    createdAt: serverTimestamp(),
  })
}

export async function getContacts(category = null) {
  const q = category
    ? query(collection(db, 'contacts'), where('category', '==', category))
    : collection(db, 'contacts')
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── MESSAGES ─────────────────────────────────────────────────────────────────

export async function getOrCreateThread(uid1, uid2) {
  const threadId = [uid1, uid2].sort().join('_')
  const ref = doc(db, 'messages', threadId)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      participants: [uid1, uid2],
      createdAt: serverTimestamp(),
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
    })
  }
  return threadId
}

export async function sendMessage(threadId, uid, text) {
  const flagged = containsBadLanguage(text)
  await addDoc(collection(db, 'messages', threadId, 'msgs'), {
    text, senderUid: uid, flagged,
    createdAt: serverTimestamp(),
  })
  await updateDoc(doc(db, 'messages', threadId), {
    lastMessage: text.substring(0, 60),
    lastMessageAt: serverTimestamp(),
  })
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────

export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getPendingUsers() {
  const q = query(collection(db, 'users'), where('status', '==', 'pending'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function approveUser(uid) {
  await updateDoc(doc(db, 'users', uid), { status: 'approved' })
}

export async function suspendUser(uid) {
  await updateDoc(doc(db, 'users', uid), { status: 'suspended' })
}

export async function getFlaggedContent() {
  const [issues, forum] = await Promise.all([
    getDocs(query(collection(db, 'issues'), where('flagged', '==', true))),
    getDocs(query(collection(db, 'forum'), where('flagged', '==', true))),
  ])
  return {
    issues: issues.docs.map(d => ({ id: d.id, type: 'issue', ...d.data() })),
    forum: forum.docs.map(d => ({ id: d.id, type: 'forum', ...d.data() })),
    messages: [],
  }
}

export async function clearFlag(col, docId) {
  await updateDoc(doc(db, col, docId), { flagged: false })
}

export async function deleteContent(col, docId) {
  await deleteDoc(doc(db, col, docId))
}

// ── MODELS ───────────────────────────────────────────────────────────────────

export async function getAllModels() {
  const snap = await getDocs(collection(db, 'models'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getModelData(modelName) {
  const snap = await getDoc(doc(db, 'models', modelName))
  return snap.exists() ? snap.data() : null
}

export async function saveModelData(modelName, data) {
  await setDoc(doc(db, 'models', modelName), data)
}

// ── MODEL PROPOSALS ───────────────────────────────────────────────────────────

export async function proposeModel(uid, data) {
  return addDoc(collection(db, 'modelProposals'), {
    ...data,
    proposedBy: uid,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
}

export async function getPendingModelProposals() {
  const q = query(collection(db, 'modelProposals'), where('status', '==', 'pending'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function approveModel(proposalId, modelData) {
  await setDoc(doc(db, 'models', modelData.id || modelData.name), {
    ...modelData,
    approvedAt: serverTimestamp(),
  })
  await updateDoc(doc(db, 'modelProposals', proposalId), { status: 'approved' })
}

// ── MAINTENANCE: CREW ISSUES ─────────────────────────────────────────────────

export async function getCrewIssues(yachtId) {
  const q = query(collection(db, 'yachts', yachtId, 'issues'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function postCrewIssue(yachtId, uid, data) {
  return addDoc(collection(db, 'yachts', yachtId, 'issues'), {
    ...data, authorUid: uid, status: 'open',
    createdAt: serverTimestamp(), publishedToBoard: false,
  })
}

export async function updateCrewIssue(yachtId, issueId, data) {
  await updateDoc(doc(db, 'yachts', yachtId, 'issues', issueId), data)
}

export async function resolveAndPublishIssue(yachtId, issueId, fix, uid, modelName, modelCount) {
  const issueRef = doc(db, 'yachts', yachtId, 'issues', issueId)
  const issueSnap = await getDoc(issueRef)
  const issueData = issueSnap.data()
  await updateDoc(issueRef, {
    fix, resolvedBy: uid, resolvedAt: serverTimestamp(),
    status: 'resolved', publishedToBoard: true,
  })
  const swanModel = modelCount >= 2 ? modelName : null
  await addDoc(collection(db, 'issues'), {
    title: issueData.title,
    description: issueData.description,
    fix,
    swanModel,
    system: issueData.system,
    photos: [],
    authorUid: uid,
    upvotes: 0,
    upvotedBy: [],
    resolved: true,
    flagged: false,
    createdAt: serverTimestamp(),
    resolvedAt: serverTimestamp(),
    resolvedBy: uid,
    fromCrewLog: true,
  })
}

// ── MAINTENANCE: CHECKLIST TEMPLATE ──────────────────────────────────────────

export async function getChecklistTemplate(yachtId) {
  const snap = await getDoc(doc(db, 'yachts', yachtId, 'meta', 'checklistTemplate'))
  return snap.exists() ? snap.data() : null
}

export async function saveChecklistTemplate(yachtId, template) {
  await setDoc(doc(db, 'yachts', yachtId, 'meta', 'checklistTemplate'), template)
}

// ── MAINTENANCE: COMPLETED CHECKLISTS ────────────────────────────────────────

export async function saveCompletedChecklist(yachtId, data) {
  return addDoc(collection(db, 'yachts', yachtId, 'checklists'), {
    ...data, completedAt: serverTimestamp(),
  })
}

export async function getCompletedChecklists(yachtId) {
  const q = query(collection(db, 'yachts', yachtId, 'checklists'), orderBy('completedAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── VESSEL DOCUMENTS ─────────────────────────────────────────────────────────

export async function getVesselDocuments(yachtId) {
  const snap = await getDocs(collection(db, 'yachts', yachtId, 'documents'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function saveVesselDocument(yachtId, data) {
  return addDoc(collection(db, 'yachts', yachtId, 'documents'), {
    ...data,
    uploadedAt: serverTimestamp(),
  })
}

export async function deleteVesselDocument(yachtId, docId) {
  await deleteDoc(doc(db, 'yachts', yachtId, 'documents', docId))
}

export async function saveConversation(yachtId, yachtModel, messages, summary) {
  const { addDoc, collection, serverTimestamp } = await import('firebase/firestore')
  const { db } = await import('../firebase')
  return addDoc(collection(db, 'conversations'), {
    yachtId,
    yachtModel,
    messages: messages.slice(-20), // keep last 20 messages
    summary: summary || '',
    createdAt: serverTimestamp(),
  })
}

export async function getFleetConversations(system, limit = 50) {
  const { getDocs, collection, query, where, orderBy, limit: fsLimit } = await import('firebase/firestore')
  const { db } = await import('../firebase')
  const q = query(collection(db, 'conversations'), fsLimit(limit))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
