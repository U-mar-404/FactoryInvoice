import React, { useState, useEffect, useRef } from 'react';
import { ProductItem, SeriesItem } from '../../types';
import { apiClient, getApiBaseUrl } from '../../api/client';

interface ProductModalProps {
  product: ProductItem | null;
  seriesList: SeriesItem[];
  targetSeries?: SeriesItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    code: string;
    name: string;
    pcsBox: number;
    imageUrl?: string | null;
    rates: { seriesId: string; colorId: string; price: number | null }[];
  }) => Promise<void>;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  seriesList,
  targetSeries,
  isOpen,
  onClose,
  onSave,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [pcsBox, setPcsBox] = useState('10');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [ratesMap, setRatesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      setCode(product.code);
      setName(product.name);
      setPcsBox(String(product.pcsBox));
      setImageUrl(product.imageUrl || null);

      const initialRates: Record<string, string> = {};
      product.skus.forEach((sku) => {
        const key = `${sku.seriesId}_${sku.colorId}`;
        initialRates[key] = sku.currentPrice !== null ? String(sku.currentPrice) : '';
      });
      setRatesMap(initialRates);
    } else {
      setCode('');
      setName('');
      setPcsBox('10');
      setImageUrl(null);
      setRatesMap({});
    }
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Maximum image file size is 2MB');
      return;
    }

    setUploadingImage(true);
    try {
      const res = await apiClient.products.uploadImage(file);
      setImageUrl(res.imageUrl);
    } catch (err: any) {
      alert(err.message || 'Error uploading product image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRateChange = (seriesId: string, colorId: string, value: string) => {
    const key = `${seriesId}_${colorId}`;
    setRatesMap((prev) => ({ ...prev, [key]: value }));
  };

  const displaySeriesList = targetSeries ? [targetSeries] : seriesList;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    setLoading(true);
    try {
      const ratesList: { seriesId: string; colorId: string; price: number | null }[] = [];

      displaySeriesList.forEach((s) => {
        s.colors.forEach((c) => {
          const key = `${s.id}_${c.id}`;
          const val = ratesMap[key];
          const price = val !== undefined && val !== '' ? parseFloat(val) : null;
          if (price !== null && !isNaN(price)) {
            ratesList.push({ seriesId: s.id, colorId: c.id, price });
          }
        });
      });

      await onSave({
        code: code.trim(),
        name: name.trim(),
        pcsBox: parseInt(pcsBox || '10', 10),
        imageUrl: imageUrl || null,
        rates: ratesList,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`modalOverlay ${isOpen ? 'open' : ''}`}>
      <div className="modal" style={{ width: '640px', maxWidth: '94vw' }}>
        <div className="modalHead">
          <h3>
            {product
              ? targetSeries
                ? `Edit Product (CODE ${product.code}) in ${targetSeries.name}`
                : `Edit Product (CODE ${product.code})`
              : targetSeries
                ? `Add Product to ${targetSeries.name} Series`
                : 'Add New Product'}
          </h3>
          <button className="drawerClose" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modalBody">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '12px' }}>
              <div className="field">
                <label>Product Code</label>
                <input
                  type="text"
                  placeholder="e.g. 51"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={!!product}
                  required
                />
              </div>
              <div className="field">
                <label>Product Name</label>
                <input
                  type="text"
                  placeholder="e.g. Local Switch 1 Way"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Pcs / Box</label>
                <input
                  type="number"
                  value={pcsBox}
                  onChange={(e) => setPcsBox(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Product Thumbnail Image Upload Section */}
            <div style={{ marginTop: '14px', background: '#F8FAFC', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--line)' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--navy)', display: 'block', marginBottom: '8px' }}>
                Product Thumbnail Image (Optional)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '8px',
                    border: '1.5px dashed var(--line)',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl.startsWith('http') ? imageUrl : `${getApiBaseUrl()}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`}
                      alt="Product Thumbnail"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <span style={{ fontSize: '24px', opacity: 0.5 }}>🔌</span>
                  )}
                </div>

                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <div className="btnRow" style={{ gap: '8px', width: 'auto' }}>
                    <button
                      type="button"
                      className="btn b-ghost small"
                      disabled={uploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadingImage ? 'Uploading...' : imageUrl ? 'Change Image' : '📷 Upload Image'}
                    </button>
                    {imageUrl && (
                      <button
                        type="button"
                        className="btn b-bad small"
                        onClick={() => setImageUrl(null)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-dim)', marginTop: '4px' }}>
                    Max size 2MB · JPG, PNG, or WEBP
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                {targetSeries
                  ? `Set Rate (Rs) for ${targetSeries.name} Series Colors`
                  : 'SKU Rates per Series & Color (leave blank for unoffered combinations)'}
              </label>
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {displaySeriesList.map((s) => (
                  <div key={s.id} style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--navy)' }}>
                      Series: {s.name} {!s.isActive && '(Deactivated)'}
                    </div>
                    {s.colors.length ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                        {s.colors.map((c) => {
                          const key = `${s.id}_${c.id}`;
                          return (
                            <div key={c.id}>
                              <label style={{ fontSize: '11.5px', color: 'var(--ink-dim)', display: 'block', marginBottom: '4px' }}>
                                Color: {c.name}
                              </label>
                              <input
                                type="number"
                                placeholder="Rate (Rs)"
                                value={ratesMap[key] || ''}
                                onChange={(e) => handleRateChange(s.id, c.id, e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  fontSize: '12.5px',
                                  border: '1.5px solid var(--line)',
                                  borderRadius: '6px',
                                  background: '#fff',
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--ink-dim)' }}>
                        No colors added for this series yet. Add colors in the Series view first.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="modalFoot">
            <button type="button" className="btn b-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn b-primary" disabled={loading}>
              {loading ? 'Saving...' : product ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
