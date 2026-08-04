import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Series } from '../../types';
import { AddItemModal } from '../common/AddItemModal';

export const RateList: React.FC = () => {
  const { catalog, updateCatalogRate, removeCatalogItem } = useApp();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [seriesFilter, setSeriesFilter] = useState('all');

  const handlePriceChange = (code: string, series: Series, valStr: string) => {
    const price = valStr === '' ? null : parseFloat(valStr);
    updateCatalogRate(code, series, price);
  };

  const filteredCatalog = catalog.filter((it) => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchCode = it.code.toLowerCase().includes(q);
      const matchName = it.name.toLowerCase().includes(q);
      if (!matchCode && !matchName) return false;
    }

    if (seriesFilter !== 'all') {
      const price = it.prices[seriesFilter as Series];
      if (price === null || price === undefined) return false;
    }

    return true;
  });

  const hasActiveFilters = search !== '' || seriesFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setSeriesFilter('all');
  };

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <h1>Rate List</h1>
          <p className="sub">Edit prices per series. Blank = not available in that series.</p>
        </div>
        <div className="btnRow">
          <button
            className="btn b-primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            + Add item
          </button>
        </div>
      </div>

      <div className="card">
        <div className="cardHead">
          <h3>Catalog Rates</h3>
          <div className="cardFilterRow">
            <input
              type="text"
              className="cardFilterInput"
              placeholder="Search code, item name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="cardFilterSelect"
              value={seriesFilter}
              onChange={(e) => setSeriesFilter(e.target.value)}
            >
              <option value="all">All Series</option>
              <option value="Vector">Vector</option>
              <option value="Ambit">Ambit</option>
              <option value="WavesCubic">Waves/Cubic</option>
            </select>

            {hasActiveFilters && (
              <button className="btn b-ghost small" onClick={resetFilters}>
                Reset filters
              </button>
            )}
          </div>
        </div>

        {!filteredCatalog.length ? (
          <div className="empty">
            <div className="ic">🏷️</div>
            <b>No items found</b>
            {hasActiveFilters ? 'Try adjusting your search or series filter.' : 'Nothing to show yet.'}
          </div>
        ) : (
          <div className="tableResponsive">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Item</th>
                  <th>Pcs/Box</th>
                  <th>Vector</th>
                  <th>Ambit</th>
                  <th>Waves/Cubic</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredCatalog.map((it, idx) => (
                  <tr key={it.code || idx} className="rowIn">
                    <td>{it.code}</td>
                    <td>{it.name}</td>
                    <td>{it.pcsBox}</td>
                    <td>
                      <input
                        type="number"
                        value={it.prices.Vector ?? ''}
                        onChange={(e) => handlePriceChange(it.code, 'Vector', e.target.value)}
                        style={{
                          width: '80px',
                          padding: '6px',
                          border: '1.5px solid var(--line)',
                          borderRadius: '6px',
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={it.prices.Ambit ?? ''}
                        onChange={(e) => handlePriceChange(it.code, 'Ambit', e.target.value)}
                        style={{
                          width: '80px',
                          padding: '6px',
                          border: '1.5px solid var(--line)',
                          borderRadius: '6px',
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={it.prices.WavesCubic ?? ''}
                        onChange={(e) => handlePriceChange(it.code, 'WavesCubic', e.target.value)}
                        style={{
                          width: '80px',
                          padding: '6px',
                          border: '1.5px solid var(--line)',
                          borderRadius: '6px',
                        }}
                      />
                    </td>
                    <td>
                      <button
                        className="btn b-bad small"
                        onClick={() => removeCatalogItem(idx)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};
