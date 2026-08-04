import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SeriesItem, StockItem, ProductItem, ColorItem } from '../../types';
import { apiClient } from '../../api/client';

export const StockPage: React.FC = () => {
  const { user, addToast } = useApp();
  const isManager = user?.role === 'manager';
  const isStore = user?.role === 'store';

  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<SeriesItem | null>(null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [productsList, setProductsList] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Store Role Drill-Down state
  const [storeStep, setStoreStep] = useState<'series' | 'color' | 'items'>('series');
  const [selectedStoreColor, setSelectedStoreColor] = useState<ColorItem | null>(null);
  const [storeQtyInputs, setStoreQtyInputs] = useState<Record<string, string>>({});
  const [storeSearch, setStoreSearch] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submittingStoreCommit, setSubmittingStoreCommit] = useState(false);

  // Manager Role Drill-Down state
  const [managerStep, setManagerStep] = useState<'series' | 'color' | 'items'>('series');
  const [selectedManagerColor, setSelectedManagerColor] = useState<string | null>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Manager Modals state
  const [addStockItem, setAddStockItem] = useState<StockItem | null>(null);
  const [addQty, setAddQty] = useState('');
  const [addNote, setAddNote] = useState('');
  const [submittingStock, setSubmittingStock] = useState(false);

  const [editMinItem, setEditMinItem] = useState<StockItem | null>(null);
  const [minLevelInput, setMinLevelInput] = useState('');
  const [submittingMin, setSubmittingMin] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      if (isStore) {
        // Store ONLY loads Series & Products metadata — NEVER stock quantities or min levels!
        const [seriesRes, productsRes] = await Promise.all([
          apiClient.products.getSeries(),
          apiClient.products.getProducts(),
        ]);
        setSeriesList(seriesRes || []);
        setProductsList(productsRes || []);
      } else {
        const [seriesRes, stockRes] = await Promise.all([
          apiClient.products.getSeries(),
          apiClient.stock.getStock(),
        ]);
        setSeriesList(seriesRes || []);
        setStockItems(stockRes || []);
      }
    } catch (e) {
      console.error('Failed to load inventory setup data:', e);
      addToast('Failed to load inventory setup data', 'bad');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.role]);

  // -------------------------------------------------------------
  // STORE ROLE VIEW: 3-STEP DRILL-DOWN ADD-ONLY STOCK FLOW
  // Step 1: Select Series -> Step 2: Select Color -> Step 3: Add Quantities
  // -------------------------------------------------------------
  if (isStore) {
    const activeSeriesList = seriesList.filter((s) => s.isActive);

    if (loading) {
      return (
        <div className="page">
          <div className="pageHead">
            <div>
              <h1>Stock &amp; Inventory</h1>
              <p className="sub">Loading series catalog...</p>
            </div>
          </div>
          <div className="empty">
            <div className="spinner" style={{ margin: '20px auto' }}></div>
            Loading catalog data...
          </div>
        </div>
      );
    }

    const handleSelectStoreSeries = (ser: SeriesItem) => {
      setSelectedSeries(ser);
      const activeColors = Array.isArray(ser.colors) ? ser.colors.filter((c) => c && c.isActive) : [];
      if (activeColors.length === 1) {
        setSelectedStoreColor(activeColors[0]);
        setStoreStep('items');
      } else {
        setSelectedStoreColor(null);
        setStoreStep('color');
      }
      setStoreQtyInputs({});
      setStoreSearch('');
    };

    const handleSelectStoreColor = (col: ColorItem) => {
      setSelectedStoreColor(col);
      setStoreStep('items');
    };

    const handleStoreBackToSeries = () => {
      setSelectedSeries(null);
      setSelectedStoreColor(null);
      setStoreStep('series');
      setStoreQtyInputs({});
      setStoreSearch('');
    };

    const handleStoreBackToColor = () => {
      setSelectedStoreColor(null);
      setStoreStep('color');
    };

    // STEP 1: STORE SERIES LIST CARDS GRID
    if (storeStep === 'series' || !selectedSeries) {
      return (
        <div className="page">
          <div className="pageHead">
            <div>
              <h1>Stock &amp; Inventory Entry</h1>
              <p className="sub">Step 1 of 3: Select a product series to log incoming stock arrivals.</p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
              marginTop: '8px',
            }}
          >
            {activeSeriesList.map((ser) => {
              let skuCount = 0;
              productsList.forEach((p) => {
                if (!p.isActive) return;
                p.skus.forEach((sku) => {
                  if (sku.isActive && sku.seriesId === ser.id && sku.currentPrice !== null) {
                    skuCount++;
                  }
                });
              });

              const activeColors = Array.isArray(ser.colors) ? ser.colors.filter((c) => c && c.isActive) : [];

              return (
                <div
                  key={ser.id}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, border-color 0.15s ease',
                    padding: '20px',
                    border: '1.5px solid var(--line)',
                    borderRadius: '12px',
                  }}
                  onClick={() => handleSelectStoreSeries(ser)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, color: 'var(--navy)', fontSize: '18px' }}>{ser.name} Series</h3>
                    <span className="badge b-blue" style={{ fontSize: '12px' }}>
                      {skuCount} SKUs
                    </span>
                  </div>

                  <p className="sub" style={{ margin: 0, fontSize: '13px' }}>
                    Available in {activeColors.length} color{activeColors.length !== 1 ? 's' : ''}:
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {activeColors.map((c) => (
                        <span key={c.id} className="badge" style={{ fontSize: '11px', background: '#F1F5F9' }}>
                          {c.name}
                        </span>
                      ))}
                    </div>
                  </p>

                  <div style={{ marginTop: '16px', textAlign: 'right' }}>
                    <button type="button" className="btn b-primary small">Select {ser.name} →</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // STEP 2: STORE COLOR SELECTION FOR SELECTED SERIES
    if (storeStep === 'color' && selectedSeries) {
      const activeColors = Array.isArray(selectedSeries.colors) ? selectedSeries.colors.filter((c) => c && c.isActive) : [];

      return (
        <div className="page">
          <div className="pageHead">
            <div>
              <button type="button" className="btn b-ghost small" style={{ marginBottom: '8px' }} onClick={handleStoreBackToSeries}>
                ← Back to Series
              </button>
              <h1>{selectedSeries.name} Series — Select Color</h1>
              <p className="sub">Step 2 of 3: Select incoming color variant for {selectedSeries.name} Series.</p>
            </div>
          </div>

          {!activeColors.length ? (
            <div className="empty" style={{ padding: '40px 20px' }}>
              <div className="ic">🎨</div>
              <b>No active colors</b>
              No active color options found for {selectedSeries.name} Series.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '16px',
                marginTop: '8px',
              }}
            >
              {activeColors.map((col) => (
                <div
                  key={col.id}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    padding: '20px',
                    border: '1.5px solid var(--line)',
                    borderRadius: '12px',
                    textAlign: 'center',
                  }}
                  onClick={() => handleSelectStoreColor(col)}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--navy)', marginBottom: '8px' }}>
                    {col.name}
                  </div>
                  <button type="button" className="btn b-primary small" style={{ width: '100%', justifyContent: 'center' }}>
                    Add {col.name} Stock →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // STEP 3: STORE QUANTITY ENTRY TABLE FOR SELECTED SERIES + COLOR
    const availableSkusForStore: {
      skuId: string;
      code: string;
      name: string;
      colorName: string;
      pcsBox: number;
    }[] = [];

    productsList.forEach((prod) => {
      if (!prod.isActive) return;
      prod.skus.forEach((sku) => {
        if (
          sku.isActive &&
          sku.seriesId === selectedSeries.id &&
          selectedStoreColor &&
          sku.colorId === selectedStoreColor.id &&
          sku.currentPrice !== null
        ) {
          availableSkusForStore.push({
            skuId: sku.id,
            code: prod.code,
            name: prod.name,
            colorName: sku.colorName,
            pcsBox: prod.pcsBox,
          });
        }
      });
    });

    const filteredStoreItems = availableSkusForStore.filter((item) => {
      if (!storeSearch.trim()) return true;
      const q = storeSearch.trim().toLowerCase();
      return (
        item.code.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.colorName.toLowerCase().includes(q)
      );
    });

    // Collect non-zero items for confirmation popup
    const confirmEntries = availableSkusForStore
      .map((item) => {
        const val = storeQtyInputs[item.skuId];
        const qty = val ? parseInt(val, 10) : 0;
        return { ...item, qty };
      })
      .filter((e) => !isNaN(e.qty) && e.qty > 0);

    const handleReviewClick = () => {
      if (!confirmEntries.length) {
        addToast('Please enter a quantity for at least one item', 'bad');
        return;
      }
      setShowConfirmModal(true);
    };

    const handleConfirmCommit = async () => {
      if (!confirmEntries.length) return;
      setSubmittingStoreCommit(true);
      try {
        await Promise.all(
          confirmEntries.map((entry) => apiClient.stock.addReceipt(entry.skuId, entry.qty))
        );
        addToast(`Successfully added stock for ${confirmEntries.length} item(s)`, 'good');
        setShowConfirmModal(false);
        setStoreQtyInputs({});
      } catch (e: any) {
        addToast(e.message || 'Error submitting stock receipts', 'bad');
      } finally {
        setSubmittingStoreCommit(false);
      }
    };

    return (
      <div className="page">
        <div className="pageHead">
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button type="button" className="btn b-ghost small" onClick={handleStoreBackToColor}>
                ← Change Color
              </button>
              <button type="button" className="btn b-ghost small" onClick={handleStoreBackToSeries}>
                ← Change Series
              </button>
            </div>
            <h1>
              {selectedSeries.name} Series ({selectedStoreColor?.name}) — Add Stock
            </h1>
            <p className="sub">
              Step 3 of 3: Enter incoming quantities (pcs) for {selectedSeries.name} — {selectedStoreColor?.name}.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="cardHead">
            <h3>
              {selectedSeries.name} Items — {selectedStoreColor?.name} ({filteredStoreItems.length})
            </h3>
            <div className="cardFilterRow">
              <input
                type="text"
                className="cardFilterInput"
                placeholder="Search item code or name..."
                value={storeSearch}
                onChange={(e) => setStoreSearch(e.target.value)}
              />
              {storeSearch && (
                <button className="btn b-ghost small" onClick={() => setStoreSearch('')}>
                  Reset
                </button>
              )}
            </div>
          </div>

          {!filteredStoreItems.length ? (
            <div className="empty">
              <div className="ic">📦</div>
              <b>No items match search for {selectedSeries.name} ({selectedStoreColor?.name})</b>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="desktopTable tableResponsive">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>Item Code &amp; Name</th>
                      <th>Color</th>
                      <th>Pcs/Box</th>
                      <th style={{ textAlign: 'right', width: '220px' }}>Quantity to Add (Pcs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStoreItems.map((item, idx) => {
                      const currentVal = storeQtyInputs[item.skuId] || '';
                      return (
                        <tr key={item.skuId}>
                          <td style={{ color: 'var(--ink-dim)' }}>{idx + 1}</td>
                          <td>
                            <b style={{ color: 'var(--navy)' }}>{item.name}</b>
                            <br />
                            <span style={{ fontSize: '11.5px', color: 'var(--ink-dim)' }}>CODE {item.code}</span>
                          </td>
                          <td>
                            <span className="badge b-blue">{item.colorName}</span>
                          </td>
                          <td>{item.pcsBox}</td>
                          <td style={{ textAlign: 'right' }}>
                            <input
                              type="number"
                              min="0"
                              className="fInput"
                              style={{ width: '130px', textAlign: 'right', fontWeight: 700 }}
                              placeholder="0"
                              value={currentVal}
                              onChange={(e) =>
                                setStoreQtyInputs((prev) => ({
                                  ...prev,
                                  [item.skuId]: e.target.value,
                                }))
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Store Stock List */}
              <div className="mCardList">
                {filteredStoreItems.map((item) => {
                  const currentVal = storeQtyInputs[item.skuId] || '';
                  return (
                    <div key={item.skuId} className="mCard">
                      <div className="mCardHeader">
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--navy)' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--ink-dim)' }}>CODE {item.code}</div>
                        </div>
                        <span className="badge b-blue">{item.colorName}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12.5px', color: 'var(--ink-dim)' }}>Pcs/Box: <b>{item.pcsBox}</b></span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--navy)' }}>Add Pcs:</span>
                          <input
                            type="number"
                            min="0"
                            className="fInput"
                            style={{ width: '100px', textAlign: 'right', fontWeight: 700, minHeight: '44px' }}
                            placeholder="0"
                            value={currentVal}
                            onChange={(e) =>
                              setStoreQtyInputs((prev) => ({
                                ...prev,
                                [item.skuId]: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="cardFoot" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
                <div style={{ fontSize: '13px', color: 'var(--ink-dim)' }}>
                  <b>{confirmEntries.length}</b> item(s) filled with non-zero stock.
                </div>
                <button
                  type="button"
                  className="btn b-primary"
                  onClick={handleReviewClick}
                  disabled={!confirmEntries.length}
                >
                  Review &amp; Submit Additions ({confirmEntries.reduce((s, c) => s + c.qty, 0)} pcs)
                </button>
              </div>
            </>
          )}
        </div>

        {/* STORE CONFIRMATION POPUP MODAL */}
        {showConfirmModal && (
          <div className="modalOverlay open">
            <div className="modal" style={{ width: '640px', maxWidth: '95vw' }}>
              <div className="modalHead">
                <h3>Confirm Stock Addition</h3>
                <button
                  className="drawerClose"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={submittingStoreCommit}
                >
                  ✕
                </button>
              </div>

              <div className="modalBody" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                <p className="sub" style={{ marginTop: 0, marginBottom: '16px' }}>
                  Please review stock additions for <b>{selectedSeries.name} Series ({selectedStoreColor?.name})</b>:
                </p>

                <table className="tbl" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', width: '32px' }}>#</th>
                      <th style={{ padding: '8px 10px' }}>Item Code &amp; Name</th>
                      <th style={{ padding: '8px 10px' }}>Color</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Quantity to Add</th>
                    </tr>
                  </thead>
                  <tbody>
                    {confirmEntries.map((e, index) => (
                      <tr key={e.skuId} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '10px 8px', color: 'var(--ink-dim)' }}>{index + 1}</td>
                        <td style={{ padding: '10px 8px', fontWeight: 700, color: 'var(--navy)' }}>
                          {e.name} (CODE {e.code})
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <span className="badge b-blue">{e.colorName}</span>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, fontSize: '14px', color: 'var(--good)' }}>
                          +{e.qty} pcs
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--navy)', color: '#fff', fontWeight: 800, fontSize: '14px' }}>
                      <td colSpan={3} style={{ padding: '10px 8px', textAlign: 'right' }}>
                        Total Additions:
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        +{confirmEntries.reduce((s, c) => s + c.qty, 0)} pcs
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="modalFoot">
                <button
                  type="button"
                  className="btn b-ghost"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={submittingStoreCommit}
                >
                  Back to Edit
                </button>
                <button
                  type="button"
                  className="btn b-primary"
                  onClick={handleConfirmCommit}
                  disabled={submittingStoreCommit}
                >
                  {submittingStoreCommit ? 'Saving Stock...' : 'Confirm & Save Stock'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // MANAGER ROLE VIEW: FULL INVENTORY DRILL-DOWN & MANAGEMENT
  // Step 1: Series List -> Step 2: Color List -> Step 3: Stock Table per SKU
  // -------------------------------------------------------------
  const handleSelectManagerSeries = (ser: SeriesItem) => {
    setSelectedSeries(ser);
    setSelectedManagerColor('all');
    setManagerStep('color');
    setSearch('');
    setStatusFilter('all');
  };

  const handleSelectManagerColor = (colName: string) => {
    setSelectedManagerColor(colName);
    setManagerStep('items');
  };

  const handleManagerBackToSeries = () => {
    setSelectedSeries(null);
    setSelectedManagerColor('all');
    setManagerStep('series');
    setSearch('');
    setStatusFilter('all');
  };

  const handleManagerBackToColor = () => {
    setSelectedManagerColor('all');
    setManagerStep('color');
  };

  const handleAddStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addStockItem) return;
    const qty = parseInt(addQty, 10);
    if (isNaN(qty) || qty <= 0) {
      addToast('Please enter a valid positive quantity', 'bad');
      return;
    }

    setSubmittingStock(true);
    try {
      await apiClient.stock.addReceipt(addStockItem.id, qty, addNote);
      addToast(`Added ${qty} pcs to ${addStockItem.name} (${addStockItem.colorName})`, 'good');
      setAddStockItem(null);
      setAddQty('');
      setAddNote('');
      await loadData();
    } catch (e: any) {
      addToast(e.message || 'Error adding stock', 'bad');
    } finally {
      setSubmittingStock(false);
    }
  };

  const handleEditMinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMinItem) return;
    const minVal = parseInt(minLevelInput, 10);
    if (isNaN(minVal) || minVal < 0) {
      addToast('Please enter a valid non-negative minimum level', 'bad');
      return;
    }

    setSubmittingMin(true);
    try {
      await apiClient.stock.updateMinLevel(editMinItem.id, minVal);
      addToast(`Updated minimum stock level to ${minVal}`, 'good');
      setEditMinItem(null);
      setMinLevelInput('');
      await loadData();
    } catch (e: any) {
      addToast(e.message || 'Error updating minimum stock level', 'bad');
    } finally {
      setSubmittingMin(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="pageHead">
          <div>
            <h1>Stock &amp; Inventory</h1>
            <p className="sub">Loading stock records...</p>
          </div>
        </div>
        <div className="empty">
          <div className="spinner" style={{ margin: '20px auto' }}></div>
          Loading inventory data...
        </div>
      </div>
    );
  }

  // STEP 1: MANAGER SERIES SELECTION GRID VIEW
  if (managerStep === 'series' || !selectedSeries) {
    return (
      <div className="page">
        <div className="pageHead">
          <div>
            <h1>Stock &amp; Inventory Management</h1>
            <p className="sub">Step 1 of 3: Select a product series to view and manage inventory levels.</p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
            marginTop: '8px',
          }}
        >
          {seriesList.map((ser) => {
            const serSkus = stockItems.filter((s) => s.seriesId === ser.id);
            const totalStock = serSkus.reduce((sum, s) => sum + s.stockQty, 0);
            const lowStockCount = serSkus.filter((s) => s.isLowStock).length;

            return (
              <div
                key={ser.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                  padding: '20px',
                  border: '1.5px solid var(--line)',
                  borderRadius: '12px',
                }}
                onClick={() => handleSelectManagerSeries(ser)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, color: 'var(--navy)', fontSize: '18px' }}>{ser.name} Series</h3>
                  {lowStockCount > 0 ? (
                    <span className="badge b-bad" style={{ fontSize: '11.5px' }}>
                      {lowStockCount} Low Stock
                    </span>
                  ) : (
                    <span className="badge b-good" style={{ fontSize: '11.5px' }}>
                      Optimal
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: 'var(--ink-dim)' }}>
                  <div>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--navy)', display: 'block' }}>
                      {totalStock}
                    </span>
                    Total Stock (Pcs)
                  </div>
                  <div>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--navy)', display: 'block' }}>
                      {serSkus.length}
                    </span>
                    Active SKUs
                  </div>
                </div>

                <div style={{ marginTop: '16px', textAlign: 'right' }}>
                  <button type="button" className="btn b-ghost small">Select {ser.name} →</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // STEP 2: MANAGER COLOR SELECTION VIEW FOR SELECTED SERIES
  const availableColors = selectedSeries.colors || [];

  if (managerStep === 'color' && selectedSeries) {
    return (
      <div className="page">
        <div className="pageHead">
          <div>
            <button type="button" className="btn b-ghost small" style={{ marginBottom: '8px' }} onClick={handleManagerBackToSeries}>
              ← Back to Series
            </button>
            <h1>{selectedSeries.name} Series — Select Color View</h1>
            <p className="sub">Step 2 of 3: Choose a specific color or view all colors for {selectedSeries.name} Series.</p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '16px',
            marginTop: '8px',
          }}
        >
          {/* Card to View All Colors */}
          <div
            className="card"
            style={{
              cursor: 'pointer',
              padding: '20px',
              border: '2px solid var(--navy)',
              borderRadius: '12px',
              textAlign: 'center',
              background: '#FAFBFD',
            }}
            onClick={() => handleSelectManagerColor('all')}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎨</div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--navy)', marginBottom: '8px' }}>
              All Colors
            </div>
            <p className="sub" style={{ fontSize: '12.5px', margin: '0 0 12px 0' }}>
              View full inventory matrix across all colors in {selectedSeries.name}.
            </p>
            <button type="button" className="btn b-primary small" style={{ width: '100%', justifyContent: 'center' }}>
              View All Colors →
            </button>
          </div>

          {availableColors.map((col) => {
            const colSkus = stockItems.filter(
              (s) => s.seriesId === selectedSeries.id && s.colorName.toLowerCase() === col.name.toLowerCase()
            );
            const colStock = colSkus.reduce((sum, s) => sum + s.stockQty, 0);
            const colLow = colSkus.filter((s) => s.isLowStock).length;

            return (
              <div
                key={col.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  padding: '20px',
                  border: '1.5px solid var(--line)',
                  borderRadius: '12px',
                }}
                onClick={() => handleSelectManagerColor(col.name)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--navy)' }}>{col.name}</div>
                  {colLow > 0 && <span className="badge b-bad" style={{ fontSize: '11px' }}>{colLow} Low</span>}
                </div>

                <div style={{ fontSize: '13px', color: 'var(--ink-dim)', marginBottom: '12px' }}>
                  Total Stock: <b style={{ color: 'var(--navy)' }}>{colStock} pcs</b>
                </div>

                <button type="button" className="btn b-ghost small" style={{ width: '100%', justifyContent: 'center' }}>
                  View {col.name} Stock →
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // STEP 3: MANAGER SELECTED SERIES + COLOR DRILL-DOWN STOCK TABLE
  const currentSeriesStock = stockItems.filter((s) => s.seriesId === selectedSeries.id);

  const filteredStock = currentSeriesStock.filter((s) => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchCode = s.code.toLowerCase().includes(q);
      const matchName = s.name.toLowerCase().includes(q);
      const matchColor = s.colorName.toLowerCase().includes(q);
      if (!matchCode && !matchName && !matchColor) return false;
    }

    if (
      selectedManagerColor &&
      selectedManagerColor !== 'all' &&
      s.colorName.toLowerCase() !== selectedManagerColor.toLowerCase()
    ) {
      return false;
    }

    if (statusFilter === 'low' && !s.isLowStock) return false;
    if (statusFilter === 'normal' && s.isLowStock) return false;

    return true;
  });

  const hasActiveFilters = search !== '' || statusFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
  };

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button type="button" className="btn b-ghost small" onClick={handleManagerBackToColor}>
              ← Change Color View
            </button>
            <button type="button" className="btn b-ghost small" onClick={handleManagerBackToSeries}>
              ← Change Series
            </button>
          </div>
          <h1>
            {selectedSeries.name} Series — {selectedManagerColor === 'all' ? 'All Colors' : `${selectedManagerColor} Color`} Stock
          </h1>
          <p className="sub">
            Step 3 of 3: Manage per-SKU stock levels and minimum alert thresholds for {selectedSeries.name}.
          </p>
        </div>
      </div>

      {/* Main Stock Table Card */}
      <div className="card">
        <div className="cardHead">
          <h3>
            Product Stock ({filteredStock.length} SKUs) — {selectedSeries.name} ({selectedManagerColor === 'all' ? 'All Colors' : selectedManagerColor})
          </h3>
          <div className="cardFilterRow">
            <input
              type="text"
              className="cardFilterInput"
              placeholder="Search code, name, color..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="cardFilterSelect"
              value={selectedManagerColor || 'all'}
              onChange={(e) => setSelectedManagerColor(e.target.value)}
            >
              <option value="all">All Colors</option>
              {availableColors.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              className="cardFilterSelect"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Stock Statuses</option>
              <option value="low">Low Stock Only</option>
              <option value="normal">Optimal Only</option>
            </select>

            {hasActiveFilters && (
              <button className="btn b-ghost small" onClick={resetFilters}>
                Reset filters
              </button>
            )}
          </div>
        </div>

        {!filteredStock.length ? (
          <div className="empty">
            <div className="ic">📦</div>
            <b>No stock items match filters</b>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="desktopTable tableResponsive">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item Code &amp; Name</th>
                    <th>Color</th>
                    <th>Pcs/Box</th>
                    <th style={{ textAlign: 'right' }}>Current Stock (Pcs)</th>
                    <th style={{ textAlign: 'right' }}>Min Stock Level</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStock.map((s, idx) => (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--ink-dim)' }}>{idx + 1}</td>
                      <td>
                        <b style={{ color: 'var(--navy)' }}>{s.name}</b>
                        <br />
                        <span style={{ fontSize: '11.5px', color: 'var(--ink-dim)' }}>CODE {s.code}</span>
                      </td>
                      <td>
                        <span className="badge b-blue">{s.colorName}</span>
                      </td>
                      <td>{s.pcsBox}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '15px', color: s.isLowStock ? 'var(--bad)' : 'var(--navy)' }}>
                        {s.stockQty}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{s.minStockLevel}</td>
                      <td style={{ textAlign: 'center' }}>
                        {s.isLowStock ? (
                          <span className="badge b-bad">Low Stock</span>
                        ) : (
                          <span className="badge b-good">Optimal</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="btnRow" style={{ justifyContent: 'flex-end' }}>
                          <button
                            className="btn b-good small"
                            onClick={() => {
                              setAddStockItem(s);
                              setAddQty('');
                              setAddNote('');
                            }}
                          >
                            + Add Stock
                          </button>
                          <button
                            className="btn b-ghost small"
                            onClick={() => {
                              setEditMinItem(s);
                              setMinLevelInput(String(s.minStockLevel));
                            }}
                          >
                            Min Level
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Manager Stock Audit Cards */}
            <div className="mCardList">
              {filteredStock.map((s) => (
                <div key={s.id} className="mCard">
                  <div className="mCardHeader">
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--navy)' }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--ink-dim)' }}>CODE {s.code}</div>
                    </div>
                    {s.isLowStock ? (
                      <span className="badge b-bad">Low Stock</span>
                    ) : (
                      <span className="badge b-good">Optimal</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge b-blue">{s.colorName}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '16.5px', fontWeight: 800, color: s.isLowStock ? 'var(--bad)' : 'var(--navy)' }}>
                        {s.stockQty} pcs
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--ink-dim)' }}>
                        Min Threshold: {s.minStockLevel} pcs
                      </div>
                    </div>
                  </div>

                  <div className="mCardDivider"></div>

                  <div className="mCardFooter">
                    <span style={{ fontSize: '12px', color: 'var(--ink-dim)' }}>Pcs/Box: <b>{s.pcsBox}</b></span>
                    <div className="btnRow" style={{ gap: '6px', width: 'auto' }}>
                      <button
                        className="btn b-good small"
                        onClick={() => {
                          setAddStockItem(s);
                          setAddQty('');
                          setAddNote('');
                        }}
                      >
                        + Add Stock
                      </button>
                      <button
                        className="btn b-ghost small"
                        onClick={() => {
                          setEditMinItem(s);
                          setMinLevelInput(String(s.minStockLevel));
                        }}
                      >
                        Min Level
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add Stock Receipt Modal */}
      {addStockItem && (
        <div className="modalOverlay open">
          <div className="modal" style={{ width: '480px' }}>
            <div className="modalHead">
              <h3>Add Stock — {addStockItem.name}</h3>
              <button className="drawerClose" onClick={() => setAddStockItem(null)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleAddStockSubmit}>
              <div className="modalBody">
                <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                  Series: <b>{addStockItem.seriesName}</b> · Color: <b>{addStockItem.colorName}</b>
                  <br />
                  Current Stock: <b>{addStockItem.stockQty} pcs</b>
                </div>

                <div className="fg">
                  <label>Quantity to Add (Pcs) *</label>
                  <input
                    type="number"
                    min="1"
                    className="fInput"
                    placeholder="e.g. 50"
                    value={addQty}
                    onChange={(e) => setAddQty(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="fg">
                  <label>Audit Note / Reference (Optional)</label>
                  <input
                    type="text"
                    className="fInput"
                    placeholder="e.g. Supplier Shipment Batch #1042"
                    value={addNote}
                    onChange={(e) => setAddNote(e.target.value)}
                  />
                </div>
              </div>
              <div className="modalFoot">
                <button type="button" className="btn b-ghost" onClick={() => setAddStockItem(null)} disabled={submittingStock}>
                  Cancel
                </button>
                <button type="submit" className="btn b-primary" disabled={submittingStock}>
                  {submittingStock ? 'Adding...' : 'Add Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Min Level Modal (Manager only) */}
      {editMinItem && (
        <div className="modalOverlay open">
          <div className="modal" style={{ width: '440px' }}>
            <div className="modalHead">
              <h3>Edit Minimum Stock Level</h3>
              <button className="drawerClose" onClick={() => setEditMinItem(null)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleEditMinSubmit}>
              <div className="modalBody">
                <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                  Item: <b>{editMinItem.name}</b> ({editMinItem.seriesName} - {editMinItem.colorName})
                  <br />
                  Current Stock: <b>{editMinItem.stockQty} pcs</b>
                </div>

                <div className="fg">
                  <label>Minimum Stock Level Threshold (Pcs) *</label>
                  <input
                    type="number"
                    min="0"
                    className="fInput"
                    placeholder="e.g. 15"
                    value={minLevelInput}
                    onChange={(e) => setMinLevelInput(e.target.value)}
                    required
                    autoFocus
                  />
                  <span style={{ fontSize: '11.5px', color: 'var(--ink-dim)', marginTop: '4px', display: 'block' }}>
                    When current stock drops at or below this number, a Low Stock Alert is triggered.
                  </span>
                </div>
              </div>
              <div className="modalFoot">
                <button type="button" className="btn b-ghost" onClick={() => setEditMinItem(null)} disabled={submittingMin}>
                  Cancel
                </button>
                <button type="submit" className="btn b-primary" disabled={submittingMin}>
                  {submittingMin ? 'Saving...' : 'Save Minimum Level'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
