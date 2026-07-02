import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  WalletCards,
  X,
} from 'lucide-react'
import { getRmbPrice, searchCards } from './api'
import type { CardPrice, CollectionCard, SearchCard } from './types'

type Tab = 'overview' | 'search' | 'collection'

const COLLECTION_KEY = 'cardfolio-collection-v1'
const money = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' })

function formatMoney(value: number | null) {
  return value === null ? '暂无价格' : money.format(value)
}

function formatDate(value: string | null) {
  if (!value) return '尚未同步'
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  )
}

function loadCollection(): CollectionCard[] {
  try {
    return JSON.parse(localStorage.getItem(COLLECTION_KEY) || '[]')
  } catch {
    return []
  }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('overview')
  const [collection, setCollection] = useState<CollectionCard[]>(loadCollection)
  const [selectedCard, setSelectedCard] = useState<SearchCard | null>(null)
  const [selectedPrice, setSelectedPrice] = useState<CardPrice | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection)), [collection])

  const totalValue = useMemo(
    () => collection.reduce((sum, card) => sum + (card.priceRmb || 0) * card.quantity, 0),
    [collection],
  )
  const totalCards = useMemo(() => collection.reduce((sum, card) => sum + card.quantity, 0), [collection])
  const lastUpdated = useMemo(() => {
    const dates = collection.map((card) => card.priceUpdatedAt).filter(Boolean) as string[]
    return dates.sort().at(-1) || null
  }, [collection])

  async function openCard(card: SearchCard) {
    setSelectedCard(card)
    setSelectedPrice(null)
    setDetailLoading(true)
    try {
      setSelectedPrice(await getRmbPrice(card.id))
    } catch {
      setSelectedPrice({ rmb: null, jihuansheProductId: null, updatedAt: null })
    } finally {
      setDetailLoading(false)
    }
  }

  function addCard(card: SearchCard, price: CardPrice | null) {
    setCollection((current) => {
      const existing = current.find((item) => item.id === card.id)
      if (existing) {
        return current.map((item) =>
          item.id === card.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                priceRmb: price?.rmb ?? item.priceRmb,
                priceUpdatedAt: price?.updatedAt ?? item.priceUpdatedAt,
              }
            : item,
        )
      }
      return [
        {
          ...card,
          quantity: 1,
          priceRmb: price?.rmb ?? null,
          priceUpdatedAt: price?.updatedAt ?? null,
          addedAt: new Date().toISOString(),
        },
        ...current,
      ]
    })
  }

  function changeQuantity(id: string, delta: number) {
    setCollection((current) =>
      current
        .map((card) => (card.id === id ? { ...card, quantity: Math.max(0, card.quantity + delta) } : card))
        .filter((card) => card.quantity > 0),
    )
  }

  async function refreshCollection() {
    const updates = await Promise.all(
      collection.map(async (card) => {
        try {
          const price = await getRmbPrice(card.id, true)
          return { ...card, priceRmb: price.rmb, priceUpdatedAt: price.updatedAt }
        } catch {
          return card
        }
      }),
    )
    setCollection(updates)
  }

  return (
    <div className="app-shell">
      <main className="app-content">
        {tab === 'overview' && (
          <Overview
            collection={collection}
            totalValue={totalValue}
            totalCards={totalCards}
            lastUpdated={lastUpdated}
            onSearch={() => setTab('search')}
            onCollection={() => setTab('collection')}
            onOpen={(card) => openCard(card)}
          />
        )}
        {tab === 'search' && <SearchView onOpen={openCard} />}
        {tab === 'collection' && (
          <CollectionView
            collection={collection}
            totalValue={totalValue}
            onSearch={() => setTab('search')}
            onOpen={openCard}
            onChangeQuantity={changeQuantity}
            onRefresh={refreshCollection}
          />
        )}
      </main>

      <nav className="bottom-nav" aria-label="主导航">
        <NavButton active={tab === 'overview'} label="总览" onClick={() => setTab('overview')} icon={<BarChart3 />} />
        <button className={`nav-search ${tab === 'search' ? 'active' : ''}`} onClick={() => setTab('search')} aria-label="查价">
          <Search />
        </button>
        <NavButton active={tab === 'collection'} label="收藏" onClick={() => setTab('collection')} icon={<WalletCards />} />
      </nav>

      {selectedCard && (
        <CardSheet
          card={selectedCard}
          price={selectedPrice}
          loading={detailLoading}
          owned={collection.find((item) => item.id === selectedCard.id)?.quantity || 0}
          onClose={() => setSelectedCard(null)}
          onAdd={() => addCard(selectedCard, selectedPrice)}
        />
      )}
    </div>
  )
}

function PageHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {action}
    </header>
  )
}

function Overview({
  collection,
  totalValue,
  totalCards,
  lastUpdated,
  onSearch,
  onCollection,
  onOpen,
}: {
  collection: CollectionCard[]
  totalValue: number
  totalCards: number
  lastUpdated: string | null
  onSearch: () => void
  onCollection: () => void
  onOpen: (card: SearchCard) => void
}) {
  return (
    <section className="page overview-page">
      <PageHeader eyebrow="CARD FOLIO" title="我的卡册" action={<button className="avatar-button">CF</button>} />

      <article className="value-card">
        <div className="value-card-top">
          <span>收藏估值</span>
          <span className="live-pill"><i /> 集换价</span>
        </div>
        <strong>{money.format(totalValue)}</strong>
        <div className="value-meta">
          <span>{totalCards} 张卡牌</span>
          <span>更新于 {formatDate(lastUpdated)}</span>
        </div>
      </article>

      <div className="quick-grid">
        <button className="quick-card" onClick={onSearch}>
          <span className="quick-icon"><Search /></span>
          <span><b>查卡价</b><small>搜索简中卡牌</small></span>
          <ChevronRight />
        </button>
        <button className="quick-card" onClick={onCollection}>
          <span className="quick-icon"><WalletCards /></span>
          <span><b>看收藏</b><small>管理数量与估值</small></span>
          <ChevronRight />
        </button>
      </div>

      <div className="section-heading">
        <div><p className="eyebrow">COLLECTION</p><h2>最近加入</h2></div>
        {collection.length > 0 && <button onClick={onCollection}>全部 <ArrowUpRight /></button>}
      </div>

      {collection.length === 0 ? (
        <EmptyState icon={<Sparkles />} title="卡册还是空的" body="搜索第一张卡，把自己的收藏慢慢装进来。" action="开始查卡" onAction={onSearch} />
      ) : (
        <div className="recent-row">
          {collection.slice(0, 4).map((card) => (
            <button className="mini-card" key={card.id} onClick={() => onOpen(card)}>
              <img src={card.imageUrl} alt="" />
              <span>{card.name}</span>
              <b>{formatMoney(card.priceRmb)}</b>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function SearchView({ onOpen }: { onOpen: (card: SearchCard) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchCard[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    setError('')
    try {
      setResults(await searchCards(query))
    } catch (caught) {
      setResults([])
      setError(caught instanceof Error ? caught.message : '搜索失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page search-page">
      <PageHeader eyebrow="JIHUANSHE PRICE" title="查卡价" />
      <form className="search-box" onSubmit={submit}>
        <Search />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="英文名或卡牌编号" autoCapitalize="off" />
        {query && <button type="button" className="clear-button" onClick={() => setQuery('')}><X /></button>}
        <button type="submit" className="search-submit">搜索</button>
      </form>
      <p className="search-hint">简中 PTCG · 价格统一显示人民币</p>

      {!searched && !loading && (
        <div className="search-intro">
          <span><CircleDollarSign /></span>
          <h2>查到的，就是人民币</h2>
          <p>卡价读取集换社原始 RMB 数据，不显示外币换算结果。</p>
          <div className="example-chips">
            {['Charizard', 'Pikachu', '006/151'].map((item) => <button key={item} onClick={() => setQuery(item)}>{item}</button>)}
          </div>
        </div>
      )}

      {loading && <SearchSkeleton />}
      {error && <EmptyState icon={<Clock3 />} title="这次没查到" body={error} />}
      {!loading && searched && !error && results.length === 0 && (
        <EmptyState icon={<Search />} title="没有找到卡牌" body="试试英文名、编号，或减少搜索词。" />
      )}
      {!loading && results.length > 0 && (
        <div className="result-section">
          <div className="result-count">找到 {results.length} 个结果</div>
          <div className="result-grid">
            {results.map((card) => <SearchResultCard key={card.id} card={card} onOpen={() => onOpen(card)} />)}
          </div>
        </div>
      )}
    </section>
  )
}

function SearchResultCard({ card, onOpen }: { card: SearchCard; onOpen: () => void }) {
  return (
    <button className="result-card" onClick={onOpen}>
      <div className="card-image-wrap"><img src={card.imageUrl} alt={card.name} loading="lazy" /></div>
      <div className="result-card-body">
        <span className="rarity-pill">{card.rarity || '简中'}</span>
        <h3>{card.name}</h3>
        <p>{card.set?.name}</p>
        <div><span>{card.collectorNo}</span><b>查看价格 <ChevronRight /></b></div>
      </div>
    </button>
  )
}

function CollectionView({
  collection,
  totalValue,
  onSearch,
  onOpen,
  onChangeQuantity,
  onRefresh,
}: {
  collection: CollectionCard[]
  totalValue: number
  onSearch: () => void
  onOpen: (card: SearchCard) => void
  onChangeQuantity: (id: string, delta: number) => void
  onRefresh: () => Promise<void>
}) {
  const [refreshing, setRefreshing] = useState(false)
  async function refresh() {
    setRefreshing(true)
    await onRefresh()
    setRefreshing(false)
  }

  return (
    <section className="page collection-page">
      <PageHeader
        eyebrow="MY COLLECTION"
        title="收藏"
        action={
          collection.length > 0 ? (
            <button className="icon-button" onClick={refresh} disabled={refreshing} aria-label="更新价格">
              <RefreshCw className={refreshing ? 'spinning' : ''} />
            </button>
          ) : undefined
        }
      />

      <div className="collection-summary">
        <span>当前总估值</span>
        <strong>{money.format(totalValue)}</strong>
        <small>按最新可用集换价计算</small>
      </div>

      {collection.length === 0 ? (
        <EmptyState icon={<WalletCards />} title="还没有收藏" body="查到卡价后，点一下就能加入自己的卡册。" action="去查卡" onAction={onSearch} />
      ) : (
        <div className="collection-list">
          {collection.map((card) => (
            <article className="collection-item" key={card.id}>
              <button className="collection-main" onClick={() => onOpen(card)}>
                <img src={card.imageUrl} alt="" />
                <span>
                  <b>{card.name}</b>
                  <small>{card.collectorNo} · {card.set?.name}</small>
                  <em>{formatMoney(card.priceRmb)} / 张</em>
                </span>
              </button>
              <div className="collection-item-bottom">
                <strong>{money.format((card.priceRmb || 0) * card.quantity)}</strong>
                <div className="stepper">
                  <button onClick={() => onChangeQuantity(card.id, -1)}><Minus /></button>
                  <span>{card.quantity}</span>
                  <button onClick={() => onChangeQuantity(card.id, 1)}><Plus /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function CardSheet({
  card,
  price,
  loading,
  owned,
  onClose,
  onAdd,
}: {
  card: SearchCard
  price: CardPrice | null
  loading: boolean
  owned: number
  onClose: () => void
  onAdd: () => void
}) {
  const [added, setAdded] = useState(false)
  function add() {
    onAdd()
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1200)
  }

  return (
    <div className="sheet-layer" role="dialog" aria-modal="true">
      <button className="sheet-backdrop" onClick={onClose} aria-label="关闭" />
      <section className="card-sheet">
        <div className="sheet-handle" />
        <button className="sheet-close" onClick={onClose}><X /></button>
        <div className="sheet-card-image"><img src={card.imageUrl} alt={card.name} /></div>
        <span className="rarity-pill">{card.rarity || '简中'}</span>
        <h2>{card.name}</h2>
        <p>{card.set?.name} · {card.collectorNo}</p>

        <div className="price-panel">
          <div>
            <span>当前集换价</span>
            {loading ? <i className="price-loading" /> : <strong>{formatMoney(price?.rmb ?? null)}</strong>}
          </div>
          <div className="price-source"><i /> RMB</div>
          <small><Clock3 /> 数据更新于 {formatDate(price?.updatedAt || null)}</small>
        </div>

        <button className={`primary-button ${added ? 'success' : ''}`} onClick={add} disabled={loading}>
          {added ? <><Check /> 已加入</> : <><Plus /> {owned ? `再加一张 · 已有 ${owned}` : '加入收藏'}</>}
        </button>
      </section>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  body,
  action,
  onAction,
}: {
  icon: React.ReactNode
  title: string
  body: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="empty-state">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action && <button onClick={onAction}>{action}</button>}
    </div>
  )
}

function SearchSkeleton() {
  return (
    <div className="result-grid skeleton-grid">
      {[0, 1, 2, 3].map((item) => <div className="skeleton-card" key={item}><i /><span /><span /></div>)}
    </div>
  )
}

function NavButton({ active, label, onClick, icon }: { active: boolean; label: string; onClick: () => void; icon: React.ReactNode }) {
  return <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span></button>
}
