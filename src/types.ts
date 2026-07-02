export type SearchCard = {
  id: string
  name: string
  collectorNo: string
  rarity: string
  imageUrl: string
  set: {
    id: string
    name: string
  }
}

export type CardPrice = {
  rmb: number | null
  jihuansheProductId: number | null
  updatedAt: string | null
}

export type CollectionCard = SearchCard & {
  quantity: number
  priceRmb: number | null
  priceUpdatedAt: string | null
  addedAt: string
}
