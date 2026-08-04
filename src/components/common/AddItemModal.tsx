import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CatalogItem } from '../../types';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose }) => {
  const { addCatalogItem, addToast } = useApp();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [pcsBox, setPcsBox] = useState('10');
  const [vectorPrice, setVectorPrice] = useState('');
  const [ambitPrice, setAmbitPrice] = useState('');
  const [wavesPrice, setWavesPrice] = useState('');

  if (!isOpen) return null;

  const handleSave = async () => {
    const trimmedCode = code.trim();
    const trimmedName = name.trim();

    if (!trimmedCode || !trimmedName) {
      addToast('Code and name are required', 'bad');
      return;
    }

    const newItem: CatalogItem = {
      code: trimmedCode,
      name: trimmedName,
      pcsBox: parseInt(pcsBox || '10', 10),
      prices: {
        Vector: vectorPrice !== '' ? parseFloat(vectorPrice) : null,
        Ambit: ambitPrice !== '' ? parseFloat(ambitPrice) : null,
        WavesCubic: wavesPrice !== '' ? parseFloat(wavesPrice) : null,
      },
      stock: 0,
    };

    await addCatalogItem(newItem);
    setCode('');
    setName('');
    setPcsBox('10');
    setVectorPrice('');
    setAmbitPrice('');
    setWavesPrice('');
    onClose();
  };

  return (
    <div className={`modalOverlay ${isOpen ? 'open' : ''}`}>
      <div className="modal">
        <div className="modalHead">
          <h3>Add catalog item</h3>
          <button className="drawerClose" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modalBody">
          <div className="field">
            <label>Code</label>
            <input
              placeholder="e.g. 49"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Name</label>
            <input
              placeholder="e.g. USB Charger 2-Port"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Pcs / box</label>
            <input
              type="number"
              value={pcsBox}
              onChange={(e) => setPcsBox(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Vector price</label>
            <input
              type="number"
              value={vectorPrice}
              onChange={(e) => setVectorPrice(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Ambit price</label>
            <input
              type="number"
              value={ambitPrice}
              onChange={(e) => setAmbitPrice(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Waves/Cubic price</label>
            <input
              type="number"
              value={wavesPrice}
              onChange={(e) => setWavesPrice(e.target.value)}
            />
          </div>
        </div>
        <div className="modalFoot">
          <button className="btn b-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn b-primary" onClick={handleSave}>
            Add item
          </button>
        </div>
      </div>
    </div>
  );
};
