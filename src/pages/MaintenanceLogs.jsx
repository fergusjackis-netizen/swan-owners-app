import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  getCrewIssues, postCrewIssue, resolveAndPublishIssue,
  getChecklistTemplate, saveChecklistTemplate, saveCompletedChecklist, getVesselDocuments
} from '../services/firestore'
import './MaintenanceLogs.css'
import VesselDocuments from '../components/VesselDocuments'

const SYSTEMS = ["Deck & Rig","Engine","Bow Thruster","Generator","24v Electrical","240v Shore Power","Electronics","Safety","Below Decks","Domestic Systems","Air Conditioning","Heating","Water System","Calorifier","Washing Machine","Rig & Sails","Hull & Deck","Other"]
const DEFAULT_WEEKLY = [
  {
    "id": "w01",
    "category": "Deck & Rig",
    "item": "Inspect running rigging for chafe, wear and broken strands"
  },
  {
    "id": "w02",
    "category": "Deck & Rig",
    "item": "Check standing rigging — shrouds, stays, turnbuckles, toggles"
  },
  {
    "id": "w03",
    "category": "Deck & Rig",
    "item": "Inspect furling systems — jib and main — for smooth operation"
  },
  {
    "id": "w04",
    "category": "Deck & Rig",
    "item": "Check all blocks, clutches and winches"
  },
  {
    "id": "w05",
    "category": "Deck & Rig",
    "item": "Check electric winches — operation and deck connections"
  },
  {
    "id": "w06",
    "category": "Deck & Rig",
    "item": "Inspect mast base, deck fittings and chainplates"
  },
  {
    "id": "w07",
    "category": "Deck & Rig",
    "item": "Check anchor, chain and windlass operation"
  },
  {
    "id": "w08",
    "category": "Deck & Rig",
    "item": "Inspect stanchions, lifelines and jackstays"
  },
  {
    "id": "w09",
    "category": "Engine",
    "item": "Check engine oil level"
  },
  {
    "id": "w10",
    "category": "Engine",
    "item": "Check coolant level"
  },
  {
    "id": "w11",
    "category": "Engine",
    "item": "Check raw water strainer — clear if needed"
  },
  {
    "id": "w12",
    "category": "Engine",
    "item": "Check bilges — note any unusual ingress"
  },
  {
    "id": "w13",
    "category": "Engine",
    "item": "Test automatic bilge pumps — float switch operation"
  },
  {
    "id": "w14",
    "category": "Engine",
    "item": "Run engine — check for noise, smoke or overheating"
  },
  {
    "id": "w15",
    "category": "Engine",
    "item": "Check alternator charging voltage"
  },
  {
    "id": "w16",
    "category": "Bow Thruster",
    "item": "Test operation — port and starboard"
  },
  {
    "id": "w17",
    "category": "Bow Thruster",
    "item": "Check for unusual noise or reduced thrust"
  },
  {
    "id": "w18",
    "category": "Generator",
    "item": "Run generator under load — check for smoke or overheating"
  },
  {
    "id": "w19",
    "category": "Generator",
    "item": "Check generator oil level"
  },
  {
    "id": "w20",
    "category": "Generator",
    "item": "Check generator raw water strainer"
  },
  {
    "id": "w21",
    "category": "Generator",
    "item": "Check output voltage — should read 230-240v"
  },
  {
    "id": "w22",
    "category": "24v Electrical",
    "item": "Check battery state of charge — all banks"
  },
  {
    "id": "w23",
    "category": "24v Electrical",
    "item": "Check alternator and battery charger output"
  },
  {
    "id": "w24",
    "category": "24v Electrical",
    "item": "Inspect battery terminals for corrosion"
  },
  {
    "id": "w25",
    "category": "24v Electrical",
    "item": "Test navigation lights"
  },
  {
    "id": "w26",
    "category": "24v Electrical",
    "item": "Check VHF operation"
  },
  {
    "id": "w27",
    "category": "240v Shore Power",
    "item": "Check shore power connection — cable and plug condition"
  },
  {
    "id": "w28",
    "category": "240v Shore Power",
    "item": "Check RCD/circuit breakers — all functioning"
  },
  {
    "id": "w29",
    "category": "240v Shore Power",
    "item": "Check shore power indicator light"
  },
  {
    "id": "w30",
    "category": "Electronics",
    "item": "Check chartplotter operation and GPS fix"
  },
  {
    "id": "w31",
    "category": "Electronics",
    "item": "Check AIS — transmitting and receiving"
  },
  {
    "id": "w32",
    "category": "Electronics",
    "item": "Check depth sounder, wind instruments, autopilot"
  },
  {
    "id": "w33",
    "category": "Safety",
    "item": "Inspect flares — in date and accessible"
  },
  {
    "id": "w34",
    "category": "Safety",
    "item": "Check fire extinguishers — in date and accessible"
  },
  {
    "id": "w35",
    "category": "Safety",
    "item": "Test manual bilge pump"
  },
  {
    "id": "w36",
    "category": "Below Decks",
    "item": "Check all seacocks — operate and grease if stiff"
  },
  {
    "id": "w37",
    "category": "Below Decks",
    "item": "Check stern gland — adjust drip rate if needed"
  },
  {
    "id": "w38",
    "category": "Below Decks",
    "item": "Inspect hoses and clips for chafe or weeping"
  },
  {
    "id": "w39",
    "category": "Below Decks",
    "item": "Check heads operation and holding tank level"
  },
  {
    "id": "w40",
    "category": "Domestic Systems",
    "item": "Check pressurised water system — pressure, any air in lines"
  },
  {
    "id": "w41",
    "category": "Domestic Systems",
    "item": "Check hot water calorifier — temperature and pressure relief valve"
  },
  {
    "id": "w42",
    "category": "Domestic Systems",
    "item": "Check washing machine — hose connections and drain"
  },
  {
    "id": "w43",
    "category": "Domestic Systems",
    "item": "Run air conditioning — check cooling and drainage"
  },
  {
    "id": "w44",
    "category": "Domestic Systems",
    "item": "Check heating system — operation and fuel level"
  }
]
const DEFAULT_MONTHLY = [
  {
    "id": "m01",
    "category": "Rig & Sails",
    "item": "Full rig inspection aloft — masthead, spreaders, sheaves"
  },
  {
    "id": "m02",
    "category": "Rig & Sails",
    "item": "Inspect sails for UV damage, seam separation, batten pockets"
  },
  {
    "id": "m03",
    "category": "Rig & Sails",
    "item": "Lubricate all blocks, furlers and tracks"
  },
  {
    "id": "m04",
    "category": "Rig & Sails",
    "item": "Check boom vang, kicker and reefing lines end to end"
  },
  {
    "id": "m05",
    "category": "Rig & Sails",
    "item": "Inspect electric winch motors, wiring and deck glands"
  },
  {
    "id": "m06",
    "category": "Engine",
    "item": "Check and top up gearbox oil"
  },
  {
    "id": "m07",
    "category": "Engine",
    "item": "Inspect raw water impeller — replace every 200 hours"
  },
  {
    "id": "m08",
    "category": "Engine",
    "item": "Check belts — alternator, AC compressor"
  },
  {
    "id": "m09",
    "category": "Engine",
    "item": "Check propeller shaft — play, alignment, anode condition"
  },
  {
    "id": "m10",
    "category": "Engine",
    "item": "Inspect cutlass bearing"
  },
  {
    "id": "m11",
    "category": "Engine",
    "item": "Check fuel filters — primary and secondary"
  },
  {
    "id": "m12",
    "category": "Bow Thruster",
    "item": "Inspect thruster tunnel anode"
  },
  {
    "id": "m13",
    "category": "Bow Thruster",
    "item": "Check thruster shaft seal for weeping"
  },
  {
    "id": "m14",
    "category": "Bow Thruster",
    "item": "Inspect motor mounting bolts"
  },
  {
    "id": "m15",
    "category": "Generator",
    "item": "Check and top up generator oil"
  },
  {
    "id": "m16",
    "category": "Generator",
    "item": "Inspect generator raw water impeller"
  },
  {
    "id": "m17",
    "category": "Generator",
    "item": "Check generator fuel filter"
  },
  {
    "id": "m18",
    "category": "Generator",
    "item": "Check exhaust system — water flow and hose condition"
  },
  {
    "id": "m19",
    "category": "Generator",
    "item": "Log generator hours run"
  },
  {
    "id": "m20",
    "category": "24v Electrical",
    "item": "Full battery capacity test"
  },
  {
    "id": "m21",
    "category": "24v Electrical",
    "item": "Clean and tighten all battery terminals"
  },
  {
    "id": "m22",
    "category": "24v Electrical",
    "item": "Test all automatic bilge pumps under load"
  },
  {
    "id": "m23",
    "category": "24v Electrical",
    "item": "Check inverter operation"
  },
  {
    "id": "m24",
    "category": "240v Shore Power",
    "item": "Inspect all 240v connections — galley, heads, AC, charger"
  },
  {
    "id": "m25",
    "category": "240v Shore Power",
    "item": "Test all RCDs"
  },
  {
    "id": "m26",
    "category": "240v Shore Power",
    "item": "Check shore power cable for wear"
  },
  {
    "id": "m27",
    "category": "240v Shore Power",
    "item": "Check battery charger — output current"
  },
  {
    "id": "m28",
    "category": "Air Conditioning",
    "item": "Clean sea water strainer"
  },
  {
    "id": "m29",
    "category": "Air Conditioning",
    "item": "Clean or replace air filters"
  },
  {
    "id": "m30",
    "category": "Air Conditioning",
    "item": "Inspect condensate drain — clear if blocked"
  },
  {
    "id": "m31",
    "category": "Air Conditioning",
    "item": "Inspect seacock and raw water hose"
  },
  {
    "id": "m32",
    "category": "Heating",
    "item": "Check diesel fuel supply and filter"
  },
  {
    "id": "m33",
    "category": "Heating",
    "item": "Inspect exhaust outlet — clear, no carbon build-up"
  },
  {
    "id": "m34",
    "category": "Heating",
    "item": "Check thermostat operation"
  },
  {
    "id": "m35",
    "category": "Water System",
    "item": "Check accumulator tank pressure — typically 1.5-2 bar"
  },
  {
    "id": "m36",
    "category": "Water System",
    "item": "Inspect all hose connections for weeping"
  },
  {
    "id": "m37",
    "category": "Water System",
    "item": "Clean strainer on pump inlet"
  },
  {
    "id": "m38",
    "category": "Water System",
    "item": "Sanitise water tank if not done in past 3 months"
  },
  {
    "id": "m39",
    "category": "Calorifier",
    "item": "Check anode — replace if more than 50% depleted"
  },
  {
    "id": "m40",
    "category": "Calorifier",
    "item": "Inspect pressure relief valve — operate briefly"
  },
  {
    "id": "m41",
    "category": "Calorifier",
    "item": "Check immersion heater element"
  },
  {
    "id": "m42",
    "category": "Washing Machine",
    "item": "Clean filter"
  },
  {
    "id": "m43",
    "category": "Washing Machine",
    "item": "Check hose connections — inlet and drain"
  },
  {
    "id": "m44",
    "category": "Washing Machine",
    "item": "Inspect door seal"
  },
  {
    "id": "m45",
    "category": "Electronics",
    "item": "Update chartplotter charts if subscription current"
  },
  {
    "id": "m46",
    "category": "Electronics",
    "item": "Test EPIRB — registered and in date"
  },
  {
    "id": "m47",
    "category": "Electronics",
    "item": "Check liferaft service date"
  },
  {
    "id": "m48",
    "category": "Electronics",
    "item": "Verify AIS MMSI and vessel data correct"
  },
  {
    "id": "m49",
    "category": "Electronics",
    "item": "Test autopilot drive unit — rams, cables, feedback unit"
  },
  {
    "id": "m50",
    "category": "Hull & Deck",
    "item": "Inspect hull below waterline — weed, osmosis, anodes"
  },
  {
    "id": "m51",
    "category": "Hull & Deck",
    "item": "Check keel bolts — any weeping or rust staining"
  },
  {
    "id": "m52",
    "category": "Hull & Deck",
    "item": "Inspect rudder bearings for play"
  },
  {
    "id": "m53",
    "category": "Hull & Deck",
    "item": "Check all deck fittings — stanchion bases, cleats, winch bases"
  },
  {
    "id": "m54",
    "category": "Hull & Deck",
    "item": "Lubricate all hatches and ports"
  },
  {
    "id": "m55",
    "category": "Safety",
    "item": "Check first aid kit — stock and expiry dates"
  },
  {
    "id": "m56",
    "category": "Safety",
    "item": "Confirm insurance, registration and safety certificate in date"
  }
]
const newId = () => Math.random().toString(36).slice(2,10)

export default function MaintenanceLogs() {
  const { user, userProfile } = useAuth()
  const [assignedYachts, setAssignedYachts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [view, setView] = useState('overview')
  const [checklistType, setChecklistType] = useState('weekly')
  const [template, setTemplate] = useState(null)
  const [checklistRun, setChecklistRun] = useState({})
  const [submittingChecklist, setSubmittingChecklist] = useState(false)
  const [emailOnSubmit, setEmailOnSubmit] = useState(false)
  const [issues, setIssues] = useState([])
  const [issuesLoading, setIssuesLoading] = useState(false)
  const [resolvingIssue, setResolvingIssue] = useState(null)
  const [fixText, setFixText] = useState('')
  const [modelCount, setModelCount] = useState(0)
  const [issueForm, setIssueForm] = useState({ title: '', description: '', system: 'Other' })
  const [loggingIssue, setLoggingIssue] = useState(false)
  const [newItemText, setNewItemText] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('Other')
  const [vesselDocs, setVesselDocs] = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatStatus, setChatStatus] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [showDocs, setShowDocs] = useState(false)
  const [chatImage, setChatImage] = useState(null) // {base64, mediaType, preview}

  useEffect(() => { if (user?.uid) loadAssignedYachts() }, [user?.uid])

  async function loadAssignedYachts() {
    try {
      const { getDocs, collection } = await import('firebase/firestore')
      const { db } = await import('../firebase')
      const snap = await getDocs(collection(db, 'yachts'))
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      const mine = all.filter(y => {
        if (y.id === user.uid) return true
        const crew = y.crew || {}
        return (crew.linkedSkippers||[]).includes(user.uid) || (crew.linkedGardiennes||[]).includes(user.uid)
      })
      setAssignedYachts(mine)
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  async function selectYacht(yacht) {
    setSelected(yacht)
    setView('overview')
    setIssuesLoading(true)
    try {
      const { getDocs, collection } = await import('firebase/firestore')
      const { db } = await import('../firebase')
      const [issueList, tmpl, yachtsSnap, docList] = await Promise.all([
        getCrewIssues(yacht.id),
        getChecklistTemplate(yacht.id),
        getDocs(collection(db, 'yachts')),
        getVesselDocuments(yacht.id)
      ])
      setVesselDocs(docList)
      setIssues(issueList)
      setTemplate(tmpl || { weekly: DEFAULT_WEEKLY, monthly: DEFAULT_MONTHLY })
      setModelCount(yachtsSnap.docs.filter(d => d.data().model === yacht.model).length)
    } catch(e) { console.error(e) }
    setIssuesLoading(false)
  }

  function crewRole(yacht) {
    if (yacht.id === user.uid) return 'Owner'
    const crew = yacht.crew || {}
    if ((crew.linkedSkippers||[]).includes(user.uid)) return 'Skipper'
    if ((crew.linkedGardiennes||[]).includes(user.uid)) return 'Gardienne'
    return 'Crew'
  }

  function startChecklist(type) {
    setChecklistType(type)
    const run = {}
    const items = type === 'weekly' ? template.weekly : template.monthly
    items.forEach(item => { run[item.id] = { status: 'pending', comment: '' } })
    issues.filter(i => i.status === 'open').forEach(issue => {
      run['issue_' + issue.id] = { status: 'pending', comment: '' }
    })
    setChecklistRun(run)
    setView('checklist')
  }

  function setItemStatus(id, status) {
    setChecklistRun(prev => ({ ...prev, [id]: { ...prev[id], status } }))
  }
  function setItemComment(id, comment) {
    setChecklistRun(prev => ({ ...prev, [id]: { ...prev[id], comment } }))
  }

  async function submitChecklist() {
    setSubmittingChecklist(true)
    try {
      const items = checklistType === 'weekly' ? template.weekly : template.monthly
      for (const item of items) {
        const run = checklistRun[item.id]
        if (run?.status === 'issue') {
          await postCrewIssue(selected.id, user.uid, {
            title: item.item,
            description: run.comment || 'Flagged during ' + checklistType + ' inspection',
            system: item.category,
            fromChecklist: true,
          })
        }
      }
      await saveCompletedChecklist(selected.id, {
        type: checklistType,
        completedBy: user.uid,
        completedByName: userProfile?.name || user.email,
        items: checklistRun,
        emailSent: emailOnSubmit,
      })
      if (emailOnSubmit && selected.ownerEmail) {
        const itemList = items.map(item => {
          const r = checklistRun[item.id]
          return item.item + ': ' + (r?.status||'pending') + (r?.comment ? ' — ' + r.comment : '')
        }).join('\n')
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selected.ownerEmail,
            subject: (checklistType === 'weekly' ? 'Weekly' : 'Monthly') + ' inspection completed — ' + selected.name,
            text: 'Completed by: ' + (userProfile?.name || user.email) + '\n\n' + itemList,
          })
        })
      }
      const updated = await getCrewIssues(selected.id)
      setIssues(updated)
      setView('overview')
      alert('Checklist submitted' + (emailOnSubmit ? ' and email sent to owner.' : '.'))
    } catch(e) { alert('Error: ' + e.message) }
    setSubmittingChecklist(false)
  }

  function addTemplateItem() {
    if (!newItemText.trim()) return
    const item = { id: newId(), category: newItemCategory, item: newItemText.trim() }
    const updated = { ...template, [checklistType]: [...(template[checklistType]||[]), item] }
    setTemplate(updated)
    saveChecklistTemplate(selected.id, updated)
    setNewItemText('')
  }

  function removeTemplateItem(type, id) {
    const updated = { ...template, [type]: template[type].filter(i => i.id !== id) }
    setTemplate(updated)
    saveChecklistTemplate(selected.id, updated)
  }

  async function submitIssue() {
    if (!issueForm.title.trim()) return
    setLoggingIssue(true)
    try {
      await postCrewIssue(selected.id, user.uid, issueForm)
      const updated = await getCrewIssues(selected.id)
      setIssues(updated)
      setIssueForm({ title: '', description: '', system: 'Other' })
      setView('overview')
    } catch(e) { alert('Error: ' + e.message) }
    setLoggingIssue(false)
  }

  async function submitResolve() {
    if (!fixText.trim() || !resolvingIssue) return
    try {
      await resolveAndPublishIssue(selected.id, resolvingIssue.id, fixText, user.uid, selected.model, modelCount)
      const updated = await getCrewIssues(selected.id)
      setIssues(updated)
      setResolvingIssue(null)
      setFixText('')
      setView('overview')
      alert(modelCount >= 2
        ? 'Issue resolved and posted to Issues & Fixes, attributed to ' + selected.model + '.'
        : 'Issue resolved and posted to Issues & Fixes without model attribution — yours is the only ' + selected.model + ' registered.')
    } catch(e) { alert('Error: ' + e.message) }
  }

  function getRelevantDocs(query, docs) {
    const q = query.toLowerCase()
    const keywords = {
      'engine': ['engine', 'motor', 'yanmar', 'diesel', 'fuel', 'cooling', 'oil', 'impeller', 'raw water', 'exhaust', 'gearbox'],
      'electrical': ['electrical', 'electric', 'battery', 'charge', 'shore power', 'generator', 'inverter', 'fuse', 'circuit', 'wiring', '24v', '240v', 'volt'],
      'plumbing': ['water', 'pump', 'plumb', 'pipe', 'hose', 'seacock', 'bilge', 'tank', 'fresh water', 'grey water', 'black water', 'heads', 'toilet'],
      'ac': ['ac', 'air con', 'cooling', 'dometic', 'refriger', 'temperature', 'aircon', 'air-con'],
      'heating': ['heating', 'heat', 'webasto', 'warm', 'temperature'],
      'rig': ['rig', 'sail', 'mast', 'boom', 'shroud', 'stay', 'halyard', 'sheet', 'winch', 'furler', 'jib', 'main'],
      'navigation': ['nav', 'gps', 'chart', 'plotter', 'ais', 'vhf', 'radio', 'nmea', 'autopilot', 'pilot', 'compass'],
      'hull': ['hull', 'keel', 'rudder', 'steering', 'helm', 'through-hull', 'seacock'],
      'deck': ['deck', 'anchor', 'windlass', 'winch', 'stanchion', 'lifeline'],
      'thruster': ['thruster', 'bow thruster', 'lateral', 'quick'],
      'generator': ['generator', 'genset', 'gen set', 'shore power'],
    }
    
    // Find matching categories
    const matchingCats = new Set()
    for (const [cat, words] of Object.entries(keywords)) {
      if (words.some(w => q.includes(w))) matchingCats.add(cat)
    }
    
    // Score each document
    const scored = docs.map(doc => {
      const name = (doc.displayName || doc.filename || '').toLowerCase()
      const cat = (doc.category || '').toLowerCase()
      let score = 0
      
      // Direct query word match in filename
      const queryWords = q.split(' ').filter(w => w.length > 3)
      queryWords.forEach(w => { if (name.includes(w)) score += 3 })
      
      // Category match
      for (const [catKey, words] of Object.entries(keywords)) {
        if (matchingCats.has(catKey)) {
          if (words.some(w => name.includes(w) || cat.includes(w))) score += 2
        }
      }
      
      return { ...doc, score }
    })
    
    // Return top 4 most relevant docs with score > 0
    return scored
      .filter(d => d.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
  }

  async function fetchPdfAsBase64(url) {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch(e) {
      console.error('Failed to fetch PDF:', e)
      return null
    }
  }

  async function getKnowledgeBase(yachtId, query) {
    try {
      const { getDocs, collection } = await import('firebase/firestore')
      const { db } = await import('../firebase')
      const snap = await getDocs(collection(db, 'yachts', yachtId, 'knowledge'))
      const docs = snap.docs.map(d => d.data())
      if (docs.length === 0) return ''
      const q = query.toLowerCase()
      const keywords = q.split(' ').filter(w => w.length > 3)
      const scored = docs.map(d => {
        const content = (d.content || '').toLowerCase()
        const score = keywords.filter(k => content.includes(k)).length
        return { ...d, score }
      }).filter(d => d.score > 0).sort((a,b) => b.score - a.score).slice(0, 2)
      if (scored.length === 0) {
        const byDoc = {}
        docs.forEach(d => { if (!byDoc[d.docId]) byDoc[d.docId] = d })
        return Object.values(byDoc).slice(0,2).map(d =>
          '### ' + d.filename + '\n' + (d.content||'').slice(0,3000)
        ).join('\n\n')
      }
      return scored.map(d => '### ' + d.filename + '\n' + (d.content||'')).join('\n\n')
    } catch(e) {
      console.error('Knowledge base error:', e)
      return ''
    }
  }

  async function sendChat() {
    if ((!chatInput.trim() && !chatImage) || chatLoading) return
    const userMsg = chatInput.trim()
    const imgToSend = chatImage
    setChatInput('')
    setChatImage(null)

    // Build user message content
    const userContent = imgToSend
      ? [
          ...(userMsg ? [{ type: 'text', text: userMsg }] : [{ type: 'text', text: 'What do you see in this image?' }]),
          { type: 'image', source: { type: 'base64', media_type: imgToSend.mediaType, data: imgToSend.base64 } }
        ]
      : userMsg

    setChatMessages(prev => [...prev, {
      role: 'user',
      content: userContent,
      preview: imgToSend?.preview,
      text: userMsg || 'Photo sent'
    }])
    setChatLoading(true)
    try {
      const docSummary = vesselDocs.length > 0
        ? 'The vessel has ' + vesselDocs.length + ' technical documents uploaded: ' +
          vesselDocs.map(d => (d.displayName || d.filename) + ' (' + d.category + (d.manufacturer ? ', ' + d.manufacturer : '') + ')').join('; ') + '.'
        : 'No technical documents have been uploaded for this vessel yet.'

      const system = [
        'You are the onboard engineer for ' + (selected?.name || 'a Swan yacht') + ', a ' + (selected?.model || 'Swan') + ' based at ' + (selected?.homeMarina?.name ? selected.homeMarina.name + (selected.homeMarina.country ? ', ' + selected.homeMarina.country : '') : 'unknown marina') + '.',
        'You have studied the complete technical document library for this vessel including: ' + (vesselDocs.length > 0 ? vesselDocs.map(d => d.displayName || d.filename).join(', ') : 'no documents uploaded yet') + '.',
        'Use these documents to guide crew to exact component locations — never assume they know where something is. Always tell them exactly where to go: which locker, which side, which level.',
        openIssues.length > 0
          ? 'Current outstanding issues on this vessel: ' + openIssues.map(i => i.title + ' (' + i.system + ')' + (i.description ? ': ' + i.description : '')).join('; ') + '.'
          : 'No outstanding issues currently logged.',
        'DIAGNOSTIC APPROACH: Never guess. Ask one question at a time. Always direct crew to the exact location of the component first, then ask for a photo of it. When you receive a photo, describe in one sentence exactly what you see, then either diagnose or ask for the next photo.',
        'SEARCH FOR HELP: When directing crew to a component or explaining a repair, use web search to find a relevant YouTube video or image showing exactly what they should see or do. Share the link in your response.',
        'FORMAT: Use short sentences. Number repair steps. Flag safety issues immediately with SAFETY:. Reference document names when relevant.',
        'Keep asking for more information and photos until you are fully confident in your diagnosis. Never stop at one question if more information would help.',
      ].filter(Boolean).join(' ')

      // Fetch relevant PDFs (skip if knowledge base has content)
      let documents = []
      if (vesselDocs.length > 0 && !imgToSend && !knowledgeContext) {
        const relevantDocs = getRelevantDocs(userMsg, vesselDocs)
        if (relevantDocs.length > 0) {
          const fetched = await Promise.all(
            relevantDocs.map(async doc => {
              const base64 = await fetchPdfAsBase64(doc.url)
              return base64 ? { name: doc.displayName || doc.filename, category: doc.category, base64 } : null
            })
          )
          documents = fetched.filter(Boolean)
        }
      }

      let knowledgeContext = ''
      if (selected?.id && userMsg) {
        knowledgeContext = await getKnowledgeBase(selected.id, userMsg)
      }
      const finalSystem = knowledgeContext
        ? system + '\n\nPRE-EXTRACTED DOCUMENT KNOWLEDGE BASE (use this to answer accurately):\n' + knowledgeContext.slice(0, 15000)
        : system

      setChatStatus('Thinking...')
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: finalSystem,
          max_tokens: 2048,
          documents,
          messages: [
            ...chatMessages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userContent }
          ],
        })
      })
      const data = await response.json()
      // Extract text from all text blocks (handles tool_use responses)
      const reply = data.content
        ? data.content.filter(b => b.type === 'text').map(b => b.text).join('\n') || 'Sorry, I could not get a response.'
        : 'Sorry, I could not get a response.'
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply, text: reply }])
      setChatStatus('')
    } catch(e) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    }
    setChatLoading(false)
  }

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>

  // ── VESSEL LIST ─────────────────────────────────────────────────────────────
  if (!selected) return (
    <div className="maintlogs-page">
      <div className="maintlogs-header">
        <h1>Maintenance Log{assignedYachts.length !== 1 ? 's' : ''}</h1>
        <p className="maintlogs-subtitle">
          {assignedYachts.length === 0 ? 'No vessels assigned'
            : assignedYachts.length === 1 ? '1 vessel assigned'
            : assignedYachts.length + ' vessels assigned'}
        </p>
      </div>
      {assignedYachts.length === 0 && (
        <div className="maintlogs-empty">
          <p>You are not currently linked as crew on any vessel.</p>
          <p>Ask the yacht owner to add you from their My Yacht page.</p>
        </div>
      )}
      <div className="maintlogs-fleet">
        {assignedYachts.map(yacht => (
          <button key={yacht.id} className="maintlogs-card" onClick={() => selectYacht(yacht)}>
            <div className="maintlogs-card-main">
              <span className="maintlogs-boat-name">{yacht.name || 'Unnamed vessel'}</span>
              <span className="maintlogs-model">{yacht.model || 'Unknown model'}</span>
              {yacht.homeMarina?.name && <span className="maintlogs-marina">{yacht.homeMarina.name}{yacht.homeMarina.country ? ', ' + yacht.homeMarina.country : ''}</span>}
            </div>
            <div className="maintlogs-card-right">
              <span className="maintlogs-role">{crewRole(yacht)}</span>
              {yacht.flag && <span className="maintlogs-flag">{yacht.flag}</span>}
              <span className="maintlogs-arrow">›</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  const openIssues = issues.filter(i => i.status === 'open')
  const resolvedIssues = issues.filter(i => i.status === 'resolved')
  const currentItems = template ? (checklistType === 'weekly' ? template.weekly : template.monthly) : []

  // ── OVERVIEW ────────────────────────────────────────────────────────────────
  if (view === 'overview') return (
    <div className="maintlogs-page">
      <div className="maintlogs-header">
        <button className="maintlogs-back" onClick={() => setSelected(null)}>‹ All vessels</button>
        <h1>{selected.name}</h1>
        <p className="maintlogs-subtitle">{selected.model}{selected.flag ? ' — ' + selected.flag : ''}</p>
      </div>
      <div className="mlog-action-grid">
        <button className="mlog-action-btn" onClick={() => startChecklist('weekly')}>
          <span className="mlog-action-title">Weekly Check</span>
          <span className="mlog-action-desc">Run through weekly inspection</span>
        </button>
        <button className="mlog-action-btn" onClick={() => startChecklist('monthly')}>
          <span className="mlog-action-title">Monthly Check</span>
          <span className="mlog-action-desc">Run through monthly inspection</span>
        </button>
        <button className="mlog-action-btn mlog-action-issue" onClick={() => setView('log-issue')}>
          <span className="mlog-action-title">Log an Issue</span>
          <span className="mlog-action-desc">Report a problem to the crew</span>
        </button>
        <button className="mlog-action-btn" onClick={() => setView('template')}>
          <span className="mlog-action-title">Edit Checklist</span>
          <span className="mlog-action-desc">Customise inspection items</span>
        </button>
      </div>
      {issuesLoading && <p className="mlog-loading">Loading...</p>}

      <div className="ask-claude-section">
        <button className="ask-claude-toggle" onClick={() => setChatOpen(o => !o)}>
          <span className="ask-claude-label">Ask Claude</span>
          <span className="ask-claude-hint">{chatOpen ? 'Close' : 'Marine engineer & maintenance advice for your ' + (selected?.model || 'yacht')}</span>
          <span className="ask-claude-chevron">{chatOpen ? '▲' : '▼'}</span>
        </button>
        {chatOpen && (
          <div className="ask-claude-body">
            {vesselDocs.length > 0 && (
              <p className="ask-claude-context-note">{vesselDocs.length} vessel documents available — relevant PDFs are read automatically per question</p>
            )}
            {chatMessages.length === 0 && (
              <p className="ask-claude-empty">Ask anything about maintaining your {selected?.model} — troubleshooting, procedures, parts, checks. I know about your outstanding issues{vesselDocs.length > 0 ? ' and have access to your vessel documents' : ''}.</p>
            )}
            <div className="ask-claude-messages">
              {chatMessages.map((msg, i) => (
                <div key={i} className={'ask-claude-msg ask-claude-msg-' + msg.role}>
                  <span className="ask-claude-msg-label">{msg.role === 'user' ? 'You' : 'Claude'}</span>
                  {msg.preview && <img src={msg.preview} alt="Sent photo" className="ask-claude-sent-img" />}
                  <p className="ask-claude-msg-text">{msg.text || (typeof msg.content === 'string' ? msg.content : '')}</p>
                </div>
              ))}
              {chatLoading && (
                <div className="ask-claude-msg ask-claude-msg-assistant">
                  <span className="ask-claude-msg-label">Claude</span>
                  <p className="ask-claude-msg-text ask-claude-thinking">{chatStatus || 'Thinking...'}</p>
                </div>
              )}
            </div>
            {chatImage && (
              <div className="ask-claude-image-preview">
                <img src={chatImage.preview} alt="Preview" />
                <button className="ask-claude-image-remove" onClick={() => setChatImage(null)}>x</button>
              </div>
            )}
            <div className="ask-claude-input-row">
              <label className="ask-claude-camera-btn" title="Attach photo">
                <input type="file" accept="image/*" capture="environment" style={{display:'none'}}
                  onChange={e => {
                    const file = e.target.files[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = ev => {
                      const dataUrl = ev.target.result
                      const base64 = dataUrl.split(',')[1]
                      const mediaType = file.type || 'image/jpeg'
                      setChatImage({ base64, mediaType, preview: dataUrl })
                    }
                    reader.readAsDataURL(file)
                    e.target.value = ''
                  }}
                />
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </label>
              <input className="ask-claude-input" value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder={chatImage ? 'Add a message or just send the photo...' : 'Ask about your ' + (selected?.model || 'yacht') + '...'}
                disabled={chatLoading} />
              <button className="ask-claude-send" onClick={sendChat} disabled={chatLoading || (!chatInput.trim() && !chatImage)}>Send</button>
            </div>
          </div>
        )}
      </div>

      <div className="mlog-docs-section">
        <button className="ask-claude-toggle" onClick={() => setShowDocs(o => !o)}>
          <span className="ask-claude-label">Vessel Documents</span>
          <span className="ask-claude-hint">{showDocs ? 'Close' : vesselDocs.length + ' document' + (vesselDocs.length !== 1 ? 's' : '') + ' — manuals & drawings'}</span>
          <span className="ask-claude-chevron">{showDocs ? '▲' : '▼'}</span>
        </button>
        {showDocs && (
          <div className="ask-claude-body">
            <VesselDocuments yachtId={selected?.id} canUpload={false} compact={true} />
          </div>
        )}
      </div>
      {openIssues.length > 0 && (
        <div className="mlog-section">
          <h2>Outstanding Issues <span className="mlog-count">{openIssues.length}</span></h2>
          {openIssues.map(issue => (
            <div key={issue.id} className="mlog-issue-card mlog-issue-open">
              <div className="mlog-issue-info">
                <span className="mlog-issue-title">{issue.title}</span>
                <span className="mlog-issue-system">{issue.system}</span>
                {issue.description && <span className="mlog-issue-desc">{issue.description}</span>}
              </div>
              <button className="btn-resolve" onClick={() => { setResolvingIssue(issue); setView('resolve') }}>Mark resolved</button>
            </div>
          ))}
        </div>
      )}
      {resolvedIssues.length > 0 && (
        <div className="mlog-section">
          <h2>Resolved <span className="mlog-count">{resolvedIssues.length}</span></h2>
          {resolvedIssues.map(issue => (
            <div key={issue.id} className="mlog-issue-card mlog-issue-resolved">
              <div className="mlog-issue-info">
                <span className="mlog-issue-title">{issue.title}</span>
                <span className="mlog-issue-system">{issue.system}</span>
                {issue.fix && <span className="mlog-issue-fix">Fix: {issue.fix}</span>}
              </div>
              {issue.publishedToBoard && <span className="mlog-issue-shared">Shared with community</span>}
            </div>
          ))}
        </div>
      )}
      {issues.length === 0 && !issuesLoading && (
        <p className="mlog-no-issues">No issues logged. Use the checklist or log an issue above.</p>
      )}
    </div>
  )

  // ── LOG ISSUE ───────────────────────────────────────────────────────────────
  if (view === 'log-issue') return (
    <div className="maintlogs-page">
      <div className="maintlogs-header">
        <button className="maintlogs-back" onClick={() => setView('overview')}>‹ Back</button>
        <h1>Log an Issue</h1>
        <p className="maintlogs-subtitle">{selected.name}</p>
      </div>
      <div className="mlog-form">
        <div className="mlog-field">
          <label>Title</label>
          <input value={issueForm.title} onChange={e => setIssueForm(p=>({...p,title:e.target.value}))} placeholder="Brief description of the issue" autoFocus />
        </div>
        <div className="mlog-field">
          <label>System</label>
          <select value={issueForm.system} onChange={e => setIssueForm(p=>({...p,system:e.target.value}))}>
            {SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="mlog-field">
          <label>Details</label>
          <textarea value={issueForm.description} onChange={e => setIssueForm(p=>({...p,description:e.target.value}))}
            placeholder="Describe the issue in detail — when first noticed, any relevant symptoms..." rows={4} />
        </div>
        <p className="mlog-privacy-note">This issue is private to your crew until marked as resolved, at which point it will be shared anonymously with the community{modelCount < 2 ? ' without model attribution — yours is the only ' + selected.model + ' registered' : ', attributed to ' + selected.model}.</p>
        <div className="mlog-form-actions">
          <button onClick={() => setView('overview')}>Cancel</button>
          <button className="btn-primary-mlog" onClick={submitIssue} disabled={loggingIssue || !issueForm.title.trim()}>
            {loggingIssue ? 'Saving...' : 'Log Issue'}
          </button>
        </div>
      </div>
    </div>
  )

  // ── RESOLVE ─────────────────────────────────────────────────────────────────
  if (view === 'resolve' && resolvingIssue) return (
    <div className="maintlogs-page">
      <div className="maintlogs-header">
        <button className="maintlogs-back" onClick={() => { setView('overview'); setResolvingIssue(null) }}>‹ Back</button>
        <h1>Mark as Resolved</h1>
        <p className="maintlogs-subtitle">{resolvingIssue.title}</p>
      </div>
      <div className="mlog-form">
        <div className="mlog-issue-card mlog-issue-open" style={{marginBottom:'1.5rem'}}>
          <div className="mlog-issue-info">
            <span className="mlog-issue-title">{resolvingIssue.title}</span>
            <span className="mlog-issue-system">{resolvingIssue.system}</span>
            {resolvingIssue.description && <span className="mlog-issue-desc">{resolvingIssue.description}</span>}
          </div>
        </div>
        <div className="mlog-field">
          <label>How was it fixed?</label>
          <textarea value={fixText} onChange={e => setFixText(e.target.value)}
            placeholder="Describe the fix in detail — parts used, procedure, any notes for future reference..." rows={5} autoFocus />
        </div>
        <p className="mlog-privacy-note">On submission this will be posted to the community Issues &amp; Fixes board{modelCount >= 2 ? ', attributed to ' + selected.model + '.' : ' without model attribution — yours is the only ' + selected.model + ' registered.'}</p>
        <div className="mlog-form-actions">
          <button onClick={() => { setView('overview'); setResolvingIssue(null) }}>Cancel</button>
          <button className="btn-primary-mlog" onClick={submitResolve} disabled={!fixText.trim()}>Resolve &amp; Share with Community</button>
        </div>
      </div>
    </div>
  )

  // ── CHECKLIST RUN ───────────────────────────────────────────────────────────
  if (view === 'checklist') return (
    <div className="maintlogs-page">
      <div className="maintlogs-header">
        <button className="maintlogs-back" onClick={() => setView('overview')}>‹ Back</button>
        <h1>{checklistType === 'weekly' ? 'Weekly' : 'Monthly'} Inspection</h1>
        <p className="maintlogs-subtitle">{selected.name}</p>
      </div>
      {openIssues.length > 0 && (
        <div className="mlog-section">
          <h2>Outstanding Issues</h2>
          <p className="mlog-section-hint">Tap "Mark resolved" to enter fix details and share with community.</p>
          {openIssues.map(issue => (
            <div key={issue.id} className="mlog-check-item mlog-check-issue">
              <div className="mlog-check-left">
                <button className="mlog-status-btn" onClick={() => { setResolvingIssue(issue); setView('resolve') }}>Mark resolved</button>
                <div>
                  <span className="mlog-check-text">{issue.title}</span>
                  <span className="mlog-check-category" style={{display:'block'}}>{issue.system} — outstanding issue</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mlog-section">
        <h2>Inspection Items</h2>
        {[...new Set(currentItems.map(i => i.category))].map(cat => (
          <div key={cat} className="mlog-check-category-group">
            <h3 className="mlog-check-category-header">{cat}</h3>
            {currentItems.filter(i => i.category === cat).map(item => {
              const run = checklistRun[item.id] || {}
              return (
                <div key={item.id} className={'mlog-check-item' + (run.status==='ok'?' mlog-check-done':'') + (run.status==='issue'?' mlog-check-flagged':'')}>
                  <div className="mlog-check-left">
                    <div className="mlog-check-status-btns">
                      <button className={'mlog-status-btn'+(run.status==='ok'?' active-ok':'')} onClick={() => setItemStatus(item.id, run.status==='ok'?'pending':'ok')}>Ok</button>
                      <button className={'mlog-status-btn'+(run.status==='issue'?' active-issue':'')} onClick={() => setItemStatus(item.id, run.status==='issue'?'pending':'issue')}>Issue</button>
                    </div>
                    <span className="mlog-check-text">{item.item}</span>
                  </div>
                  {run.status === 'issue' && (
                    <input className="mlog-check-comment" placeholder="Describe the issue..."
                      value={run.comment||''} onChange={e => setItemComment(item.id, e.target.value)} />
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <div className="mlog-submit-section">
        <div className="mlog-email-toggle">
          <label className="ios-toggle">
            <input type="checkbox" checked={emailOnSubmit} onChange={e => setEmailOnSubmit(e.target.checked)} />
            <span className="toggle-slider" />
          </label>
          <span>Email summary to owner on submission</span>
        </div>
        <button className="btn-primary-mlog btn-submit-checklist" onClick={submitChecklist} disabled={submittingChecklist}>
          {submittingChecklist ? 'Submitting...' : 'Submit Completed Checklist'}
        </button>
      </div>
    </div>
  )

  // ── EDIT TEMPLATE ───────────────────────────────────────────────────────────
  if (view === 'template') return (
    <div className="maintlogs-page">
      <div className="maintlogs-header">
        <button className="maintlogs-back" onClick={() => setView('overview')}>‹ Back</button>
        <h1>Edit Checklist</h1>
        <p className="maintlogs-subtitle">{selected.name}</p>
      </div>
      <div className="mlog-template-tabs">
        <button className={'mlog-tab'+(checklistType==='weekly'?' active':'')} onClick={() => setChecklistType('weekly')}>Weekly</button>
        <button className={'mlog-tab'+(checklistType==='monthly'?' active':'')} onClick={() => setChecklistType('monthly')}>Monthly</button>
      </div>
      <div className="mlog-add-item-form">
        <select value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)}>
          {SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input value={newItemText} onChange={e => setNewItemText(e.target.value)}
          placeholder="New checklist item..." onKeyDown={e => e.key==='Enter' && addTemplateItem()} />
        <button onClick={addTemplateItem} disabled={!newItemText.trim()}>Add</button>
      </div>
      {[...new Set(currentItems.map(i => i.category))].map(cat => (
        <div key={cat} className="mlog-check-category-group">
          <h3 className="mlog-check-category-header">{cat}</h3>
          {currentItems.filter(i => i.category === cat).map(item => (
            <div key={item.id} className="mlog-template-item">
              <span>{item.item}</span>
              <button className="btn-remove-item" onClick={() => removeTemplateItem(checklistType, item.id)}>Remove</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  )

  return null
}
