// All Germán Frers-designed Nautor's Swan models
// Specs from public domain sources only — no copyrighted Swan material
// LOA in metres, displacement in kg, beam in metres

export const SWAN_MODELS = [
  // Classic Frers era
  { id: 'swan-41', name: 'Swan 41', loa: 12.50, beam: 3.88, displacement: 8500, yearFrom: 1983, yearTo: 1989, category: 'cruiser-racer' },
  { id: 'swan-43', name: 'Swan 43', loa: 13.20, beam: 4.05, displacement: 10200, yearFrom: 1999, yearTo: 2006, category: 'cruiser-racer' },
  { id: 'swan-44', name: 'Swan 44', loa: 13.41, beam: 4.07, displacement: 10500, yearFrom: 1990, yearTo: 1998, category: 'cruiser-racer' },
  { id: 'swan-45', name: 'Swan 45', loa: 13.72, beam: 4.17, displacement: 11000, yearFrom: 2004, yearTo: 2012, category: 'cruiser-racer' },
  { id: 'swan-46', name: 'Swan 46', loa: 14.17, beam: 4.29, displacement: 12800, yearFrom: 1999, yearTo: 2008, category: 'cruiser-racer' },
  { id: 'swan-48', name: 'Swan 48', loa: 14.60, beam: 4.40, displacement: 14500, yearFrom: 2006, yearTo: 2015, category: 'cruiser-racer' },
  { id: 'swan-50', name: 'Swan 50', loa: 15.24, beam: 4.42, displacement: 14900, yearFrom: 1992, yearTo: 1998, category: 'cruiser-racer' },
  { id: 'swan-51', name: 'Swan 51', loa: 15.54, beam: 4.60, displacement: 18000, yearFrom: 2014, yearTo: null, category: 'cruiser' },
  { id: 'swan-53', name: 'Swan 53', loa: 16.15, beam: 4.73, displacement: 19500, yearFrom: 2016, yearTo: null, category: 'cruiser' },
  { id: 'swan-55', name: 'Swan 55', loa: 16.76, beam: 4.72, displacement: 20500, yearFrom: 2001, yearTo: 2010, category: 'cruiser-racer' },
  { id: 'swan-56', name: 'Swan 56', loa: 17.07, beam: 4.86, displacement: 22000, yearFrom: 2010, yearTo: null, category: 'cruiser' },
  { id: 'swan-57', name: 'Swan 57', loa: 17.37, beam: 4.88, displacement: 23500, yearFrom: 1990, yearTo: 2002, category: 'cruiser-racer' },
  { id: 'swan-59', name: 'Swan 59', loa: 17.98, beam: 5.05, displacement: 26000, yearFrom: 2003, yearTo: 2010, category: 'cruiser' },
  { id: 'swan-601', name: 'Swan 60', loa: 18.30, beam: 5.10, displacement: 28000, yearFrom: 1998, yearTo: 2005, category: 'cruiser' },
  { id: 'swan-62', name: 'Swan 62', loa: 18.90, beam: 5.22, displacement: 32000, yearFrom: 2011, yearTo: null, category: 'cruiser' },
  { id: 'swan-65', name: 'Swan 65', loa: 19.81, beam: 5.40, displacement: 38000, yearFrom: 1990, yearTo: 2005, category: 'cruiser' },
  { id: 'swan-68', name: 'Swan 68', loa: 20.73, beam: 5.55, displacement: 44000, yearFrom: 2003, yearTo: null, category: 'cruiser' },
  { id: 'swan-70', name: 'Swan 70', loa: 21.34, beam: 5.70, displacement: 47000, yearFrom: 1989, yearTo: 1998, category: 'cruiser' },
  { id: 'swan-80', name: 'Swan 80', loa: 24.38, beam: 6.10, displacement: 72000, yearFrom: 1992, yearTo: null, category: 'superyacht' },
  { id: 'swan-90', name: 'Swan 90', loa: 27.43, beam: 6.60, displacement: 110000, yearFrom: 2001, yearTo: null, category: 'superyacht' },
  { id: 'swan-100', name: 'Swan 100', loa: 30.48, beam: 7.20, displacement: 170000, yearFrom: 1995, yearTo: null, category: 'superyacht' },
  // Performance / ClubSwan range
  { id: 'clubswan-36', name: 'ClubSwan 36', loa: 10.97, beam: 3.10, displacement: 3200, yearFrom: 2019, yearTo: null, category: 'performance' },
  { id: 'clubswan-42', name: 'ClubSwan 42', loa: 12.80, beam: 3.58, displacement: 6800, yearFrom: 2017, yearTo: null, category: 'performance' },
  { id: 'clubswan-50', name: 'ClubSwan 50', loa: 15.24, beam: 4.20, displacement: 10500, yearFrom: 2017, yearTo: null, category: 'performance' },
  { id: 'clubswan-58', name: 'ClubSwan 58', loa: 17.68, beam: 4.80, displacement: 20000, yearFrom: 2020, yearTo: null, category: 'performance' },
  { id: 'novaswan-800', name: 'NovaSwan 800', loa: 24.38, beam: 6.20, displacement: 70000, yearFrom: 2020, yearTo: null, category: 'superyacht' },
]

export const SWAN_CATEGORIES = [
  { id: 'all', label: 'All Models' },
  { id: 'performance', label: 'ClubSwan / Performance' },
  { id: 'cruiser-racer', label: 'Cruiser-Racer' },
  { id: 'cruiser', label: 'Cruiser' },
  { id: 'superyacht', label: 'Superyacht' },
]

export const SYSTEM_TAGS = [
  { id: 'rig', label: 'Rig & Sails' },
  { id: 'engine', label: 'Engine & Drivetrain' },
  { id: 'electrics', label: 'Electrics & Electronics' },
  { id: 'deck', label: 'Deck & Hardware' },
  { id: 'hull', label: 'Hull & Keel' },
  { id: 'interior', label: 'Interior & Joinery' },
  { id: 'plumbing', label: 'Plumbing & Watermakers' },
  { id: 'nav', label: 'Navigation & Comms' },
  { id: 'safety', label: 'Safety Equipment' },
  { id: 'other', label: 'Other' },
]

export const USER_ROLES = [
  { id: 'owner', label: 'Owner' },
  { id: 'skipper', label: 'Skipper / Captain' },
  { id: 'gardienne', label: 'Gardienne' },
]

export const CONTACT_CATEGORIES = [
  { id: 'rigger', label: 'Rigger' },
  { id: 'sailmaker', label: 'Sailmaker' },
  { id: 'engineer', label: 'Marine Engineer' },
  { id: 'surveyor', label: 'Surveyor' },
  { id: 'chandler', label: 'Chandler' },
  { id: 'yard', label: 'Boatyard / Refit' },
  { id: 'electronics', label: 'Marine Electronics' },
  { id: 'other', label: 'Other' },
]

export const YACHT_STATUS = [
  { id: 'cruising', label: 'Cruising', color: '#22c55e' },
  { id: 'berth', label: 'On Berth', color: '#3b82f6' },
  { id: 'laidUp', label: 'Laid Up', color: '#94a3b8' },
  { id: 'refit', label: 'In Refit', color: '#f59e0b' },
  { id: 'forSale', label: 'For Sale', color: '#ef4444' },
]

// Bad language filter — basic list, expandable
export const BAD_WORDS = [
  'fuck', 'shit', 'cunt', 'bastard', 'wanker', 'twat', 'arse', 'arsehole',
  'asshole', 'bitch', 'damn', 'hell', // add more as needed
]

export function containsBadLanguage(text) {
  const lower = text.toLowerCase()
  return BAD_WORDS.some(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i')
    return regex.test(lower)
  })
}