'use client'

import { useEffect, useState } from 'react'

// Left sidebar: Category tree + Brands. onSelect({category, subcategory, brand})
export default function CategorySidebar({ onSelect, active = {} }) {
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [open, setOpen] = useState(null)

  useEffect(() => {
    fetch('/api/categories').then((r) => r.json()).then((j) => j.success && setCategories(j.data))
    fetch('/api/brands').then((r) => r.json()).then((j) => j.success && setBrands(j.data))
  }, [])

  return (
    <aside className="sidebar" data-qa="sidebar">
      <h3>Category</h3>
      <div data-qa="category-list">
        {categories.map((c) => (
          <div className="side-group" key={c.category}>
            <button
              data-qa={`category-${c.category}`}
              onClick={() => setOpen(open === c.category ? null : c.category)}
            >
              {c.category} <span>{open === c.category ? '−' : '+'}</span>
            </button>
            {open === c.category && (
              <ul className="side-sub">
                {c.subcategories.map((s) => (
                  <li
                    key={s}
                    data-qa={`subcategory-${s}`}
                    className={active.subcategory === s ? 'active' : ''}
                    onClick={() => onSelect({ category: c.category, subcategory: s })}
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 22 }}>Brands</h3>
      <ul className="brand-list" data-qa="brand-list">
        {brands.map((b) => (
          <li
            key={b.brand}
            data-qa={`brand-${b.brand}`}
            className={active.brand === b.brand ? 'active' : ''}
            onClick={() => onSelect({ brand: b.brand })}
          >
            <span>{b.brand}</span> <span className="muted">({b.count})</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
