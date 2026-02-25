/*
* <license header>
*/

import queryTemplate from '../../query.json'
import actions from './config.json'
import actionWebInvoke from './utils.js'

const OFFER_ACTION_URL = actions.offerapi || actions['local-offer-app/offerapi'] || '/api/v1/web/local-offer-app/offerapi'

const form = document.getElementById('offer-form')
const offerPathInput = document.getElementById('offerPath')
const statusText = document.getElementById('status')

const webBanner = document.getElementById('web-banner')
const splitBanner = document.getElementById('split-banner')
const splitLeft = document.getElementById('split-left')
const splitRight = document.getElementById('split-right')
const splitLogo = document.getElementById('split-logo')

const webPreTitle = document.getElementById('web-pre-title')
const webHeadline = document.getElementById('web-headline')
const webDetail = document.getElementById('web-detail')
const webCta = document.getElementById('web-cta')

const splitPreTitle = document.getElementById('split-pre-title')
const splitHeadline = document.getElementById('split-headline')
const splitDetail = document.getElementById('split-detail')
const splitCta = document.getElementById('split-cta')

function setStatus (message, isError = false) {
  statusText.textContent = message
  statusText.style.color = isError ? '#a42323' : '#3f4a55'
}

function setBannerImage (url) {
  const safeUrl = url || ''
  webBanner.style.backgroundImage = safeUrl ? `url("${safeUrl}")` : 'none'
  splitLeft.style.backgroundImage = safeUrl ? `url("${safeUrl}")` : 'none'
}

function getAssetUrl (asset) {
  if (!asset) {
    return ''
  }

  if (typeof asset === 'string') {
    return asset.trim()
  }

  return asset._publishUrl || asset.url || asset.src || ''
}

function setSplitLogo (logoUrl) {
  const safeUrl = typeof logoUrl === 'string' ? logoUrl.trim() : ''
  const hasLogo = Boolean(safeUrl)

  splitBanner.classList.toggle('no-logo', !hasLogo)
  splitRight.classList.toggle('is-transparent', !hasLogo)
  splitLogo.alt = hasLogo ? 'Offer logo' : ''

  if (hasLogo) {
    splitLogo.src = safeUrl
  } else {
    splitLogo.removeAttribute('src')
  }
}

function setTextContent (element, value, fallback = '') {
  element.textContent = value || fallback
}

function setCta (element, text, href) {
  element.textContent = text || 'See More'
  element.href = href || '#'
  element.target = href ? '_blank' : '_self'
}

function getDetailText (detail) {
  if (!detail) {
    return ''
  }

  if (typeof detail === 'string') {
    return detail
  }

  return detail.plaintext || detail.html || ''
}

function mapOfferToUi (offer) {
  const preTitle = offer.preTitle || ''
  const headline = offer.headline || ''
  const detail = getDetailText(offer.detail)
  const ctaText = offer.callToAction || 'See More'
  const ctaUrl = offer.ctaUrl || ''
  const heroImage = getAssetUrl(offer.heroImage)
  const logoImage = getAssetUrl(offer.logo)

  setTextContent(webPreTitle, preTitle)
  setTextContent(webHeadline, headline)
  setTextContent(webDetail, detail)
  setCta(webCta, ctaText, ctaUrl)

  setTextContent(splitPreTitle, preTitle)
  setTextContent(splitHeadline, headline)
  setTextContent(splitDetail, detail)
  setCta(splitCta, ctaText, ctaUrl)

  setBannerImage(heroImage)
  setSplitLogo(logoImage)
}

function extractOffer (payload) {
  return payload?.response?.data?.offerByPath?.item || null
}

function extractError (payload, fallback) {
  return payload?.details?.[0]?.message || payload?.error || fallback
}

function getOfferPathFromUrl () {
  const params = new URLSearchParams(window.location.search)
  const value = params.get('offerPath')
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function updateOfferPathInUrl (offerPath) {
  const url = new URL(window.location.href)
  url.searchParams.set('offerPath', offerPath)
  window.history.replaceState({}, '', url)
}

async function loadOffer (offerPath) {
  setStatus('Loading offer...')

  try {
    const variables = {
      ...queryTemplate,
      offerPath
    }

    const payload = await actionWebInvoke(OFFER_ACTION_URL, {}, variables, { method: 'POST' })
    if (payload?.error) {
      throw new Error(extractError(payload, 'Failed to load offer'))
    }

    const offer = extractOffer(payload)
    if (!offer) {
      throw new Error(extractError(payload, 'No offer item in service response'))
    }

    mapOfferToUi(offer)
    setStatus(`Loaded offerPath: ${payload.request?.variables?.offerPath || offerPath}`)
  } catch (error) {
    setStatus(error.message || 'Failed to load offer', true)
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault()
  const value = offerPathInput.value.trim()
  if (!value) {
    setStatus('Please provide a valid offerPath', true)
    return
  }
  updateOfferPathInUrl(value)
  loadOffer(value)
})

const initialOfferPath = getOfferPathFromUrl() || offerPathInput.value.trim()
offerPathInput.value = initialOfferPath
loadOffer(initialOfferPath)
