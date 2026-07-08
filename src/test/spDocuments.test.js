import { describe, it, expect } from 'vitest'
import { getDocUrl, docFromArray, extractDocuments, mapProviderToRequest, flattenDocs } from '../utils/spDocuments'

// ─── getDocUrl ────────────────────────────────────────────────────────────────

describe('getDocUrl', () => {
  it('returns null for null input', () => {
    expect(getDocUrl(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(getDocUrl(undefined)).toBeNull()
  })

  it('returns the string directly when given a plain URL', () => {
    expect(getDocUrl('https://s3.amazonaws.com/bucket/file.pdf')).toBe('https://s3.amazonaws.com/bucket/file.pdf')
  })

  it('extracts url from { url } object', () => {
    expect(getDocUrl({ url: 'https://s3.example.com/doc.pdf' })).toBe('https://s3.example.com/doc.pdf')
  })

  it('extracts fileUrl as fallback', () => {
    expect(getDocUrl({ fileUrl: 'https://cdn.example.com/doc.pdf' })).toBe('https://cdn.example.com/doc.pdf')
  })

  it('extracts path as fallback', () => {
    expect(getDocUrl({ path: '/uploads/doc.pdf' })).toBe('/uploads/doc.pdf')
  })

  it('extracts downloadUrl as last fallback', () => {
    expect(getDocUrl({ downloadUrl: 'https://download.example.com/doc.pdf' })).toBe('https://download.example.com/doc.pdf')
  })

  it('returns null when object has no recognised url field', () => {
    expect(getDocUrl({ something: 'else' })).toBeNull()
  })
})

// ─── docFromArray ─────────────────────────────────────────────────────────────

describe('docFromArray', () => {
  const docs = [
    { type: 'NATIONAL_ID', url: 'https://s3.example.com/national.pdf' },
    { type: 'INSURANCE', url: 'https://s3.example.com/insurance.pdf' },
    { type: 'BUSINESS_LICENSE', url: 'https://s3.example.com/license.pdf' },
    { type: 'CERTIFICATION', url: 'https://s3.example.com/cert.pdf' },
  ]

  it('finds document by exact type keyword', () => {
    expect(docFromArray(docs, ['NATIONAL'])).toBe('https://s3.example.com/national.pdf')
  })

  it('finds document by partial type keyword (case-insensitive)', () => {
    expect(docFromArray(docs, ['insur'])).toBe('https://s3.example.com/insurance.pdf')
  })

  it('finds document by one of multiple keywords', () => {
    expect(docFromArray(docs, ['TRADE', 'BUSINESS', 'LICENSE'])).toBe('https://s3.example.com/license.pdf')
  })

  it('returns null when no keyword matches', () => {
    expect(docFromArray(docs, ['PASSPORT'])).toBeNull()
  })

  it('returns null for non-array input', () => {
    expect(docFromArray({}, ['NATIONAL'])).toBeNull()
    expect(docFromArray(null, ['NATIONAL'])).toBeNull()
  })

  it('returns null for empty array', () => {
    expect(docFromArray([], ['NATIONAL'])).toBeNull()
  })
})

// ─── extractDocuments ─────────────────────────────────────────────────────────

describe('extractDocuments — object shape', () => {
  it('extracts governmentId from camelCase field', () => {
    const result = extractDocuments({ governmentId: 'https://s3.example.com/gov.pdf' })
    expect(result.governmentId).toBe('https://s3.example.com/gov.pdf')
  })

  it('extracts governmentId from snake_case field', () => {
    const result = extractDocuments({ national_id: 'https://s3.example.com/nid.pdf' })
    expect(result.governmentId).toBe('https://s3.example.com/nid.pdf')
  })

  it('extracts certification', () => {
    const result = extractDocuments({ certification: 'https://s3.example.com/cert.pdf' })
    expect(result.certification).toBe('https://s3.example.com/cert.pdf')
  })

  it('extracts insurance', () => {
    const result = extractDocuments({ insuranceCertificate: 'https://s3.example.com/ins.pdf' })
    expect(result.insurance).toBe('https://s3.example.com/ins.pdf')
  })

  it('extracts businessLicense from commercialLicense', () => {
    const result = extractDocuments({ commercialLicense: 'https://s3.example.com/biz.pdf' })
    expect(result.businessLicense).toBe('https://s3.example.com/biz.pdf')
  })

  it('returns null for missing fields', () => {
    const result = extractDocuments({})
    expect(result.governmentId).toBeNull()
    expect(result.certification).toBeNull()
    expect(result.insurance).toBeNull()
    expect(result.businessLicense).toBeNull()
  })

  it('extracts urls from S3 object values', () => {
    const result = extractDocuments({ governmentId: { url: 'https://s3.example.com/gov.pdf' } })
    expect(result.governmentId).toBe('https://s3.example.com/gov.pdf')
  })
})

describe('extractDocuments — array shape', () => {
  const arr = [
    { type: 'NATIONAL_ID', url: 'https://s3.example.com/national.pdf' },
    { type: 'INSURANCE_CERTIFICATE', url: 'https://s3.example.com/ins.pdf' },
    { type: 'BUSINESS_LICENSE', url: 'https://s3.example.com/biz.pdf' },
    { type: 'CERTIFICATION', url: 'https://s3.example.com/cert.pdf' },
  ]

  it('extracts governmentId from NATIONAL_ID array entry', () => {
    expect(extractDocuments(arr).governmentId).toBe('https://s3.example.com/national.pdf')
  })

  it('extracts insurance from INSURANCE_CERTIFICATE array entry', () => {
    expect(extractDocuments(arr).insurance).toBe('https://s3.example.com/ins.pdf')
  })

  it('extracts businessLicense from BUSINESS_LICENSE array entry', () => {
    expect(extractDocuments(arr).businessLicense).toBe('https://s3.example.com/biz.pdf')
  })

  it('extracts certification from CERTIFICATION array entry', () => {
    expect(extractDocuments(arr).certification).toBe('https://s3.example.com/cert.pdf')
  })
})

// ─── mapProviderToRequest ─────────────────────────────────────────────────────

describe('mapProviderToRequest', () => {
  it('maps flat API response correctly', () => {
    const item = {
      id: 'abc-123',
      name: 'Ahmed Ali',
      email: 'ahmed@example.com',
      phone: '+966500000000',
      status: 'PENDING',
      zone: 'Riyadh',
      created_at: '2026-01-01',
      documents: { governmentId: 'https://s3.example.com/gov.pdf' },
      selectedServices: [{ id: 'svc-1' }],
    }
    const result = mapProviderToRequest(item)
    expect(result.id).toBe('abc-123')
    expect(result.fullName).toBe('Ahmed Ali')
    expect(result.email).toBe('ahmed@example.com')
    expect(result.status).toBe('PENDING')
    expect(result.documents.governmentId).toBe('https://s3.example.com/gov.pdf')
    expect(result.serviceIds).toEqual(['svc-1'])
  })

  it('maps nested bio/documents structure', () => {
    const item = {
      id: 'xyz-456',
      bio: { name: 'Sara Khan', email: 'sara@example.com', phone: '+966511111111', status: 'PENDING' },
      header: { zone: 'Jeddah' },
      documents: { nationalId: 'https://s3.example.com/nid.pdf', insurance: 'https://s3.example.com/ins.pdf' },
      selectedServices: [],
    }
    const result = mapProviderToRequest(item)
    expect(result.fullName).toBe('Sara Khan')
    expect(result.zone).toBe('Jeddah')
    expect(result.documents.governmentId).toBe('https://s3.example.com/nid.pdf')
    expect(result.documents.insurance).toBe('https://s3.example.com/ins.pdf')
  })

  it('uses _id when id is missing', () => {
    const item = { _id: 'mongo-id', name: 'Test', email: 'x@x.com', documents: {} }
    expect(mapProviderToRequest(item).id).toBe('mongo-id')
  })

  it('returns fallback dashes for missing personal fields', () => {
    const result = mapProviderToRequest({ id: '1', documents: {} })
    expect(result.fullName).toBe('—')
    expect(result.email).toBe('—')
    expect(result.phone).toBe('—')
  })

  it('handles documents as array', () => {
    const item = {
      id: 'arr-1',
      name: 'Test',
      email: 't@t.com',
      documents: [
        { type: 'NATIONAL_ID', url: 'https://s3.example.com/gov.pdf' },
        { type: 'INSURANCE', url: 'https://s3.example.com/ins.pdf' },
      ],
    }
    const result = mapProviderToRequest(item)
    expect(result.documents.governmentId).toBe('https://s3.example.com/gov.pdf')
    expect(result.documents.insurance).toBe('https://s3.example.com/ins.pdf')
  })
})

// ─── flattenDocs ──────────────────────────────────────────────────────────────

describe('flattenDocs', () => {
  it('extracts documents from top-level documents field', () => {
    const details = { documents: { governmentId: 'https://s3.example.com/gov.pdf' } }
    expect(flattenDocs(details).governmentId).toBe('https://s3.example.com/gov.pdf')
  })

  it('extracts documents from bio.documents path', () => {
    const details = { bio: { documents: { insurance: 'https://s3.example.com/ins.pdf' } } }
    expect(flattenDocs(details).insurance).toBe('https://s3.example.com/ins.pdf')
  })

  it('returns null values when details has no documents', () => {
    const result = flattenDocs({})
    expect(result.governmentId).toBeNull()
    expect(result.businessLicense).toBeNull()
  })

  it('handles null/undefined gracefully', () => {
    expect(flattenDocs(null).governmentId).toBeNull()
    expect(flattenDocs(undefined).governmentId).toBeNull()
  })
})
