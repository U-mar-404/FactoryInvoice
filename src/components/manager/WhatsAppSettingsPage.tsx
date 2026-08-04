import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { apiClient } from '../../api/client';
import { WhatsAppStatusResponse, WhatsAppLogItem } from '../../types';

export const WhatsAppSettingsPage: React.FC = () => {
  const { addToast } = useApp();
  const [statusData, setStatusData] = useState<WhatsAppStatusResponse | null>(null);
  const [template, setTemplate] = useState<string>('');
  const [logs, setLogs] = useState<WhatsAppLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingTemplate, setSavingTemplate] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [disconnecting, setDisconnecting] = useState<boolean>(false);

  const fetchStatus = async () => {
    try {
      const res = await apiClient.whatsapp.getStatus();
      setStatusData(res);
    } catch (err) {
      console.error('Error fetching WhatsApp status:', err);
    }
  };

  const fetchSettingsAndLogs = async () => {
    try {
      const [settingsRes, logsRes] = await Promise.all([
        apiClient.whatsapp.getSettings(),
        apiClient.whatsapp.getLogs(),
      ]);
      setTemplate(settingsRes.dispatchMessageTemplate || '');
      setLogs(logsRes);
    } catch (err) {
      console.error('Error loading WhatsApp settings/logs:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStatus(), fetchSettingsAndLogs()]);
      setLoading(false);
    };
    init();
  }, []);

  // Poll status every 2.5 seconds when disconnected or awaiting QR, 6 seconds when connected
  useEffect(() => {
    const pollInterval = statusData?.status === 'connected' ? 6000 : 2500;
    const interval = setInterval(() => {
      fetchStatus();
    }, pollInterval);
    return () => clearInterval(interval);
  }, [statusData?.status]);

  const handleSaveTemplate = async () => {
    if (!template.trim()) {
      addToast('Template cannot be blank', 'bad');
      return;
    }
    setSavingTemplate(true);
    try {
      await apiClient.whatsapp.updateSettings(template.trim());
      addToast('Dispatch message template saved successfully', 'good');
    } catch (err: any) {
      addToast(err.message || 'Error saving template', 'bad');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await apiClient.whatsapp.connect();
      setStatusData(res.status);
      addToast('Initializing WhatsApp session... Generating QR code', 'good');
      await fetchStatus();
    } catch (err: any) {
      addToast(err.message || 'Error starting WhatsApp session', 'bad');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect WhatsApp? You will need to scan a new QR code to re-link.')) {
      return;
    }
    setDisconnecting(true);
    try {
      const res = await apiClient.whatsapp.disconnect();
      setStatusData(res.status);
      addToast('WhatsApp session disconnected and reset', 'good');
      await fetchStatus();
    } catch (err: any) {
      addToast(err.message || 'Error disconnecting session', 'bad');
    } finally {
      setDisconnecting(false);
    }
  };

  const [resendingLogId, setResendingLogId] = useState<string | null>(null);

  const handleResend = async (logId: string) => {
    setResendingLogId(logId);
    try {
      await apiClient.whatsapp.resend(logId);
      addToast('Resent dispatch notification & PDF invoice successfully', 'good');
      await fetchSettingsAndLogs();
    } catch (err: any) {
      addToast(err.message || 'Error resending notification', 'bad');
    } finally {
      setResendingLogId(null);
    }
  };

  const insertVariable = (varTag: string) => {
    setTemplate((prev) => prev + varTag);
  };

  // Preview formatted message
  const previewMessage = (template || '')
    .replace(/\{customerName\}/g, 'Ali Traders')
    .replace(/\{orderId\}/g, 'e8f1a23b')
    .replace(/\{fullOrderId\}/g, 'e8f1a23b-7412-4f8a-9231-90123456789a')
    .replace(/\{totalAmount\}/g, 'Rs 45,500');

  const renderStatusBadge = () => {
    if (!statusData) return <span className="badge b-gray">UNKNOWN</span>;
    switch (statusData.status) {
      case 'connected':
        return <span className="badge b-good">● CONNECTED ({statusData.phone || 'Active'})</span>;
      case 'awaiting_qr':
        return <span className="badge b-warn">⌛ AWAITING QR SCAN</span>;
      default:
        return <span className="badge b-bad">○ DISCONNECTED</span>;
    }
  };

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <h1>WhatsApp Settings &amp; Dispatch Bot</h1>
          <p className="sub">Manage Baileys WhatsApp connection, configure dispatch message templates, and track delivery logs.</p>
        </div>
        <div className="btnRow">
          <button className="btn b-ghost small" onClick={() => { fetchStatus(); fetchSettingsAndLogs(); }}>
            🔄 Refresh Status &amp; Logs
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <div className="ic">⌛</div>
          <b>Loading WhatsApp settings...</b>
        </div>
      ) : (
        <>
          {/* Connection Status Card */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--ink-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
                  CONNECTION STATUS
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                  {renderStatusBadge()}
                  {statusData?.status === 'connected' && (
                    <span style={{ fontSize: '13px', color: 'var(--navy)', fontWeight: 600 }}>
                      Linked Number: <b>{statusData.phone}</b>
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--ink-dim)', margin: '8px 0 0 0' }}>
                  Session authentication is persisted to server disk (`baileys_auth_info`). Re-linking is only needed if disconnected manually or logged out on your phone.
                </p>
              </div>

              <div>
                {statusData?.status === 'connected' && (
                  <button className="btn b-bad small" onClick={handleDisconnect} disabled={disconnecting || connecting}>
                    {disconnecting ? 'Disconnecting...' : 'Disconnect / Re-link'}
                  </button>
                )}
                {statusData?.status === 'awaiting_qr' && (
                  <button className="btn b-bad small" onClick={handleDisconnect} disabled={disconnecting || connecting}>
                    {disconnecting ? 'Resetting...' : 'Reset Session'}
                  </button>
                )}
                {statusData?.status === 'disconnected' && (
                  <button className="btn b-primary small" onClick={handleConnect} disabled={connecting || disconnecting}>
                    {connecting ? 'Generating QR...' : 'Generate QR Code'}
                  </button>
                )}
              </div>
            </div>

            {/* QR Code Container if awaiting scan */}
            {(statusData?.status === 'awaiting_qr' || statusData?.qrCodeDataUrl) && (
              <div style={{ marginTop: '20px', padding: '20px', background: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--line)', textAlign: 'center' }}>
                <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '16px', marginBottom: '8px' }}>
                  Scan QR Code with WhatsApp
                </div>
                <div style={{ fontSize: '13px', color: 'var(--ink-dim)', marginBottom: '16px' }}>
                  Open WhatsApp on your phone &rarr; <b>Settings / Menu</b> &rarr; <b>Linked Devices</b> &rarr; <b>Link a Device</b> &rarr; Scan the code below.
                </div>
                {statusData.qrCodeDataUrl ? (
                  <div style={{ display: 'inline-block', background: '#fff', padding: '12px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <img src={statusData.qrCodeDataUrl} alt="WhatsApp QR Code" style={{ width: '220px', height: '220px', display: 'block' }} />
                  </div>
                ) : (
                  <div style={{ padding: '30px', color: 'var(--ink-dim)' }}>Generating QR Code image...</div>
                )}
                <div style={{ fontSize: '11px', color: 'var(--ink-dim)', marginTop: '12px' }}>
                  QR Code refreshes automatically if expired. Keep this tab open while scanning.
                </div>
              </div>
            )}
          </div>

          {/* Message Template Editor Card */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="cardHead">
              <div>
                <h3>Dispatch Message Template</h3>
                <p className="sub" style={{ margin: 0 }}>Configure the text message sent to customers when Store marks an order as Dispatched.</p>
              </div>
              <button className="btn b-primary small" onClick={handleSaveTemplate} disabled={savingTemplate}>
                {savingTemplate ? 'Saving...' : 'Save Template'}
              </button>
            </div>

            <div className="field" style={{ marginTop: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>Message Content</label>
              <textarea
                rows={4}
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder="Hi {customerName}, your order #{orderId} has been dispatched."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  borderRadius: '6px',
                  border: '1.5px solid var(--line)',
                  background: '#fff',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Variable Helpers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', color: 'var(--ink-dim)', fontWeight: 600 }}>Insert Variables:</span>
              <button className="btn b-ghost small" onClick={() => insertVariable('{customerName}')}>
                + Customer Name
              </button>
              <button className="btn b-ghost small" onClick={() => insertVariable('{orderId}')}>
                + Short Order ID
              </button>
              <button className="btn b-ghost small" onClick={() => insertVariable('{totalAmount}')}>
                + Total Amount
              </button>
            </div>

            {/* Live Preview Box */}
            <div style={{ background: '#F8FAFC', border: '1px dashed var(--line)', padding: '14px 16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--ink-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                LIVE PREVIEW EXAMPLE
              </div>
              <div style={{ fontSize: '13.5px', color: 'var(--navy)', whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                {previewMessage}
              </div>
            </div>
          </div>

          {/* WhatsApp Dispatch Logs Card */}
          <div className="card">
            <div className="cardHead">
              <div>
                <h3>Recent Dispatch Notification Logs</h3>
                <p className="sub" style={{ margin: 0 }}>Audit log of automated WhatsApp messages and PDF invoices sent upon order dispatch.</p>
              </div>
              <button className="btn b-ghost small" onClick={fetchSettingsAndLogs}>
                Refresh Logs
              </button>
            </div>

            {!logs.length ? (
              <div className="empty">
                <div className="ic">💬</div>
                <b>No notification logs recorded yet</b>
                <div>Logs will appear here when orders are marked dispatched.</div>
              </div>
            ) : (
              <div className="tableResponsive">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Date &amp; Time</th>
                      <th>Order ID</th>
                      <th>Customer Name</th>
                      <th>Phone</th>
                      <th>Text Status</th>
                      <th>PDF Invoice</th>
                      <th>Message Details / Error</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const statusClass =
                        log.status === 'SENT'
                          ? 'b-good'
                          : log.status === 'SKIPPED_NO_PHONE'
                          ? 'b-warn'
                          : 'b-bad';

                      const pdfStatusClass =
                        log.pdfStatus === 'SENT'
                          ? 'b-good'
                          : log.pdfStatus === 'SKIPPED_NO_PHONE'
                          ? 'b-warn'
                          : 'b-bad';

                      return (
                        <tr key={log.id}>
                          <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td>
                            <b>{log.orderId ? log.orderId.substring(0, 8) + '...' : '—'}</b>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--navy)' }}>{log.customerName}</td>
                          <td>{log.phone || '—'}</td>
                          <td>
                            <span className={`badge ${statusClass}`}>{log.status}</span>
                          </td>
                          <td>
                            <span className={`badge ${pdfStatusClass}`}>
                              📄 {log.pdfStatus || 'SENT'}
                            </span>
                          </td>
                          <td style={{ fontSize: '12.5px', maxWidth: '280px' }}>
                            <div style={{ fontWeight: 500, color: 'var(--navy)' }}>{log.message}</div>
                            {log.error && (
                              <div style={{ fontSize: '11px', color: 'var(--bad)', marginTop: '2px' }}>
                                ⚠️ {log.error}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn b-ghost small"
                              onClick={() => handleResend(log.id)}
                              disabled={resendingLogId === log.id}
                            >
                              {resendingLogId === log.id ? 'Resending...' : '🔄 Resend'}
                            </button>
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
    </div>
  );
};
