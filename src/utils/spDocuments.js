/**
 * Utilities for parsing service-provider document fields from the backend API.
 * Extracted as pure functions so they can be unit-tested independently.
 */

/** Extract a usable URL from a document field.
 *  Handles: plain string, S3 object { url }, or null/undefined. */
export function getDocUrl(val) {
  if (!val) return null
  if (typeof val === 'string') return val
  return val.url || val.file_url || val.fileUrl || val.path || val.s3Url || val.downloadUrl || null
}

/** When the documents field is an array like [{type:'NATIONAL_ID', url:'...'}],
 *  find the first entry whose type contains any of the given keywords. */
export function docFromArray(arr, keywords) {
  if (!Array.isArray(arr)) return null
  const found = arr.find((d) => {
    const t = (d.type || d.documentType || d.name || '').toUpperCase()
    return keywords.some((k) => t.includes(k.toUpperCase()))
  })
  return found ? getDocUrl(found) : null
}

/** Extract the four standard document URLs from a raw API documents field.
 *  Handles both object (keyed) and array [{type, url}] shapes. */
export function extractDocuments(rawDocs, item = {}) {
  const isArray = Array.isArray(rawDocs)
  const docs = isArray ? {} : (rawDocs || {})

  return {
    governmentId: isArray
      ? docFromArray(rawDocs, ['NATIONAL', 'GOVT', 'ID', 'IQAMA', 'PASSPORT', 'GOVERNMENT'])
      : getDocUrl(docs.governmentId || docs.national_id || docs.nationalId || docs.iqama || docs.passport || docs.nationalIdDocument || item.governmentId),

    certification: isArray
      ? docFromArray(rawDocs, ['CERTIFICATION', 'COMMERCIAL_REG', 'COMMERCIAL', 'REGISTRATION'])
      : getDocUrl(docs.certification || docs.certificateUrl || docs.commercialRegistration || docs.commercial_registration || item.certification),

    insurance: isArray
      ? docFromArray(rawDocs, ['INSUR'])
      : getDocUrl(docs.insurance || docs.insuranceCertificate || docs.insurance_certificate || docs.insurancePolicy || item.insurance),

    businessLicense: isArray
      ? docFromArray(rawDocs, ['LICENSE', 'BUSINESS', 'TRADE', 'VAT'])
      : getDocUrl(docs.businessLicense || docs.business_license || docs.commercial_license || docs.commercialLicense || docs.tradeLicense || item.businessLicense),

    iqama: isArray
      ? docFromArray(rawDocs, ['IQAMA'])
      : getDocUrl(docs.iqama || item.iqama),

    passport: isArray
      ? docFromArray(rawDocs, ['PASSPORT'])
      : getDocUrl(docs.passport || item.passport),
  }
}

/** Map a raw provider API response item to the SP request UI shape. */
export function mapProviderToRequest(item) {
  if (!item) return {}

  const bio = item.bio || {}
  const header = item.header || {}
  const settings = item.settings || {}
  const user = item.user || {}
  const profile = item.profile || {}
  const rawDocs = item.documents ?? item.docs ?? bio.documents ?? {}

  // Name fallbacks: check top-level, bio, header, user, and profile objects
  const name = item.fullName || item.full_name || item.name || 
               bio.name || bio.fullName || bio.full_name ||
               user.fullName || user.full_name || user.name ||
               (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : null) ||
               header.name || profile.name || profile.fullName || '—'

  // Email fallbacks
  const email = item.email || bio.email || user.email || profile.email || '—'

  // Phone fallbacks
  const phone = item.phone || bio.phone || user.phone || profile.phone || '—'

  // Zone fallbacks: handle both strings and objects
  const zoneRaw = item.zone || header.zone || bio.zone || user.zone || profile.zone || 'N/A'
  const zone = typeof zoneRaw === 'object' 
    ? (zoneRaw.name_en || zoneRaw.name || zoneRaw.id || zoneRaw._id || 'N/A') 
    : zoneRaw

  const status = item.provider_status || item.status || bio.status || settings.accountStatus || user.status || 'Pending'

  // Date fallbacks
  const submittedDate = item.submitted_at || item.submittedDate || item.created_at || item.joinDate ||
                        bio.joinDate || bio.created_at ||
                        user.created_at || '—'

  // Service extraction: handle array of IDs or array of objects
  const rawServices = item.selectedServices || item.services || user.selectedServices || profile.services || []
  const serviceIds = Array.isArray(rawServices)
    ? rawServices.map(s => typeof s === 'string' ? s : (s.id || s._id)).filter(Boolean)
    : []

  return {
    id: item.id || item._id,
    fullName: name,
    email,
    phone,
    status,
    submittedDate,
    zone,
    personalInfo: { fullName: name, email, phone, zone },
    documents: extractDocuments(rawDocs, item),
    serviceIds,
    services: Array.isArray(rawServices) ? rawServices : [],
    selectedServices: Array.isArray(rawServices) && typeof rawServices[0] === 'object' ? rawServices : [],
  }
}

/** Flatten nested document fields from a provider detail API response. */
export function flattenDocs(details) {
  const rawDocs = details?.documents || details?.bio?.documents || details?.docs || {}
  return extractDocuments(rawDocs)
}
