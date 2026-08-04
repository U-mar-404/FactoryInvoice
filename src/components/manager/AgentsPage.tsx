import React, { useState, useEffect } from 'react';
import { Agent } from '../../types';
import { apiClient } from '../../api/client';
import { useApp } from '../../context/AppContext';

export const AgentsPage: React.FC = () => {
  const { addToast } = useApp();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [saving, setSaving] = useState(false);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const data = await apiClient.agents.getAgents();
      setAgents(data);
    } catch (err) {
      console.error('Error loading agents:', err);
      addToast('Failed to load agents list', 'bad');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const openAddModal = () => {
    setEditingAgent(null);
    setName('');
    setContact('');
    setIsModalOpen(true);
  };

  const openEditModal = (agent: Agent) => {
    setEditingAgent(agent);
    setName(agent.name);
    setContact(agent.contact || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      if (editingAgent) {
        await apiClient.agents.updateAgent(editingAgent.id, { name: name.trim(), contact: contact.trim() });
        addToast(`Agent "${name.trim()}" updated successfully`, 'good');
      } else {
        await apiClient.agents.createAgent({ name: name.trim(), contact: contact.trim() });
        addToast(`Agent "${name.trim()}" created successfully`, 'good');
      }
      setIsModalOpen(false);
      loadAgents();
    } catch (err: any) {
      addToast(err.message || 'Error saving agent', 'bad');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (agent: Agent) => {
    if (!window.confirm(`Are you sure you want to delete agent "${agent.name}"?`)) return;

    try {
      await apiClient.agents.deleteAgent(agent.id);
      addToast(`Agent "${agent.name}" deleted`, 'good');
      loadAgents();
    } catch (err: any) {
      addToast(err.message || 'Error deleting agent', 'bad');
    }
  };

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <h1>Agents Management</h1>
          <p className="sub">Manage sales agents and track assigned customer accounts.</p>
        </div>
        <button className="btn b-primary" onClick={openAddModal}>
          + Add Agent
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty">
            <div className="ic">⌛</div>
            <b>Loading agents...</b>
          </div>
        ) : !agents.length ? (
          <div className="empty">
            <div className="ic">👔</div>
            <b>No agents created yet</b>
            Click "+ Add Agent" above to add your first sales agent.
          </div>
        ) : (
          <div className="tableResponsive">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Agent Name</th>
                  <th>Contact Info</th>
                  <th>Assigned Customers</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{a.name}</div>
                    </td>
                    <td>{a.contact || <span style={{ color: 'var(--ink-dim)' }}>—</span>}</td>
                    <td>
                      <span className="badge b-blue">{a.customerCount || 0} Customers</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button className="btn b-ghost small" onClick={() => openEditModal(a)}>
                          Edit
                        </button>
                        <button className="btn b-danger small" onClick={() => handleDelete(a)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add / Edit Agent */}
      {isModalOpen && (
        <div className="modalOverlay open">
          <div className="modal" style={{ width: '450px' }}>
            <div className="modalHead">
              <h3>{editingAgent ? 'Edit Agent' : 'Add New Agent'}</h3>
              <button className="drawerClose" onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modalBody">
                <div className="field">
                  <label>Agent Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Tariq Mahmood"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="field" style={{ marginTop: '12px' }}>
                  <label>Contact Info (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 0300-1234567 or email"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                  />
                </div>
              </div>
              <div className="modalFoot">
                <button type="button" className="btn b-ghost" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn b-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingAgent ? 'Save Changes' : 'Create Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
