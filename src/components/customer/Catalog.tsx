import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SeriesItem } from '../../types';
import { apiClient } from '../../api/client';
import { fmt } from '../../utils/formatters';

export const Catalog: React.FC = () => {
  const { catalog, addToCart, refreshData } = useApp();
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [activeSeries, setActiveSeries] = useState<string>('');
  const [selectedColorMap, setSelectedColorMap] = useState<Record<string, string>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const loadCatalogData = async () => {
      setLoading(true);
      try {
        await refreshData();
        const sData = await apiClient.products.getSeries().catch(() => []);
        if (isMounted) {
          const active = Array.isArray(sData) ? sData.filter((s) => s && s.isActive) : [];
          setSeriesList(active);
          if (active.length) {
            setActiveSeries((prev) => (prev && active.some((s) => s.name === prev) ? prev : active[0].name));
          }
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

  const currentSeriesItem = seriesList.find((s) => s.name === activeSeries);
  const seriesColors = currentSeriesItem && Array.isArray(currentSeriesItem.colors)
    ? currentSeriesItem.colors.filter((c) => c && c.isActive)
    : [];

  const filteredCatalog = safeCatalog.filter((item) => {
    if (!item || !item.code) return false;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const nameMatch = (item.name || '').toLowerCase().includes(q);
      const codeMatch = (item.code || '').toLowerCase().includes(q);
      if (!nameMatch && !codeMatch) return false;
    }

    const prices = item.prices || {};
    const colorsBySeries = item.colorsBySeries || {};
    const colorsList = colorsBySeries[activeSeries]
      ? colorsBySeries[activeSeries].filter((c) => c && c.price !== null)
      : [];

    const selectedColorName = selectedColorMap[item.code] || (colorsList[0] ? colorsList[0].name : 'Standard');
    const colorObj = colorsList.find((c) => c.name === selectedColorName) || colorsList[0];

    const price = colorObj ? colorObj.price : prices[activeSeries];
    return price != null;
  });

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <h1>Catalog</h1>
          <p className="sub">Browse the live Mesco range and build your order.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="cardFilterInput"
            placeholder="🔍 Search products by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '280px', maxWidth: '100%' }}
          />
          {search && (
            <button className="btn b-ghost small" onClick={() => setSearch('')}>
              Clear
            </button>
          )}
        </div>
      </div>

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
          <div className="seriesTabs">
            {seriesList.map((s) => (
              <button
                key={s.id}
                className={`seriesTab ${s.name === activeSeries ? 'active' : ''}`}
                onClick={() => setActiveSeries(s.name)}
              >
                {s.name}
              </button>
            ))}
          </div>

          {!filteredCatalog.length ? (
            <div className="empty" style={{ padding: '60px 20px' }}>
              <div className="ic">🔍</div>
              <b>No matching products found</b>
              <div>
                {search
                  ? `No items match "${search}" in the ${activeSeries} series.`
                  : `No products found for the ${activeSeries} series.`}
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

                const colorsList = colorsBySeries[activeSeries]
                  ? colorsBySeries[activeSeries].filter((c) => c && c.price !== null)
                  : [];

                const selectedColorName = selectedColorMap[item.code] || (colorsList[0] ? colorsList[0].name : 'Standard');
                const colorObj = colorsList.find((c) => c.name === selectedColorName) || colorsList[0];

                // Determine active price for this series & selected color
                const price = colorObj ? colorObj.price : prices[activeSeries];
                if (price == null) return null; // Hide item if unpriced or unavailable in this series+color

                const currentQty = getQty(item.code);

                return (
                  <div key={item.code} className="catCard">
                    <div className="code">
                      CODE {item.code} · {item.pcsBox || 10}/box
                    </div>
                    <div className="nm">{item.name}</div>
                    <div className="price">
                      {fmt(price)} <small>/ box</small>
                    </div>

                    {colorsList.length > 1 && (
                      <div style={{ marginTop: '8px', marginBottom: '4px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--ink-dim)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                          Color Variant:
                        </label>
                        <select
                          className="cardFilterSelect"
                          style={{ width: '100%', padding: '4px 8px', fontSize: '12px' }}
                          value={selectedColorName}
                          onChange={(e) => setSelectedColorMap({ ...selectedColorMap, [item.code]: e.target.value })}
                        >
                          {colorsList.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name} ({fmt(c.price!)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="qtyRow">
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
                        onClick={() => addToCart(item.code, activeSeries, currentQty, selectedColorName)}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
