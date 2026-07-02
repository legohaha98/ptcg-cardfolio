import type { CardPrice, SearchCard } from './types'

const API_ROOT = 'https://kyocards.com/shopping-cards/v1'
const PRICE_CACHE_KEY = 'cardfolio-price-cache-v1'
const CACHE_TTL = 6 * 60 * 60 * 1000

type CachedPrice = CardPrice & { cachedAt: number }

function readPriceCache(): Record<string, CachedPrice> {
  try {
    return JSON.parse(localStorage.getItem(PRICE_CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}

function writePriceCache(cache: Record<string, CachedPrice>) {
  localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(cache))
}

export async function searchCards(query: string): Promise<SearchCard[]> {
  const params = new URLSearchParams({
    skip: '0',
    take: '16',
    productLine: 'PKCN',
    productType: 'SING',
    search: query.trim(),
  })
  const response = await fetch(`${API_ROOT}/card-queries?${params}`)
  if (!response.ok) throw new Error('暂时无法搜索卡牌')
  const payload = await response.json()
  return Array.isArray(payload.data) ? payload.data : []
}

export async function getRmbPrice(cardId: string, force = false): Promise<CardPrice> {
  const cache = readPriceCache()
  const cached = cache[cardId]
  if (!force && cached && Date.now() - cached.cachedAt < CACHE_TTL) return cached

  const response = await fetch(`${API_ROOT}/cards/${encodeURIComponent(cardId)}/price/single`)
  if (!response.ok) throw new Error('暂时无法获取价格')
  const payload = await response.json()
  const source = payload?.data?.metadata?.card
  const parsed = Number(source?.jihuansheMarketPrice)
  const result: CardPrice = {
    rmb: Number.isFinite(parsed) && parsed >= 0 ? parsed : null,
    jihuansheProductId: Number(source?.jihuansheProductId) || null,
    updatedAt: source?.updatedAt || null,
  }

  cache[cardId] = { ...result, cachedAt: Date.now() }
  writePriceCache(cache)
  return result
}
