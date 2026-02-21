'use client'

import { useState, useEffect, useCallback } from 'react'
import { Package, Search, AlertTriangle, TrendingUp, Boxes, Plus, Edit2, PlusCircle, Trash2, X, ChevronDown } from 'lucide-react'
import Modal from '@/components/Modal'
import Pagination from '@/components/Pagination'

interface Product {
  id: string
  sku: string | null
  name: string
  category: string
  brand: string | null
  cost_price: number | null
  sell_price: number | null
  markup_pct: number | null
  stock_on_hand: number
  stock_min: number
  stock_max: number
  unit: string
  expiry_date: string | null
  notes: string | null
  is_active: boolean
}

interface Stats {
  total: number
  totalOnHand: number
  lowStockCount: number
  totalValue: number
}

const CATEGORIES = [
  'TCM / Chinese Medicine',
  'Ruffwear Gear',
  'Orthotics & Braces',
  'Mobility Aids',
  'Pet Food',
  'Supplies & Equipment',
  'Grooming & Skin Care',
  'Supplements',
  'Pet Accessories',
  'Medications',
  'Other',
]

const CATEGORY_COLORS: Record<string, string> = {
  'TCM / Chinese Medicine': 'bg-purple-100 text-purple-700',
  'Ruffwear Gear': 'bg-orange-100 text-orange-700',
  'Orthotics & Braces': 'bg-blue-100 text-blue-700',
  'Mobility Aids': 'bg-teal-100 text-teal-700',
  'Pet Food': 'bg-green-100 text-green-700',
  'Supplies & Equipment': 'bg-gray-100 text-gray-700',
  'Grooming & Skin Care': 'bg-pink-100 text-pink-700',
  'Supplements': 'bg-indigo-100 text-indigo-700',
  'Pet Accessories': 'bg-yellow-100 text-yellow-700',
  'Medications': 'bg-red-100 text-red-700',
  'Other': 'bg-gray-100 text-gray-600',
}

const ADJUST_TYPES = [
  { value: 'restock', label: 'Restock (+)' },
  { value: 'sale', label: 'Sale (-)' },
  { value: 'adjustment', label: 'Manual Adjustment' },
  { value: 'return', label: 'Return (+)' },
  { value: 'write_off', label: 'Write Off (-)' },
]

const emptyForm = {
  name: '', category: 'Other', sku: '', brand: '', cost_price: '', sell_price: '',
  markup_pct: '', stock_on_hand: '0', stock_min: '1', stock_max: '10',
  unit: 'each', expiry_date: '', notes: ''
}

export default function InventoryPage() {
  const [items, setItems] = useState<Product[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, totalOnHand: 0, lowStockCount: 0, totalValue: 0 })
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)

  const [editItem, setEditItem] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [showAddEdit, setShowAddEdit] = useState(false)

  const [adjustItem, setAdjustItem] = useState<Product | null>(null)
  const [adjustForm, setAdjustForm] = useState({ type: 'restock', quantity: '', notes: '' })
  const [adjusting, setAdjusting] = useState(false)

  const [deleteItem, setDeleteItem] = useState<Product | null>(null)

  const fetchItems = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterCategory) params.set('category', filterCategory)
      if (lowStockOnly) params.set('low_stock', 'true')
      params.set('page', String(p))
      params.set('limit', String(PAGE_SIZE))

      const res = await fetch(`/api/inventory?${params}`)
      const data = await res.json()
      setItems(data.items || [])
      setTotal(data.total || 0)
      setStats(data.stats || { total: 0, totalOnHand: 0, lowStockCount: 0, totalValue: 0 })
      setCategories(data.categories || [])
    } finally {
      setLoading(false)
    }
  }, [search, filterCategory, lowStockOnly, page])

  useEffect(() => { setPage(1) }, [search, filterCategory, lowStockOnly])

  useEffect(() => { fetchItems() }, [fetchItems])

  function openAdd() {
    setEditItem(null)
    setForm(emptyForm)
    setShowAddEdit(true)
  }

  function openEdit(item: Product) {
    setEditItem(item)
    setForm({
      name: item.name,
      category: item.category,
      sku: item.sku || '',
      brand: item.brand || '',
      cost_price: item.cost_price?.toString() || '',
      sell_price: item.sell_price?.toString() || '',
      markup_pct: item.markup_pct?.toString() || '',
      stock_on_hand: item.stock_on_hand.toString(),
      stock_min: item.stock_min.toString(),
      stock_max: item.stock_max.toString(),
      unit: item.unit || 'each',
      expiry_date: item.expiry_date || '',
      notes: item.notes || '',
    })
    setShowAddEdit(true)
  }

  async function saveItem() {
    if (!form.name) return
    setSaving(true)
    try {
      const url = editItem ? `/api/inventory/${editItem.id}` : '/api/inventory'
      const method = editItem ? 'PATCH' : 'POST'
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      setShowAddEdit(false)
      fetchItems()
    } finally {
      setSaving(false)
    }
  }

  function openAdjust(item: Product) {
    setAdjustItem(item)
    setAdjustForm({ type: 'restock', quantity: '', notes: '' })
  }

  async function doAdjust() {
    if (!adjustItem || !adjustForm.quantity) return
    setAdjusting(true)
    try {
      const qty = parseFloat(adjustForm.quantity)
      const isNegative = ['sale', 'write_off'].includes(adjustForm.type)
      await fetch(`/api/inventory/${adjustItem.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: adjustForm.type,
          quantity: isNegative ? -Math.abs(qty) : Math.abs(qty),
          notes: adjustForm.notes,
        })
      })
      setAdjustItem(null)
      fetchItems()
    } finally {
      setAdjusting(false)
    }
  }

  async function doDelete() {
    if (!deleteItem) return
    await fetch(`/api/inventory/${deleteItem.id}`, { method: 'DELETE' })
    setDeleteItem(null)
    fetchItems()
  }

  function calcMarkup() {
    const cost = parseFloat(form.cost_price)
    const sell = parseFloat(form.sell_price)
    if (cost > 0 && sell > 0) {
      const markup = ((sell - cost) / cost * 100).toFixed(2)
      setForm(f => ({ ...f, markup_pct: markup }))
    }
  }

  const stockColor = (item: Product) => {
    if (item.stock_on_hand <= 0) return 'text-red-600 font-bold'
    if (item.stock_on_hand <= item.stock_min) return 'text-orange-500 font-semibold'
    return 'text-green-600 font-semibold'
  }

  const adjustQty = parseFloat(adjustForm.quantity) || 0
  const isNegativeAdjust = ['sale', 'write_off'].includes(adjustForm.type)
  const newStock = adjustItem ? adjustItem.stock_on_hand + (isNegativeAdjust ? -Math.abs(adjustQty) : Math.abs(adjustQty)) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stats.total} products · SGD {stats.totalValue.toLocaleString('en-SG', { minimumFractionDigits: 2 })} stock value</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><Package className="w-5 h-5 text-blue-500" /></div>
            <div>
              <p className="text-xs text-gray-500">Total Products</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg"><Boxes className="w-5 h-5 text-green-500" /></div>
            <div>
              <p className="text-xs text-gray-500">Units in Stock</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalOnHand.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className={`bg-white rounded-xl border p-4 ${stats.lowStockCount > 0 ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg"><AlertTriangle className="w-5 h-5 text-orange-500" /></div>
            <div>
              <p className="text-xs text-gray-500">Low Stock Items</p>
              <p className={`text-xl font-bold ${stats.lowStockCount > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{stats.lowStockCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg"><TrendingUp className="w-5 h-5 text-purple-500" /></div>
            <div>
              <p className="text-xs text-gray-500">Stock Value (Cost)</p>
              <p className="text-xl font-bold text-gray-900">S${stats.totalValue.toLocaleString('en-SG', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9 w-full"
            placeholder="Search products, SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <select
            className="input appearance-none pr-8 min-w-[180px]"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <button
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            lowStockOnly ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Low Stock
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-pink" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Sell</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Markup</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">On Hand</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Min/Max</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900 leading-tight">{item.name}</p>
                        {(item.sku || item.notes) && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {item.sku && <span className="mr-2">#{item.sku}</span>}
                            {item.notes && <span>{item.notes}</span>}
                          </p>
                        )}
                        {item.expiry_date && (
                          <p className="text-xs text-orange-500 mt-0.5">Exp: {item.expiry_date}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[item.category] || 'bg-gray-100 text-gray-600'}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {item.cost_price != null ? `$${item.cost_price.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {item.sell_price != null ? `$${item.sell_price.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {item.markup_pct != null ? `${item.markup_pct.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={stockColor(item)}>
                        {item.stock_on_hand % 1 === 0 ? item.stock_on_hand : item.stock_on_hand.toFixed(1)}
                      </span>
                      {item.stock_on_hand <= item.stock_min && item.stock_on_hand > 0 && (
                        <span className="ml-1 text-orange-400 text-xs">⚠</span>
                      )}
                      {item.stock_on_hand <= 0 && (
                        <span className="ml-1 text-red-400 text-xs">✗</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-400">
                      {item.stock_min} / {item.stock_max}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openAdjust(item)}
                          className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded transition-colors"
                          title="Adjust Stock"
                        >
                          <PlusCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteItem(item)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={p => { setPage(p); fetchItems(p) }} />
      </div>

      {/* Add / Edit Modal */}
      <Modal open={showAddEdit} onClose={() => setShowAddEdit(false)} title={editItem ? 'Edit Product' : 'Add Product'}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Product Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Antinol Rapid 90 Caps" />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">SKU / Item Number</label>
              <input className="input" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. 1803" />
            </div>
            <div>
              <label className="label">Cost Price (SGD)</label>
              <input className="input" type="number" step="0.01" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))} onBlur={calcMarkup} placeholder="0.00" />
            </div>
            <div>
              <label className="label">Sell Price (SGD)</label>
              <input className="input" type="number" step="0.01" value={form.sell_price} onChange={e => setForm(f => ({ ...f, sell_price: e.target.value }))} onBlur={calcMarkup} placeholder="0.00" />
            </div>
            <div>
              <label className="label">Markup %</label>
              <input className="input" type="number" step="0.01" value={form.markup_pct} onChange={e => setForm(f => ({ ...f, markup_pct: e.target.value }))} placeholder="Auto-calculated" />
            </div>
            <div>
              <label className="label">On Hand</label>
              <input className="input" type="number" step="0.1" value={form.stock_on_hand} onChange={e => setForm(f => ({ ...f, stock_on_hand: e.target.value }))} />
            </div>
            <div>
              <label className="label">Min Stock</label>
              <input className="input" type="number" step="1" value={form.stock_min} onChange={e => setForm(f => ({ ...f, stock_min: e.target.value }))} />
            </div>
            <div>
              <label className="label">Max Stock</label>
              <input className="input" type="number" step="1" value={form.stock_max} onChange={e => setForm(f => ({ ...f, stock_max: e.target.value }))} />
            </div>
            <div>
              <label className="label">Expiry Date</label>
              <input className="input" type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes (Bin No, Supplier, etc.)</label>
              <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Bin: A3, Supplier: XYZ" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowAddEdit(false)} className="btn-secondary">Cancel</button>
            <button onClick={saveItem} disabled={saving || !form.name} className="btn-primary">
              {saving ? 'Saving...' : editItem ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal open={!!adjustItem} onClose={() => setAdjustItem(null)} title="Adjust Stock">
        {adjustItem && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-semibold text-gray-900">{adjustItem.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Current stock: <span className={`font-bold ${stockColor(adjustItem)}`}>{adjustItem.stock_on_hand}</span>
              </p>
            </div>
            <div>
              <label className="label">Adjustment Type</label>
              <select className="input" value={adjustForm.type} onChange={e => setAdjustForm(f => ({ ...f, type: e.target.value }))}>
                {ADJUST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Quantity</label>
              <input
                className="input"
                type="number"
                step="1"
                min="0"
                value={adjustForm.quantity}
                onChange={e => setAdjustForm(f => ({ ...f, quantity: e.target.value }))}
                placeholder="Enter quantity"
              />
            </div>
            {adjustForm.quantity && (
              <div className={`text-sm p-2 rounded-lg ${newStock < 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                New stock: <span className="font-bold">{newStock}</span>
              </div>
            )}
            <div>
              <label className="label">Notes (optional)</label>
              <input className="input" value={adjustForm.notes} onChange={e => setAdjustForm(f => ({ ...f, notes: e.target.value }))} placeholder="Reason for adjustment..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setAdjustItem(null)} className="btn-secondary">Cancel</button>
              <button onClick={doAdjust} disabled={adjusting || !adjustForm.quantity} className="btn-primary">
                {adjusting ? 'Adjusting...' : 'Confirm Adjustment'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteItem} onClose={() => setDeleteItem(null)} title="Remove Product">
        {deleteItem && (
          <div className="space-y-4">
            <p className="text-gray-600">Remove <span className="font-semibold">{deleteItem.name}</span> from inventory? This can be undone by re-adding the product.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDeleteItem(null)} className="btn-secondary">Cancel</button>
              <button onClick={doDelete} className="btn-primary bg-red-500 hover:bg-red-600 border-red-500">Remove</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
