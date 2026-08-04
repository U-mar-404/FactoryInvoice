import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SeriesItem, ColorItem } from '../../types';
import { apiClient, getProductImageUrl } from '../../api/client';
import { fmt } from '../../utils/formatters';

type Step = 'series' | 'color' | 'products';

export const Catalog: React.FC = () => {
  const { catalog, addToCart, refreshData } = useApp();
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [step, setStep] = useState<Step>('series');
  const [selectedSeries, setSelectedSeries] = useState<SeriesItem | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const loadCatalogData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (token) {
          await refreshData();
        }
        const sData = await apiClient.products.getSeries().catch(() => []);
        if (isMounted) {
          const active = Array.isArray(sData) ? sData.filter((s) => s && s.isActive) : [];
          setSeriesList(active);
        }
      } catch (err) {
        console.error('Error loading catalog:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCatalogData();
    return () => {
      isMounted = false;
    };
  }, []);

  const safeCatalog = Array.isArray(catalog) ? catalog : [];

  const getQty = (code: string) => quantities[code] || 1;

  const handleQtyChange = (code: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [code]: Math.max(1, (prev[code] || 1) + delta),
    }));
  };

  const handleSelectSeries = (s: SeriesItem) => {
    setSelectedSeries(s);
    const activeColors = Array.isArray(s.colors) ? s.colors.filter((c) => c && c.isActive) : [];
    if (activeColors.length === 1) {
      // If only 1 color available in this series, auto-select it for speed
      setSelectedColor(activeColors[0].name);
      setStep('products');
    } else {
      setSelectedColor(null);
      setStep('color');
    }
  };

  const handleSelectColor = (colorName: string) => {
    setSelectedColor(colorName);
    setStep('products');
  };

  const handleBackToSeries = () => {
    setSelectedSeries(null);
    setSelectedColor(null);
    setStep('series');
  };

  const handleBackToColor = () => {
    setSelectedColor(null);
    setStep('color');
  };

  // Filter products for Step 3 (or direct search)
  const activeSeriesName = selectedSeries ? selectedSeries.name : '';
  const activeColorName = selectedColor || 'Standard';

  const filteredCatalog = safeCatalog.filter((item) => {
    if (!item || !item.code) return false;

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const nameMatch = (item.name || '').toLowerCase().includes(q);
      const codeMatch = (item.code || '').toLowerCase().includes(q);
      if (!nameMatch && !codeMatch) return false;
    }

    if (step === 'products' && activeSeriesName) {
      const prices = item.prices || {};
      const colorsBySeries = item.colorsBySeries || {};
      const colorsList = colorsBySeries[activeSeriesName]
        ? colorsBySeries[activeSeriesName].filter((c) => c && c.price !== null)
        : [];

      const colorObj = colorsList.find(
        (c) => c.name.toLowerCase() === activeColorName.toLowerCase()
      ) || colorsList[0];

      const price = colorObj ? colorObj.price : prices[activeSeriesName];
      return price != null;
    }

    return true;
  });

  return (
    <div className="page">
      {/* Header & Search */}
      <div className="pageHead">
        <div>
          <h1>Catalog</h1>
          <p className="sub">Browse Mesco range by Series and Color, then build your order.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="cardFilterInput"
            placeholder="🔍 Search products by name or code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (e.target.value.trim() && step !== 'products' && seriesList.length > 0) {
                // If user starts searching, auto switch to products view so search results are immediate
                if (!selectedSeries) setSelectedSeries(seriesList[0]);
                if (!selectedColor && seriesList[0]?.colors?.[0]) setSelectedColor(seriesList[0].colors[0].name);
                setStep('products');
              }
            }}
            style={{ width: '280px', maxWidth: '100%' }}
          />
          {search && (
            <button className="btn b-ghost small" onClick={() => setSearch('')}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb Navigation Bar */}
      {!loading && seriesList.length > 0 && (
        <div
          style={{
            background: 'var(--bg-subtle)',
            border: '1.5px solid var(--line)',
            borderRadius: '10px',
            padding: '10px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn small ${step === 'series' ? 'b-primary' : 'b-ghost'}`}
              onClick={handleBackToSeries}
              style={{ fontWeight: 700 }}
            >
              1. Choose Series
            </button>

            {selectedSeries && (
              <>
                <span style={{ color: 'var(--ink-dim)', fontWeight: 600 }}>›</span>
                <button
                  type="button"
                  className={`btn small ${step === 'color' ? 'b-primary' : 'b-ghost'}`}
                  onClick={handleBackToColor}
                  style={{ fontWeight: 700 }}
                >
                  2. Color ({selectedSeries.name})
                </button>
              </>
            )}

            {selectedSeries && selectedColor && (
              <>
                <span style={{ color: 'var(--ink-dim)', fontWeight: 600 }}>›</span>
                <span
                  className={`badge ${step === 'products' ? 'b-blue' : ''}`}
                  style={{ fontSize: '12px', padding: '6px 12px', fontWeight: 700 }}
                >
                  3. Products ({selectedColor})
                </span>
              </>
            )}
          </div>

          <div style={{ fontSize: '12px', color: 'var(--ink-dim)', fontWeight: 600 }}>
            {step === 'series' && 'Select a series to start'}
            {step === 'color' && 'Pick color variant'}
            {step === 'products' && `Showing ${selectedSeries?.name} — ${selectedColor}`}
          </div>
        </div>
      )}

      {loading ? (
        <div className="empty" style={{ padding: '60px 20px' }}>
          <div className="ic">⌛</div>
          <b>Loading Catalog...</b>
          Connecting to Mesco catalog database.
        </div>
      ) : !seriesList.length ? (
        <div className="empty" style={{ padding: '60px 20px' }}>
          <div className="ic">📦</div>
          <b>No products yet</b>
          There are currently no active product series available. Please contact Manager or check back later.
        </div>
      ) : (
        <>
          {/* STEP 1: SERIES SELECTION */}
          {step === 'series' && (
            <div>
              <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--navy)' }}>
                Select Product Series
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '16px',
                }}
              >
                {seriesList.map((s) => {
                  const activeColors = Array.isArray(s.colors) ? s.colors.filter((c) => c && c.isActive) : [];
                  return (
                    <div
                      key={s.id}
                      className="card"
                      style={{
                        padding: '20px',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease, border-color 0.15s ease',
                        border: '1.5px solid var(--line)',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                      onClick={() => handleSelectSeries(s)}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '20px',
                            fontWeight: 800,
                            color: 'var(--navy)',
                            marginBottom: '6px',
                            letterSpacing: '0.3px',
                          }}
                        >
                          {s.name} Series
                        </div>
                        <div style={{ fontSize: '12.5px', color: 'var(--ink-dim)', marginBottom: '14px' }}>
                          Available in {activeColors.length} color{activeColors.length !== 1 ? 's' : ''}:
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                            {activeColors.map((c) => (
                              <span key={c.id} className="badge" style={{ fontSize: '11px', background: '#F1F5F9' }}>
                                {c.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn b-primary small"
                        style={{ width: '100%', justifyContent: 'center', marginTop: '12px', fontWeight: 700 }}
                      >
                        Select {s.name} →
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: COLOR SELECTION */}
          {step === 'color' && selectedSeries && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: 'var(--navy)' }}>
                  Select Color for {selectedSeries.name} Series
                </h3>
                <button type="button" className="btn b-ghost small" onClick={handleBackToSeries}>
                  ← Back to Series
                </button>
              </div>

              {(!selectedSeries.colors || !selectedSeries.colors.filter((c) => c && c.isActive).length) ? (
                <div className="empty" style={{ padding: '40px 20px' }}>
                  <div className="ic">🎨</div>
                  <b>No colors available</b>
                  No active colors found for {selectedSeries.name} series.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '16px',
                  }}
                >
                  {selectedSeries.colors
                    .filter((c) => c && c.isActive)
                    .map((c) => (
                      <div
                        key={c.id}
                        className="card"
                        style={{
                          padding: '20px',
                          cursor: 'pointer',
                          border: '1.5px solid var(--line)',
                          borderRadius: '12px',
                          textAlign: 'center',
                          transition: 'transform 0.15s ease',
                        }}
                        onClick={() => handleSelectColor(c.name)}
                      >
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎨</div>
                        <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--navy)', marginBottom: '8px' }}>
                          {c.name}
                        </div>
                        <button
                          type="button"
                          className="btn b-primary small"
                          style={{ width: '100%', justifyContent: 'center', fontWeight: 700 }}
                        >
                          Browse {c.name} Items →
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: SCOPED PRODUCT GRID */}
          {step === 'products' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, color: 'var(--navy)' }}>
                    {selectedSeries?.name} Series — {selectedColor} Color
                  </h3>
                  <span style={{ fontSize: '12.5px', color: 'var(--ink-dim)' }}>
                    Showing products with pricing for {selectedSeries?.name} ({selectedColor})
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn b-ghost small" onClick={handleBackToColor}>
                    ← Change Color
                  </button>
                  <button type="button" className="btn b-ghost small" onClick={handleBackToSeries}>
                    ← Change Series
                  </button>
                </div>
              </div>

              {!filteredCatalog.length ? (
                <div className="empty" style={{ padding: '60px 20px' }}>
                  <div className="ic">🔍</div>
                  <b>No products found</b>
                  <div>
                    {search
                      ? `No items match "${search}" for ${selectedSeries?.name} (${selectedColor}).`
                      : `No products available for ${selectedSeries?.name} in ${selectedColor} color.`}
                  </div>
                  {search && (
                    <button className="btn b-ghost small" onClick={() => setSearch('')} style={{ marginTop: '12px' }}>
                      Clear Search Filter
                    </button>
                  )}
                </div>
              ) : (
                <div className="catGrid">
                  {filteredCatalog.map((item) => {
                    if (!item || !item.code) return null;

                    const prices = item.prices || {};
                    const colorsBySeries = item.colorsBySeries || {};

                    const colorsList = colorsBySeries[activeSeriesName]
                      ? colorsBySeries[activeSeriesName].filter((c) => c && c.price !== null)
                      : [];

                    const colorObj = colorsList.find(
                      (c) => c.name.toLowerCase() === activeColorName.toLowerCase()
                    ) || colorsList[0];

                    const price = colorObj ? colorObj.price : prices[activeSeriesName];
                    if (price == null) return null; // Hide unpriced items

                    const currentQty = getQty(item.code);

                    return (
                      <div key={item.code} className="catCard">
                        {/* Thumbnail Container */}
                        <div
                          style={{
                            width: '100%',
                            height: '140px',
                            borderRadius: '8px',
                            background: '#F8FAFC',
                            border: '1px solid var(--line)',
                            marginBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                          }}
                        >
                          {item.imageUrl ? (
                            <img
                              src={getProductImageUrl(item.imageUrl)}
                              alt={item.name}
                              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }}
                            />
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', opacity: 0.4 }}>
                              <span style={{ fontSize: '32px' }}>🔌</span>
                              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--navy)', letterSpacing: '0.5px' }}>MESCO</span>
                            </div>
                          )}
                        </div>

                        <div className="code">
                          CODE {item.code} · {item.pcsBox || 10} pcs/box
                        </div>
                        <div className="nm">{item.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0 8px 0' }}>
                          <span className="badge b-blue" style={{ fontSize: '11px' }}>{activeSeriesName}</span>
                          <span className="badge" style={{ fontSize: '11px', background: '#E2E8F0', color: '#1E293B', fontWeight: 700 }}>
                            {activeColorName}
                          </span>
                        </div>

                        <div className="price">
                          {fmt(price)} <small>/ pc</small>
                        </div>

                        <div className="qtyRow" style={{ marginTop: '12px' }}>
                          <button
                            type="button"
                            className="qtyBtn"
                            onClick={() => handleQtyChange(item.code, -1)}
                          >
                            –
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={currentQty}
                            onChange={(e) =>
                              setQuantities({
                                ...quantities,
                                [item.code]: Math.max(1, parseInt(e.target.value || '1', 10)),
                              })
                            }
                          />
                          <button
                            type="button"
                            className="qtyBtn"
                            onClick={() => handleQtyChange(item.code, 1)}
                          >
                            +
                          </button>
                          <button
                            type="button"
                            className="addBtn"
                            onClick={() => addToCart(item.code, activeSeriesName, currentQty, activeColorName)}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
