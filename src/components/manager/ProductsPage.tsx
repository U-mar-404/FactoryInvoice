import React, { useState, useEffect } from 'react';
import { ColorItem, ProductItem, SeriesItem } from '../../types';
import { apiClient } from '../../api/client';
import { useApp } from '../../context/AppContext';
import { fmt } from '../../utils/formatters';
import { ProductModal } from './ProductModal';

export const ProductsPage: React.FC = () => {
  const { addToast } = useApp();

  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [productsList, setProductsList] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Drill-down navigation state
  const [selectedSeries, setSelectedSeries] = useState<SeriesItem | null>(null);

  // Filter state for Step 2
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState('all');

  // New series modal / inline form
  const [isAddSeriesModalOpen, setIsAddSeriesModalOpen] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');
  const [editingSeries, setEditingSeries] = useState<SeriesItem | null>(null);
  const [editSeriesName, setEditSeriesName] = useState('');

  // New color form
  const [newColorName, setNewColorName] = useState('');

  // Product Modal state
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sData, pData] = await Promise.all([
        apiClient.products.getSeries().catch(() => []),
        apiClient.products.getProducts().catch(() => []),
      ]);
      setSeriesList(sData);
      setProductsList(pData);

      // Keep selectedSeries reference updated
      if (selectedSeries) {
        const updated = sData.find((s) => s.id === selectedSeries.id);
        if (updated) setSelectedSeries(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Series Actions
  const handleCreateSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeriesName.trim()) return;

    try {
      const newS = await apiClient.products.createSeries(newSeriesName.trim());
      setSeriesList((prev) => [...prev, newS]);
      setNewSeriesName('');
      setIsAddSeriesModalOpen(false);
      addToast(`Series "${newS.name}" created`, 'good');
    } catch (err: any) {
      addToast(err.message || 'Failed to add series', 'bad');
    }
  };

  const handleUpdateSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSeries || !editSeriesName.trim()) return;

    try {
      const updated = await apiClient.products.updateSeries(editingSeries.id, editSeriesName.trim());
      setSeriesList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (selectedSeries?.id === updated.id) setSelectedSeries(updated);
      setEditingSeries(null);
      addToast(`Series renamed to "${updated.name}"`, 'good');
    } catch (err: any) {
      addToast(err.message || 'Failed to update series', 'bad');
    }
  };

  const handleDeleteSeries = async (s: SeriesItem) => {
    if (!window.confirm(`Are you sure you want to delete or deactivate series "${s.name}"?`)) return;

    try {
      const res = await apiClient.products.deleteSeries(s.id);
      addToast(res.message, res.softDeleted ? 'warn' as any : 'bad');
      if (selectedSeries?.id === s.id) setSelectedSeries(null);
      await loadData();
    } catch (err: any) {
      addToast(err.message || 'Failed to delete series', 'bad');
    }
  };

  // Color Actions
  const handleAddColor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeries || !newColorName.trim()) return;

    try {
      const newC = await apiClient.products.createColor(selectedSeries.id, newColorName.trim());
      const updatedSeries = {
        ...selectedSeries,
        colors: [...selectedSeries.colors, newC],
      };
      setSelectedSeries(updatedSeries);
      setSeriesList((prev) => prev.map((s) => (s.id === updatedSeries.id ? updatedSeries : s)));
      setNewColorName('');
      addToast(`Color "${newC.name}" added to ${selectedSeries.name}`, 'good');
    } catch (err: any) {
      addToast(err.message || 'Failed to add color', 'bad');
    }
  };

  const handleDeleteColor = async (c: ColorItem) => {
    if (!window.confirm(`Are you sure you want to delete or deactivate color "${c.name}"?`)) return;

    try {
      const res = await apiClient.products.deleteColor(c.id);
      addToast(res.message, res.softDeleted ? 'warn' as any : 'bad');
      await loadData();
    } catch (err: any) {
      addToast(err.message || 'Failed to delete color', 'bad');
    }
  };

  // Product Actions
  const handleSaveProduct = async (data: {
    code: string;
    name: string;
    pcsBox: number;
    rates: { seriesId: string; colorId: string; price: number | null }[];
  }) => {
    try {
      if (selectedProduct) {
        await apiClient.products.updateProduct(selectedProduct.id, data);
        addToast(`Product CODE ${data.code} updated`, 'good');
      } else {
        await apiClient.products.createProduct(data);
        addToast(`Product CODE ${data.code} created`, 'good');
      }
      await loadData();
    } catch (err: any) {
      addToast(err.message || 'Failed to save product', 'bad');
    }
  };

  const handleDeleteProduct = async (p: ProductItem) => {
    if (!window.confirm(`Are you sure you want to delete product "${p.name}" (CODE ${p.code})?`)) return;

    try {
      const res = await apiClient.products.deleteProduct(p.id);
      addToast(res.message, res.softDeleted ? 'warn' as any : 'bad');
      await loadData();
    } catch (err: any) {
      addToast(err.message || 'Failed to delete product', 'bad');
    }
  };

  // Step 2 Filtered Products Logic for the selected series
  const seriesProducts = productsList.filter((p) => {
    if (!selectedSeries) return false;
    return p.skus.some((sku) => sku.seriesId === selectedSeries.id);
  });

  const filteredProducts = seriesProducts.filter((p) => {
    if (!selectedSeries) return false;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchCode = p.code.toLowerCase().includes(q);
      const matchName = p.name.toLowerCase().includes(q);
      if (!matchCode && !matchName) return false;
    }

    if (colorFilter !== 'all') {
      const hasColor = p.skus.some(
        (sku) => sku.seriesId === selectedSeries.id && sku.colorName.toLowerCase() === colorFilter.toLowerCase() && sku.currentPrice !== null
      );
      if (!hasColor) return false;
    }

    return true;
  });

  const hasActiveFilters = search !== '' || colorFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setColorFilter('all');
  };

  return (
    <div className="page">
      {/* STEP 1: All Series Overview Grid */}
      {!selectedSeries ? (
        <>
          <div className="pageHead">
            <div>
              <h1>Product Catalog — Series List</h1>
              <p className="sub">Select a Series to manage its colors and product rates.</p>
            </div>
            <div className="btnRow">
              <button
                className="btn b-primary"
                onClick={() => setIsAddSeriesModalOpen(true)}
              >
                + Add Series
              </button>
            </div>
          </div>

          {loading ? (
            <div className="empty">Loading series...</div>
          ) : !seriesList.length ? (
            <div className="empty">
              <div className="ic">📦</div>
              <b>No product series found</b>
              Click "+ Add Series" to create your first series (e.g. Vector, Ambit).
            </div>
          ) : (
            <div className="catGrid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {seriesList.map((s) => {
                const activeColorsCount = s.colors.filter((c) => c.isActive).length;
                const activeProductsCount = productsList.filter((p) =>
                  p.skus.some((sku) => sku.seriesId === s.id && sku.currentPrice !== null)
                ).length;

                return (
                  <div
                    key={s.id}
                    className="catCard"
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '170px',
                      background: '#fff',
                      opacity: s.isActive ? 1 : 0.65,
                    }}
                    onClick={() => {
                      setSelectedSeries(s);
                      resetFilters();
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="code">SERIES</span>
                        {s.isActive ? (
                          <span className="badge dispatched">Active</span>
                        ) : (
                          <span className="badge denied">Deactivated</span>
                        )}
                      </div>
                      <div className="nm" style={{ fontSize: '18px', fontWeight: 700, margin: '8px 0 4px', color: 'var(--navy)' }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: '12.5px', color: 'var(--ink-dim)' }}>
                        {activeColorsCount} color{activeColorsCount !== 1 ? 's' : ''} · {activeProductsCount} product{activeProductsCount !== 1 ? 's' : ''} offering
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '16px',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--line)',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="btn b-ghost small"
                        style={{ color: 'var(--blue)', fontWeight: 700 }}
                        onClick={() => {
                          setSelectedSeries(s);
                          resetFilters();
                        }}
                      >
                        View Products &amp; Colors →
                      </button>

                      <div className="btnRow">
                        <button
                          className="btn b-ghost small"
                          onClick={() => {
                            setEditingSeries(s);
                            setEditSeriesName(s.name);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn b-bad small"
                          onClick={() => handleDeleteSeries(s)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* STEP 2: Selected Series View (Drill-Down) */
        <>
          <div className="pageHead">
            <div>
              <button
                className="btn b-ghost small"
                style={{ marginBottom: '10px' }}
                onClick={() => setSelectedSeries(null)}
              >
                ← Back to Series List
              </button>
              <h1>{selectedSeries.name} Series</h1>
              <p className="sub">Manage colors and product pricing for {selectedSeries.name}.</p>
            </div>
            <div className="btnRow">
              <button
                className="btn b-primary"
                onClick={() => {
                  setSelectedProduct(null);
                  setIsProductModalOpen(true);
                }}
              >
                + Add Product
              </button>
            </div>
          </div>

          {/* Section A: Colors in this Series */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="cardHead">
              <h3>Available Colors in {selectedSeries.name}</h3>
              <form onSubmit={handleAddColor} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="cardFilterInput"
                  placeholder="New color name (e.g. Gold)"
                  value={newColorName}
                  onChange={(e) => setNewColorName(e.target.value)}
                  style={{ width: '190px' }}
                />
                <button type="submit" className="btn b-primary small">
                  + Add Color
                </button>
              </form>
            </div>

            <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              {selectedSeries.colors.length ? (
                selectedSeries.colors.map((c) => (
                  <span
                    key={c.id}
                    style={{
                      background: 'var(--bg-subtle)',
                      border: '1.5px solid var(--line)',
                      borderRadius: '20px',
                      padding: '6px 14px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--ink)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {c.name} {!c.isActive && <span style={{ color: 'var(--bad)', fontSize: '11px' }}>(Deactivated)</span>}
                    <button
                      type="button"
                      onClick={() => handleDeleteColor(c)}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: 'var(--bad)',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                        padding: '0 2px',
                      }}
                      title="Delete / Deactivate Color"
                    >
                      ✕
                    </button>
                  </span>
                ))
              ) : (
                <div style={{ color: 'var(--ink-dim)', fontSize: '13px' }}>
                  No colors added for {selectedSeries.name} yet. Type a color name above to add one.
                </div>
              )}
            </div>
          </div>

          {/* Section B: Products Table in this Series */}
          <div className="card">
            <div className="cardHead">
              <h3>Products in {selectedSeries.name} Series</h3>
              <div className="cardFilterRow">
                <input
                  type="text"
                  className="cardFilterInput"
                  placeholder="Search code, item..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  className="cardFilterSelect"
                  value={colorFilter}
                  onChange={(e) => setColorFilter(e.target.value)}
                >
                  <option value="all">All Colors</option>
                  {selectedSeries.colors.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {hasActiveFilters && (
                  <button className="btn b-ghost small" onClick={resetFilters}>
                    Reset filters
                  </button>
                )}
              </div>
            </div>

            {!filteredProducts.length ? (
              <div className="empty">
                <div className="ic">🏷️</div>
                <b>No products in {selectedSeries.name}</b>
                {hasActiveFilters
                  ? 'Try adjusting your search or color filter.'
                  : 'Click "+ Add Product" to configure products for this series.'}
              </div>
            ) : (
              <div className="tableResponsive">
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Product Name</th>
                      <th>Pcs/Box</th>
                      {selectedSeries.colors.map((c) => (
                        <th key={c.id}>{c.name} Rate</th>
                      ))}
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p) => {
                      const skusInSeries = p.skus.filter((s) => s.seriesId === selectedSeries.id);

                      return (
                        <tr key={p.id} className="rowIn">
                          <td>
                            <b>{p.code}</b>
                          </td>
                          <td>{p.name}</td>
                          <td>{p.pcsBox}</td>
                          {selectedSeries.colors.map((c) => {
                            const sku = skusInSeries.find((s) => s.colorId === c.id);
                            const price = sku ? sku.currentPrice : null;

                            return (
                              <td key={c.id}>
                                {price !== null ? fmt(price) : <span style={{ color: 'var(--ink-dim)' }}>—</span>}
                              </td>
                            );
                          })}
                          <td>
                            {p.isActive ? (
                              <span className="badge dispatched">Active</span>
                            ) : (
                              <span className="badge denied">Deactivated</span>
                            )}
                          </td>
                          <td>
                            <div className="btnRow">
                              <button
                                className="btn b-ghost small"
                                onClick={() => {
                                  setSelectedProduct(p);
                                  setIsProductModalOpen(true);
                                }}
                              >
                                Edit Rates
                              </button>
                              <button
                                className="btn b-bad small"
                                onClick={() => handleDeleteProduct(p)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal: Add New Series */}
      <div className={`modalOverlay ${isAddSeriesModalOpen ? 'open' : ''}`}>
        <div className="modal">
          <div className="modalHead">
            <h3>Add New Product Series</h3>
            <button className="drawerClose" onClick={() => setIsAddSeriesModalOpen(false)}>
              ✕
            </button>
          </div>
          <form onSubmit={handleCreateSeries}>
            <div className="modalBody">
              <div className="field">
                <label>Series Name</label>
                <input
                  type="text"
                  placeholder="e.g. Elegance or WavesCubic"
                  value={newSeriesName}
                  onChange={(e) => setNewSeriesName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="modalFoot">
              <button type="button" className="btn b-ghost" onClick={() => setIsAddSeriesModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn b-primary">
                Create Series
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal: Edit Series Name */}
      <div className={`modalOverlay ${editingSeries ? 'open' : ''}`}>
        <div className="modal">
          <div className="modalHead">
            <h3>Rename Series</h3>
            <button className="drawerClose" onClick={() => setEditingSeries(null)}>
              ✕
            </button>
          </div>
          <form onSubmit={handleUpdateSeries}>
            <div className="modalBody">
              <div className="field">
                <label>Series Name</label>
                <input
                  type="text"
                  value={editSeriesName}
                  onChange={(e) => setEditSeriesName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="modalFoot">
              <button type="button" className="btn b-ghost" onClick={() => setEditingSeries(null)}>
                Cancel
              </button>
              <button type="submit" className="btn b-primary">
                Save Name
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal: Add / Edit Product */}
      <ProductModal
        isOpen={isProductModalOpen}
        product={selectedProduct}
        seriesList={seriesList}
        targetSeries={selectedSeries}
        onClose={() => setIsProductModalOpen(false)}
        onSave={handleSaveProduct}
      />
    </div>
  );
};
