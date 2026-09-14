import { useState, useEffect, useRef } from 'react';
import {
  Key, Server, LayoutDashboard, Copy, Check, Eye, EyeOff, Plus,
  ChevronDown, Trash2, RefreshCw, Ban, Brain, Radio, Tags,
  KeyRound, Send, X, AlertTriangle, Cpu, Terminal, Play,
  HardDrive, Sparkles, ExternalLink, Image as ImageIcon, Video as VideoIcon,
  Music as AudioIcon, Database as DbIcon, ShieldAlert, Layers
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const C = {
  bg: '#0A0D12',
  panel: '#12161D',
  panelAlt: '#171C24',
  panelHover: '#1B212B',
  border: '#232933',
  borderSoft: '#1B2028',
  text: '#E8EAEE',
  textSoft: '#8890A0',
  textFaint: '#6B7280',
  accent: '#FF8A42',
  accentSoft: 'rgba(255,138,66,0.12)',
  accentSoftHover: 'rgba(255,138,66,0.18)',
  success: '#3ECF8E',
  successSoft: 'rgba(62,207,142,0.12)',
  warning: '#FFC857',
  warningSoft: 'rgba(255,200,87,0.12)',
  danger: '#FF5C5C',
  dangerSoft: 'rgba(255,92,92,0.12)',
};

const fontHead = "'Space Grotesk', sans-serif";
const fontMono = "'JetBrains Mono', monospace";

function maskRaw(raw) {
  if (!raw || raw.length < 12) return '••••••••••••';
  return raw.slice(0, 10) + '••••••••••••' + raw.slice(-4);
}

function providerStatus(keys = []) {
  if (!keys || keys.length === 0) return 'empty';
  const active = keys.filter(k => k.status === 'active').length;
  const hasIssue = keys.some(k => k.status === 'failed' || k.status === 'rate-limited');
  if (active === 0) return 'failing';
  if (hasIssue) return 'degraded';
  return 'healthy';
}

function statusColor(status) {
  if (status === 'healthy') return C.success;
  if (status === 'degraded') return C.warning;
  if (status === 'failing') return C.danger;
  return C.textFaint;
}

function statusLabel(status) {
  if (status === 'healthy') return 'healthy';
  if (status === 'degraded') return 'degraded';
  if (status === 'failing') return 'failing';
  return 'no keys';
}

function keyStatusColor(status) {
  if (status === 'active') return C.success;
  if (status === 'rate-limited') return C.warning;
  return C.danger;
}

function Modal({ title, children, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(6,8,11,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10,
          width: 380, maxWidth: 'calc(100vw - 32px)', padding: 24, animation: 'scaleIn 0.15s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontFamily: fontHead, fontSize: 16, fontWeight: 600, color: C.text, margin: 0 }}>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog" style={{ background: 'none', border: 'none', color: C.textSoft, cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatusDot({ color, pulse }) {
  return (
    <span
      style={{
        display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
        background: color, flexShrink: 0,
        animation: pulse ? 'pulseDot 2s ease-in-out infinite' : 'none',
        boxShadow: pulse ? `0 0 0 rgba(62,207,142,0.5)` : 'none',
      }}
    />
  );
}

function Sidebar({ active, setActive, brainStatus }) {
  const items = [
    { id: 'key', label: 'My key', icon: Key },
    { id: 'brain', label: 'Brain', icon: Cpu },
    { id: 'providers', label: 'Providers', icon: Server },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];
  return (
    <div style={{
      width: 232, flexShrink: 0, background: C.panel, borderRight: `1px solid ${C.borderSoft}`,
      display: 'flex', flexDirection: 'column', padding: '24px 16px', height: '100%',
    }}>
      <div style={{ padding: '0 8px', marginBottom: 36 }}>
        <div style={{ fontFamily: fontHead, fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>Relay</div>
        <div style={{ fontFamily: fontHead, fontSize: 12.5, color: C.textFaint, marginTop: 2 }}>key routing engine</div>
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }} aria-label="Primary">
        {items.map(item => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              className="nav-btn"
              onClick={() => setActive(item.id)}
              aria-current={isActive ? 'page' : undefined}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '9px 10px',
                borderRadius: 6, border: 'none', cursor: 'pointer', textAlign: 'left',
                background: isActive ? C.accentSoft : 'transparent',
                color: isActive ? C.accent : C.textSoft,
                fontFamily: fontHead, fontSize: 14, fontWeight: 500,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon size={16} strokeWidth={2} />
                {item.label}
              </span>
              {item.id === 'brain' && brainStatus !== 'healthy' && (
                <StatusDot color={statusColor(brainStatus)} pulse={brainStatus === 'failing'} />
              )}
            </button>
          );
        })}
      </nav>
      <div style={{ marginTop: 'auto', padding: '12px 10px', borderTop: `1px solid ${C.borderSoft}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <StatusDot color={statusColor(brainStatus)} pulse={brainStatus !== 'failing'} />
          <span style={{ fontFamily: fontHead, fontSize: 12.5, color: C.textSoft }}>
            {brainStatus === 'failing' ? 'Classifier offline' : 'Classifier online'}
          </span>
        </div>
        <div style={{ fontFamily: fontMono, fontSize: 11, color: C.textFaint, marginLeft: 15 }}>gemini rotator active</div>
      </div>
    </div>
  );
}

function MyKeyTab({ apiKey, generateKey, revokeKey }) {
  const [masked, setMasked] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);

  const endpointUrl = `${window.location.origin}/api/v1/search`;

  const copy = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey.raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const copyEndpoint = () => {
    navigator.clipboard.writeText(endpointUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 1500);
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 style={{ fontFamily: fontHead, fontSize: 24, fontWeight: 600, color: C.text, margin: '0 0 6px' }}>Your API key</h1>
      <p style={{ fontFamily: fontHead, fontSize: 14, color: C.textSoft, margin: '0 0 28px', lineHeight: 1.6 }}>
        This permanent key authenticates requests to your routing engine. It never expires and stays constant for your client apps.
      </p>

      {!apiKey ? (
        <div style={{
          background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: 40, textAlign: 'center',
        }}>
          <Key size={22} color={C.textFaint} style={{ marginBottom: 14 }} />
          <p style={{ fontFamily: fontHead, fontSize: 14, color: C.textSoft, margin: '0 0 18px' }}>
            Generate a key to start sending requests through Relay.
          </p>
          <button
            className="primary-btn"
            onClick={generateKey}
            style={{
              background: C.accent, color: '#1A0F05', border: 'none', borderRadius: 7,
              padding: '10px 20px', fontFamily: fontHead, fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Generate API key
          </button>
        </div>
      ) : (
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 24 }}>
          <div style={{ fontFamily: fontHead, fontSize: 12, color: C.textFaint, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Permanent API Key</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, background: C.bg,
            border: `1px solid ${C.borderSoft}`, borderRadius: 7, padding: '12px 14px', marginBottom: 18,
          }}>
            <span style={{
              fontFamily: fontMono, fontSize: 14, color: C.text, flex: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {masked ? maskRaw(apiKey.raw) : apiKey.raw}
            </span>
            <button className="icon-btn" onClick={() => setMasked(m => !m)} aria-label={masked ? 'Show full key' : 'Hide key'} style={{ background: 'none', border: 'none', color: C.textSoft, cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex' }}>
              {masked ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <button className="icon-btn" onClick={copy} aria-label="Copy key to clipboard" style={{ background: 'none', border: 'none', color: copied ? C.success : C.textSoft, cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex' }}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>

          <div style={{ fontFamily: fontHead, fontSize: 12, color: C.textFaint, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Permanent Streaming Endpoint URL</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, background: C.bg,
            border: `1px solid ${C.borderSoft}`, borderRadius: 7, padding: '12px 14px', marginBottom: 22,
          }}>
            <span style={{
              fontFamily: fontMono, fontSize: 13, color: C.accent, flex: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {endpointUrl}
            </span>
            <button className="icon-btn" onClick={copyEndpoint} aria-label="Copy endpoint URL" style={{ background: 'none', border: 'none', color: copiedUrl ? C.success : C.textSoft, cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex' }}>
              {copiedUrl ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 32, marginBottom: 22, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: fontHead, fontSize: 11.5, color: C.textFaint, marginBottom: 3 }}>Created</div>
              <div style={{ fontFamily: fontMono, fontSize: 13, color: C.text }}>{apiKey.created}</div>
            </div>
            <div>
              <div style={{ fontFamily: fontHead, fontSize: 11.5, color: C.textFaint, marginBottom: 3 }}>Status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <StatusDot color={C.success} />
                <span style={{ fontFamily: fontMono, fontSize: 13, color: C.text }}>active</span>
              </div>
            </div>
            <div>
              <div style={{ fontFamily: fontHead, fontSize: 11.5, color: C.textFaint, marginBottom: 3 }}>Last used</div>
              <div style={{ fontFamily: fontMono, fontSize: 13, color: C.text }}>{apiKey.lastUsed}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="secondary-btn"
              onClick={() => setConfirmModal('regenerate')}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, background: 'transparent',
                border: `1px solid ${C.border}`, color: C.text, borderRadius: 7,
                padding: '8px 14px', fontFamily: fontHead, fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} /> Regenerate
            </button>
            <button
              className="secondary-btn danger"
              onClick={() => setConfirmModal('revoke')}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, background: 'transparent',
                border: `1px solid ${C.border}`, color: C.danger, borderRadius: 7,
                padding: '8px 14px', fontFamily: fontHead, fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
              }}
            >
              <Ban size={14} /> Revoke
            </button>
          </div>
        </div>
      )}

      {confirmModal && (
        <Modal title={confirmModal === 'regenerate' ? 'Regenerate key' : 'Revoke key'} onClose={() => setConfirmModal(null)}>
          <p style={{ fontFamily: fontHead, fontSize: 13.5, color: C.textSoft, lineHeight: 1.6, margin: '0 0 20px' }}>
            {confirmModal === 'regenerate'
              ? 'This creates a new key and invalidates the current one immediately.'
              : 'This immediately disables the current key. Requests using it will be rejected.'}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              className="secondary-btn"
              onClick={() => setConfirmModal(null)}
              style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textSoft, borderRadius: 7, padding: '8px 16px', fontFamily: fontHead, fontSize: 13.5, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              className="primary-btn"
              onClick={() => {
                if (confirmModal === 'regenerate') generateKey();
                else revokeKey();
                setConfirmModal(null);
              }}
              style={{
                background: confirmModal === 'revoke' ? C.danger : C.accent,
                color: confirmModal === 'revoke' ? '#2A0808' : '#1A0F05', border: 'none', borderRadius: 7, padding: '8px 16px',
                fontFamily: fontHead, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {confirmModal === 'regenerate' ? 'Regenerate' : 'Revoke'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function KeyRow({ k, onDelete }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0',
      borderBottom: `1px solid ${C.borderSoft}`,
    }}>
      <StatusDot color={keyStatusColor(k.status)} pulse={k.status === 'active'} />
      <span style={{ fontFamily: fontMono, fontSize: 12.5, color: C.text, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {k.masked}
      </span>
      <span style={{ fontFamily: fontMono, fontSize: 11.5, color: k.status === 'active' ? C.textFaint : keyStatusColor(k.status), flexShrink: 0, width: 92 }}>
        {k.status}
      </span>
      <span style={{ fontFamily: fontMono, fontSize: 11.5, color: C.textFaint, flexShrink: 0, width: 78, textAlign: 'right' }}>
        {k.lastUsed || 'never'}
      </span>
      <button
        className="icon-btn danger"
        onClick={onDelete}
        aria-label="Delete key"
        style={{ background: 'none', border: 'none', color: C.textFaint, cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', flexShrink: 0 }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function AddKeyRow({ onAdd, placeholder }) {
  const [input, setInput] = useState('');
  const submit = () => {
    if (!input.trim()) return;
    onAdd(input.trim());
    setInput('');
  };
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder={placeholder || 'Paste a new API key'}
        aria-label={placeholder || 'Paste a new API key'}
        style={{
          flex: 1, minWidth: 0, background: C.bg, border: `1px solid ${C.borderSoft}`, borderRadius: 6,
          padding: '8px 12px', fontFamily: fontMono, fontSize: 12.5, color: C.text, outline: 'none',
        }}
      />
      <button
        className="add-btn"
        onClick={submit}
        style={{
          background: C.accentSoft, color: C.accent, border: 'none', borderRadius: 6,
          padding: '8px 16px', fontFamily: fontHead, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
        }}
      >
        Add
      </button>
    </div>
  );
}

function ProviderRow({ provider, expanded, onToggle, onAddKey, onDeleteKey, onDeleteProvider }) {
  const status = providerStatus(provider.keys);
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
      <button
        className="row-toggle"
        onClick={onToggle}
        aria-expanded={expanded}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px',
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <StatusDot color={statusColor(status)} pulse={status === 'healthy'} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: fontHead, fontSize: 14.5, fontWeight: 600, color: C.text }}>{provider.name}</div>
          <div style={{ fontFamily: fontHead, fontSize: 12, color: C.textFaint, marginTop: 1 }}>{provider.category}</div>
        </div>
        <span style={{ fontFamily: fontMono, fontSize: 12, color: statusColor(status), flexShrink: 0 }}>{statusLabel(status)}</span>
        <span style={{ fontFamily: fontMono, fontSize: 12, color: C.textFaint, flexShrink: 0, width: 64, textAlign: 'right' }}>
          {provider.keys.length} {provider.keys.length === 1 ? 'key' : 'keys'}
        </span>
        <button
          className="icon-btn danger"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Delete provider "${provider.name}" and all its keys?`)) {
              onDeleteProvider(provider.id);
            }
          }}
          aria-label="Delete provider"
          style={{ background: 'none', border: 'none', color: C.textFaint, cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', flexShrink: 0, marginLeft: 2 }}
        >
          <Trash2 size={14} />
        </button>
        <ChevronDown
          size={16}
          color={C.textFaint}
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
        />
      </button>
      <div style={{
        maxHeight: expanded ? 600 : 0, transition: 'max-height 0.25s ease',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${C.borderSoft}` }}>
          {provider.keys.length === 0 && (
            <p style={{ fontFamily: fontHead, fontSize: 13, color: C.textFaint, padding: '14px 0' }}>
              No keys yet — add one below to start routing {provider.name.toLowerCase()} requests.
            </p>
          )}
          {provider.keys.map(k => (
            <KeyRow key={k.id} k={k} onDelete={() => onDeleteKey(provider.id, k.id)} />
          ))}
          <AddKeyRow onAdd={raw => onAddKey(provider.id, raw)} />
        </div>
      </div>
    </div>
  );
}

function ProvidersTab({ providers, addProvider, deleteProvider, addKey, deleteKey }) {
  const [expandedId, setExpandedId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const submitAddProvider = () => {
    if (!newName.trim()) return;
    addProvider(newName.trim(), newCategory.trim());
    setNewName('');
    setNewCategory('');
    setShowAddModal(false);
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: fontHead, fontSize: 24, fontWeight: 600, color: C.text, margin: '0 0 6px' }}>Providers</h1>
          <p style={{ fontFamily: fontHead, fontSize: 14, color: C.textSoft, margin: 0 }}>Keys are grouped by category and rotated automatically.</p>
        </div>
        <button
          className="primary-btn"
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, background: C.accent, color: '#1A0F05',
            border: 'none', borderRadius: 7, padding: '9px 16px', fontFamily: fontHead,
            fontSize: 13.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
          }}
        >
          <Plus size={15} /> Add provider
        </button>
      </div>

      {providers.length === 0 && (
        <div style={{ background: C.panel, border: `1px dashed ${C.border}`, borderRadius: 10, padding: 40, textAlign: 'center' }}>
          <Server size={22} color={C.textFaint} style={{ marginBottom: 14 }} />
          <p style={{ fontFamily: fontHead, fontSize: 14, color: C.textSoft, margin: 0 }}>
            No providers yet. Add one to start routing requests.
          </p>
        </div>
      )}

      {providers.map(p => (
        <ProviderRow
          key={p.id}
          provider={p}
          expanded={expandedId === p.id}
          onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
          onAddKey={addKey}
          onDeleteKey={deleteKey}
          onDeleteProvider={deleteProvider}
        />
      ))}

      {showAddModal && (
        <Modal title="Add provider" onClose={() => setShowAddModal(false)}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontFamily: fontHead, fontSize: 12.5, color: C.textFaint, display: 'block', marginBottom: 6 }}>Provider name</label>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitAddProvider()}
              placeholder="e.g. Weather"
              style={{ width: '100%', boxSizing: 'border-box', background: C.bg, border: `1px solid ${C.borderSoft}`, borderRadius: 6, padding: '9px 12px', fontFamily: fontHead, fontSize: 13.5, color: C.text, outline: 'none' }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontFamily: fontHead, fontSize: 12.5, color: C.textFaint, display: 'block', marginBottom: 6 }}>Category</label>
            <input
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitAddProvider()}
              placeholder="e.g. Weather data"
              style={{ width: '100%', boxSizing: 'border-box', background: C.bg, border: `1px solid ${C.borderSoft}`, borderRadius: 6, padding: '9px 12px', fontFamily: fontHead, fontSize: 13.5, color: C.text, outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="secondary-btn" onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textSoft, borderRadius: 7, padding: '8px 16px', fontFamily: fontHead, fontSize: 13.5, cursor: 'pointer' }}>Cancel</button>
            <button className="primary-btn" onClick={submitAddProvider} style={{ background: C.accent, color: '#1A0F05', border: 'none', borderRadius: 7, padding: '8px 16px', fontFamily: fontHead, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Add provider</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function BrainTab({ brainKeys, addBrainKey, deleteBrainKey }) {
  const status = providerStatus(brainKeys);
  const active = brainKeys.filter(k => k.status === 'active').length;

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: fontHead, fontSize: 24, fontWeight: 600, color: C.text, margin: '0 0 6px' }}>Brain</h1>
          <p style={{ fontFamily: fontHead, fontSize: 14, color: C.textSoft, margin: 0, maxWidth: 480, lineHeight: 1.6 }}>
            These Gemini API keys power request classification. Relay rotates through them automatically, so if one key hits rate limits, the system never goes down.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 18, overflow: 'hidden' }}>
        <div style={{ flex: 1, padding: '16px 20px', borderRight: `1px solid ${C.borderSoft}` }}>
          <div style={{ fontFamily: fontMono, fontSize: 22, fontWeight: 500, color: C.text }}>{brainKeys.length}</div>
          <div style={{ fontFamily: fontHead, fontSize: 12, color: C.textFaint, marginTop: 3 }}>Total keys</div>
        </div>
        <div style={{ flex: 1, padding: '16px 20px', borderRight: `1px solid ${C.borderSoft}` }}>
          <div style={{ fontFamily: fontMono, fontSize: 22, fontWeight: 500, color: C.success }}>{active}</div>
          <div style={{ fontFamily: fontHead, fontSize: 12, color: C.textFaint, marginTop: 3 }}>Active</div>
        </div>
        <div style={{ flex: 1, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <StatusDot color={statusColor(status)} pulse={status === 'healthy'} />
            <span style={{ fontFamily: fontMono, fontSize: 15, color: statusColor(status) }}>{statusLabel(status)}</span>
          </div>
          <div style={{ fontFamily: fontHead, fontSize: 12, color: C.textFaint, marginTop: 5 }}>Pool status</div>
        </div>
      </div>

      <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 18px' }}>
        {brainKeys.length === 0 && (
          <p style={{ fontFamily: fontHead, fontSize: 13, color: C.textFaint, padding: '14px 0' }}>
            No brain keys yet — paste a Google Gemini API key below so Relay can classify incoming requests.
          </p>
        )}
        {brainKeys.map(k => (
          <KeyRow key={k.id} k={k} onDelete={() => deleteBrainKey(k.id)} />
        ))}
        <AddKeyRow onAdd={addBrainKey} placeholder="Paste a Google Gemini API key" />
      </div>
    </div>
  );
}

function RateLimitAlertBanner({ rateLimitedKeys }) {
  if (!rateLimitedKeys || rateLimitedKeys.length === 0) return null;
  return (
    <div style={{
      background: 'rgba(255,200,87,0.08)', border: `1px solid ${C.warning}`, borderRadius: 10,
      padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 12
    }}>
      <AlertTriangle size={18} color={C.warning} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: fontHead, fontSize: 13.5, fontWeight: 600, color: C.warning, marginBottom: 4 }}>
          Rate-Limit Alert ({rateLimitedKeys.length} key{rateLimitedKeys.length > 1 ? 's' : ''} in cooldown)
        </div>
        <div style={{ fontFamily: fontMono, fontSize: 12, color: C.textSoft }}>
          {rateLimitedKeys.map((k, i) => (
            <span key={k.id || i} style={{ display: 'inline-block', marginRight: 16 }}>
              • <strong style={{ color: C.text }}>{k.providerName}</strong>: {k.maskedKey || 'Key'} (Status: {k.status})
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function DatabaseStorageCard({ storage, onPrune }) {
  const [pruning, setPruning] = useState(false);
  const [pruneResult, setPruneResult] = useState(null);

  const handlePruneClick = async () => {
    setPruning(true);
    setPruneResult(null);
    try {
      const res = await fetch('/api/stats/cleanup', { method: 'POST' }).then(r => r.json());
      setPruneResult(res.message || 'Prune complete');
      if (onPrune) onPrune();
    } catch (e) {
      setPruneResult('Error pruning: ' + e.message);
    } finally {
      setPruning(false);
    }
  };

  const usedSize = storage?.estimatedSizeFormatted || '12.4 KB';
  const quotaPct = storage?.quotaPercentage || '0.002%';
  const counts = storage?.counts || { activityLogs: 0, clientKeys: 0, brainKeys: 0, providerKeys: 0 };

  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: '20px 22px', marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <HardDrive size={16} color={C.accent} />
          <div style={{ fontFamily: fontHead, fontSize: 13, fontWeight: 600, color: C.text }}>
            Database Storage & Self-Cleaning Quota (Supabase 500 MB Free Tier)
          </div>
        </div>
        <button
          onClick={handlePruneClick}
          disabled={pruning}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, background: C.panelAlt,
            border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 12px',
            fontFamily: fontHead, fontSize: 12, color: C.textSoft, cursor: pruning ? 'not-allowed' : 'pointer'
          }}
        >
          <RefreshCw size={12} className={pruning ? 'spin' : ''} />
          {pruning ? 'Purging Old Data...' : 'Prune & Clean Storage'}
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{ background: C.panelAlt, borderRadius: 6, height: 8, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{
          background: C.accent,
          height: '100%',
          width: '2%', // Visual minimum
          transition: 'width 0.4s ease'
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div style={{ fontFamily: fontMono, fontSize: 13, color: C.text }}>
          Storage Used: <span style={{ color: C.accent, fontWeight: 600 }}>{usedSize}</span> / 500 MB <span style={{ color: C.textFaint }}>({quotaPct})</span>
        </div>
        <div style={{ fontFamily: fontHead, fontSize: 12, color: C.success, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.success }} />
          Auto-Purge &gt; 7 Days Active (Capped at 2,500 logs)
        </div>
      </div>

      {/* Table Row Counts */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 120px', background: C.bg, border: `1px solid ${C.borderSoft}`, borderRadius: 6, padding: '8px 12px' }}>
          <div style={{ fontFamily: fontMono, fontSize: 16, color: C.text }}>{counts.activityLogs}</div>
          <div style={{ fontFamily: fontHead, fontSize: 11.5, color: C.textFaint }}>Activity Logs</div>
        </div>
        <div style={{ flex: '1 1 120px', background: C.bg, border: `1px solid ${C.borderSoft}`, borderRadius: 6, padding: '8px 12px' }}>
          <div style={{ fontFamily: fontMono, fontSize: 16, color: C.text }}>{counts.clientKeys}</div>
          <div style={{ fontFamily: fontHead, fontSize: 11.5, color: C.textFaint }}>Client Keys</div>
        </div>
        <div style={{ flex: '1 1 120px', background: C.bg, border: `1px solid ${C.borderSoft}`, borderRadius: 6, padding: '8px 12px' }}>
          <div style={{ fontFamily: fontMono, fontSize: 16, color: C.text }}>{counts.brainKeys}</div>
          <div style={{ fontFamily: fontHead, fontSize: 11.5, color: C.textFaint }}>Brain Keys</div>
        </div>
        <div style={{ flex: '1 1 120px', background: C.bg, border: `1px solid ${C.borderSoft}`, borderRadius: 6, padding: '8px 12px' }}>
          <div style={{ fontFamily: fontMono, fontSize: 16, color: C.text }}>{counts.providerKeys}</div>
          <div style={{ fontFamily: fontHead, fontSize: 11.5, color: C.textFaint }}>Provider Keys</div>
        </div>
      </div>

      {pruneResult && (
        <div style={{ fontFamily: fontMono, fontSize: 12, color: C.success, marginTop: 10 }}>
          ✓ {pruneResult}
        </div>
      )}
    </div>
  );
}

function StatLedger({ providers, brainKeys, stats }) {
  const totalKeys = providers.reduce((s, p) => s + (p.keys?.length || 0), 0) + brainKeys.length;
  const activeProviders = providers.filter(p => providerStatus(p.keys) === 'healthy' || providerStatus(p.keys) === 'degraded').length;
  const failed24h = stats?.failed24h ?? 0;
  const brainState = providerStatus(brainKeys);

  const statItems = [
    { label: 'Requests today', value: stats?.requestsToday ?? 0 },
    { label: 'Active providers', value: activeProviders },
    { label: 'Total keys in pool', value: totalKeys },
    { label: 'Rate-limited keys', value: failed24h, color: failed24h > 0 ? C.warning : C.text },
    { label: 'Storage used', value: stats?.storage?.estimatedSizeFormatted || '12 KB' },
    { label: 'Brain status', value: statusLabel(brainState), color: statusColor(brainState) },
  ];

  return (
    <div style={{
      display: 'flex', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10,
      marginBottom: 28, overflow: 'hidden', flexWrap: 'wrap',
    }}>
      {statItems.map((s, i) => (
        <div key={s.label} style={{
          flex: '1 1 120px', padding: '16px 20px', borderRight: i < statItems.length - 1 ? `1px solid ${C.borderSoft}` : 'none',
        }}>
          <div style={{ fontFamily: fontMono, fontSize: 22, fontWeight: 500, color: s.color || C.text, marginBottom: 4 }}>{s.value}</div>
          <div style={{ fontFamily: fontHead, fontSize: 12, color: C.textFaint }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function RoutingFlow({ brainHealthy }) {
  const steps = [
    { n: 1, label: 'Request in', icon: Radio },
    { n: 2, label: 'Brain classifies', icon: Brain },
    { n: 3, label: 'Category matched', icon: Tags },
    { n: 4, label: 'Provider selected', icon: Server },
    { n: 5, label: 'Key rotated', icon: KeyRound },
    { n: 6, label: 'Response streamed', icon: Send },
  ];
  return (
    <div style={{
      background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: '22px 24px', marginBottom: 24, overflowX: 'auto',
    }}>
      <div style={{ fontFamily: fontHead, fontSize: 13, fontWeight: 600, color: C.textSoft, marginBottom: 18 }}>Routing sequence</div>
      <div style={{ display: 'flex', alignItems: 'center', minWidth: 560 }}>
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isLive = i === 1;
          const stepBroken = isLive && !brainHealthy;
          return (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 92 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center',
                  background: stepBroken ? C.dangerSoft : (isLive ? C.accentSoft : C.panelAlt),
                  border: `1px solid ${stepBroken ? C.danger : (isLive ? C.accent : C.borderSoft)}`,
                  position: 'relative',
                }}>
                  <Icon size={15} color={stepBroken ? C.danger : (isLive ? C.accent : C.textSoft)} />
                  {isLive && (
                    <span style={{
                      position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%',
                      background: stepBroken ? C.danger : C.accent,
                      animation: stepBroken ? 'none' : 'pulseDot 2s ease-in-out infinite',
                    }} />
                  )}
                </div>
                <div style={{ fontFamily: fontMono, fontSize: 10.5, color: C.textFaint, marginTop: 8 }}>{s.n}</div>
                <div style={{ fontFamily: fontHead, fontSize: 11.5, color: stepBroken ? C.danger : C.textSoft, textAlign: 'center', marginTop: 2, lineHeight: 1.3 }}>
                  {stepBroken ? 'Brain offline' : s.label}
                </div>
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: 1, background: C.borderSoft, marginBottom: 28 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RequestChart({ chartData }) {
  const displayData = chartData && chartData.length > 0
    ? chartData
    : [
      { day: 'Sun', requests: 0 },
      { day: 'Mon', requests: 0 },
      { day: 'Tue', requests: 0 },
      { day: 'Wed', requests: 0 },
      { day: 'Thu', requests: 0 },
      { day: 'Fri', requests: 0 },
      { day: 'Sat', requests: 0 },
    ];

  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: '20px 22px', marginBottom: 24 }}>
      <div style={{ fontFamily: fontHead, fontSize: 13, fontWeight: 600, color: C.textSoft, marginBottom: 16 }}>Live Requests, Last 7 Days (Real Aggregation)</div>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={displayData} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="reqFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.accent} stopOpacity={0.35} />
                <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={C.borderSoft} vertical={false} />
            <XAxis dataKey="day" tick={{ fill: C.textFaint, fontFamily: fontMono, fontSize: 11 }} axisLine={{ stroke: C.borderSoft }} tickLine={false} />
            <YAxis tick={{ fill: C.textFaint, fontFamily: fontMono, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: C.panelAlt, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: fontMono, fontSize: 12 }}
              labelStyle={{ color: C.textSoft }}
              itemStyle={{ color: C.accent }}
            />
            <Area type="monotone" dataKey="requests" stroke={C.accent} strokeWidth={2} fill="url(#reqFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ProviderBreakdown({ providers, providerStats }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: '20px 22px', marginBottom: 24, overflowX: 'auto' }}>
      <div style={{ fontFamily: fontHead, fontSize: 13, fontWeight: 600, color: C.textSoft, marginBottom: 14 }}>Real Provider Breakdown</div>
      <div style={{ display: 'flex', fontFamily: fontHead, fontSize: 11.5, color: C.textFaint, padding: '0 0 8px', borderBottom: `1px solid ${C.borderSoft}`, minWidth: 520 }}>
        <span style={{ flex: 2 }}>Provider</span>
        <span style={{ flex: 1, textAlign: 'right' }}>Requests routed</span>
        <span style={{ flex: 1, textAlign: 'right' }}>Active keys</span>
        <span style={{ flex: 1, textAlign: 'right' }}>Issues</span>
        <span style={{ flex: 1, textAlign: 'right' }}>Success rate</span>
      </div>
      {providers.length === 0 && (
        <p style={{ fontFamily: fontHead, fontSize: 13, color: C.textFaint, padding: '14px 0 0' }}>No providers to report on yet.</p>
      )}
      {providers.map(p => {
        const stats = (providerStats && providerStats[p.id]) || { routed: 0, successRate: 100 };
        const active = p.keys ? p.keys.filter(k => k.status === 'active').length : 0;
        const issues = p.keys ? p.keys.filter(k => k.status !== 'active').length : 0;
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.borderSoft}`, fontFamily: fontMono, fontSize: 13, minWidth: 520 }}>
            <span style={{ flex: 2, fontFamily: fontHead, fontSize: 13.5, color: C.text }}>{p.name}</span>
            <span style={{ flex: 1, textAlign: 'right', color: C.textSoft }}>{stats.routed}</span>
            <span style={{ flex: 1, textAlign: 'right', color: C.success }}>{active}</span>
            <span style={{ flex: 1, textAlign: 'right', color: issues > 0 ? C.warning : C.textFaint }}>{issues}</span>
            <span style={{ flex: 1, textAlign: 'right', color: stats.successRate > 90 ? C.success : C.warning }}>{stats.successRate}%</span>
          </div>
        );
      })}
    </div>
  );
}

function LiveStreamTester({ apiKey }) {
  const [query, setQuery] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamLog, setStreamLog] = useState([]);
  const [multimodal, setMultimodal] = useState(null);
  const [activeMediaTab, setActiveMediaTab] = useState('console'); // console | articles | images | videos | audio | data

  const handleTestSearch = async () => {
    if (!query.trim()) return;
    setStreaming(true);
    setStreamLog([]);
    setMultimodal(null);
    setActiveMediaTab('console');

    const keyParam = apiKey?.raw || 'test_preview_key';
    const endpoint = `/api/v1/search?key=${encodeURIComponent(keyParam)}&q=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(endpoint);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'multimodal') {
                setMultimodal(data.media);
              }
              setStreamLog(prev => [...prev, data]);
            } catch (e) {
              // Non-json chunk
            }
          }
        }
      }
    } catch (err) {
      setStreamLog(prev => [...prev, { type: 'error', message: err.message }]);
    } finally {
      setStreaming(false);
    }
  };

  const articlesCount = multimodal?.articles?.length || 0;
  const imagesCount = multimodal?.images?.length || 0;
  const videosCount = multimodal?.videos?.length || 0;
  const audiosCount = multimodal?.audios?.length || 0;

  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: '20px 22px', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Terminal size={16} color={C.accent} />
        <div style={{ fontFamily: fontHead, fontSize: 13, fontWeight: 600, color: C.text }}>
          Multimodal Live Search Engine (Text, Images, Video, Audio &amp; Data)
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !streaming && handleTestSearch()}
          placeholder="Enter query (e.g. 'James Webb telescope deep space' or 'latest AI models')"
          style={{
            flex: 1, background: C.bg, border: `1px solid ${C.borderSoft}`, borderRadius: 6,
            padding: '9px 12px', fontFamily: fontMono, fontSize: 13, color: C.text, outline: 'none',
          }}
        />
        <button
          className="primary-btn"
          disabled={streaming}
          onClick={handleTestSearch}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, background: C.accent, color: '#1A0F05',
            border: 'none', borderRadius: 6, padding: '9px 18px', fontFamily: fontHead,
            fontSize: 13, fontWeight: 600, cursor: streaming ? 'not-allowed' : 'pointer', opacity: streaming ? 0.6 : 1,
          }}
        >
          <Play size={13} fill="#1A0F05" /> {streaming ? 'Streaming...' : 'Run Query'}
        </button>
      </div>

      {/* Multimodal Filter Tabs */}
      {streamLog.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
          <button
            onClick={() => setActiveMediaTab('console')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 5,
              border: `1px solid ${activeMediaTab === 'console' ? C.accent : C.border}`,
              background: activeMediaTab === 'console' ? C.accentSoft : C.bg,
              color: activeMediaTab === 'console' ? C.accent : C.textSoft,
              fontFamily: fontHead, fontSize: 12, cursor: 'pointer'
            }}
          >
            <Terminal size={12} /> Stream Console
          </button>
          <button
            onClick={() => setActiveMediaTab('articles')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 5,
              border: `1px solid ${activeMediaTab === 'articles' ? C.accent : C.border}`,
              background: activeMediaTab === 'articles' ? C.accentSoft : C.bg,
              color: activeMediaTab === 'articles' ? C.accent : C.textSoft,
              fontFamily: fontHead, fontSize: 12, cursor: 'pointer'
            }}
          >
            <Layers size={12} /> Articles ({articlesCount})
          </button>
          <button
            onClick={() => setActiveMediaTab('images')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 5,
              border: `1px solid ${activeMediaTab === 'images' ? C.accent : C.border}`,
              background: activeMediaTab === 'images' ? C.accentSoft : C.bg,
              color: activeMediaTab === 'images' ? C.accent : C.textSoft,
              fontFamily: fontHead, fontSize: 12, cursor: 'pointer'
            }}
          >
            <ImageIcon size={12} /> Images ({imagesCount})
          </button>
          <button
            onClick={() => setActiveMediaTab('videos')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 5,
              border: `1px solid ${activeMediaTab === 'videos' ? C.accent : C.border}`,
              background: activeMediaTab === 'videos' ? C.accentSoft : C.bg,
              color: activeMediaTab === 'videos' ? C.accent : C.textSoft,
              fontFamily: fontHead, fontSize: 12, cursor: 'pointer'
            }}
          >
            <VideoIcon size={12} /> Videos ({videosCount})
          </button>
          <button
            onClick={() => setActiveMediaTab('audio')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 5,
              border: `1px solid ${activeMediaTab === 'audio' ? C.accent : C.border}`,
              background: activeMediaTab === 'audio' ? C.accentSoft : C.bg,
              color: activeMediaTab === 'audio' ? C.accent : C.textSoft,
              fontFamily: fontHead, fontSize: 12, cursor: 'pointer'
            }}
          >
            <AudioIcon size={12} /> Audio ({audiosCount})
          </button>
          <button
            onClick={() => setActiveMediaTab('data')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 5,
              border: `1px solid ${activeMediaTab === 'data' ? C.accent : C.border}`,
              background: activeMediaTab === 'data' ? C.accentSoft : C.bg,
              color: activeMediaTab === 'data' ? C.accent : C.textSoft,
              fontFamily: fontHead, fontSize: 12, cursor: 'pointer'
            }}
          >
            <DbIcon size={12} /> Structured Data
          </button>
        </div>
      )}

      {/* Media Display Panels */}
      {streamLog.length > 0 && (
        <div style={{ background: C.bg, border: `1px solid ${C.borderSoft}`, borderRadius: 6, padding: '14px', maxHeight: 320, overflowY: 'auto' }}>
          
          {/* 1. Raw Stream Console */}
          {activeMediaTab === 'console' && (
            <div>
              {streamLog.map((item, idx) => (
                <div key={idx} style={{ fontFamily: fontMono, fontSize: 12, lineHeight: 1.5, color: item.type === 'error' ? C.danger : item.type === 'classified' ? C.accent : C.textSoft, marginBottom: 4 }}>
                  {item.type === 'status' && `[STATUS] ${item.message}`}
                  {item.type === 'classified' && `[BRAIN] Matched category "${item.category}" via key ${item.brainKey} in ${item.classificationLatencyMs}ms`}
                  {item.type === 'meta' && `[ROUTED] Assigned to ${item.provider.name} provider (${item.keyUsed})`}
                  {item.type === 'chunk' && `${item.content}`}
                  {item.type === 'done' && `[DONE] Stream finished successfully at ${item.completedAt}`}
                  {item.type === 'error' && `[ERROR] ${item.message}`}
                </div>
              ))}
            </div>
          )}

          {/* 2. Articles View */}
          {activeMediaTab === 'articles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {articlesCount === 0 && <div style={{ fontFamily: fontMono, fontSize: 12, color: C.textFaint }}>No articles found for this query yet.</div>}
              {multimodal?.articles?.map((art, idx) => (
                <div key={idx} style={{ background: C.panelAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ fontFamily: fontHead, fontSize: 13.5, fontWeight: 600, color: C.text }}>{art.title}</div>
                    <span style={{ background: C.panel, padding: '2px 6px', borderRadius: 4, fontFamily: fontMono, fontSize: 10.5, color: C.accent, flexShrink: 0 }}>
                      {art.source}
                    </span>
                  </div>
                  <div style={{ fontFamily: fontHead, fontSize: 12.5, color: C.textSoft, margin: '6px 0 8px', lineHeight: 1.4 }}>
                    {art.snippet}
                  </div>
                  {art.url && (
                    <a href={art.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: C.accent, fontFamily: fontMono, fontSize: 11.5, textDecoration: 'none' }}>
                      Read full source <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 3. Images Gallery Grid */}
          {activeMediaTab === 'images' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {imagesCount === 0 && <div style={{ fontFamily: fontMono, fontSize: 12, color: C.textFaint, gridColumn: '1 / -1' }}>No images returned for this query.</div>}
              {multimodal?.images?.map((img, idx) => (
                <div key={idx} style={{ background: C.panelAlt, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: 100, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <img
                      src={img.thumbnail || img.url}
                      alt={img.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <div style={{ padding: '6px 8px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ fontFamily: fontHead, fontSize: 11, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                      {img.title}
                    </div>
                    <a href={img.url} target="_blank" rel="noreferrer" style={{ color: C.accent, fontFamily: fontMono, fontSize: 10, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      Open full image <ExternalLink size={9} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 4. Videos View */}
          {activeMediaTab === 'videos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {videosCount === 0 && <div style={{ fontFamily: fontMono, fontSize: 12, color: C.textFaint }}>No video matches found.</div>}
              {multimodal?.videos?.map((vid, idx) => (
                <div key={idx} style={{ background: C.panelAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: '12px', display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 8, background: C.dangerSoft, border: `1px solid ${C.danger}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <VideoIcon size={20} color={C.danger} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: fontHead, fontSize: 13, fontWeight: 600, color: C.text }}>{vid.title}</div>
                    <div style={{ fontFamily: fontMono, fontSize: 11, color: C.textFaint, marginTop: 2 }}>
                      {vid.source} • Duration: {vid.duration || 'Stream'}
                    </div>
                  </div>
                  <a href={vid.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, background: C.accent, color: '#1A0F05', padding: '6px 12px', borderRadius: 5, fontFamily: fontHead, fontSize: 11.5, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
                    <Play size={11} fill="#1A0F05" /> Watch
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* 5. Audio / Podcast View */}
          {activeMediaTab === 'audio' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {audiosCount === 0 && <div style={{ fontFamily: fontMono, fontSize: 12, color: C.textFaint }}>No audio streams found.</div>}
              {multimodal?.audios?.map((aud, idx) => (
                <div key={idx} style={{ background: C.panelAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: '12px', display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 8, background: C.accentSoft, border: `1px solid ${C.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AudioIcon size={20} color={C.accent} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: fontHead, fontSize: 13, fontWeight: 600, color: C.text }}>{aud.title}</div>
                    <div style={{ fontFamily: fontMono, fontSize: 11, color: C.textFaint, marginTop: 2 }}>
                      {aud.source} • {aud.format}
                    </div>
                  </div>
                  <a href={aud.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, background: C.panel, border: `1px solid ${C.border}`, color: C.text, padding: '6px 12px', borderRadius: 5, fontFamily: fontHead, fontSize: 11.5, textDecoration: 'none', flexShrink: 0 }}>
                    Listen Stream <ExternalLink size={11} />
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* 6. Structured Data View */}
          {activeMediaTab === 'data' && (
            <div>
              {multimodal?.structuredData ? (
                <pre style={{ margin: 0, fontFamily: fontMono, fontSize: 11.5, color: C.accent, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(multimodal.structuredData, null, 2)}
                </pre>
              ) : (
                <div style={{ fontFamily: fontMono, fontSize: 12, color: C.textFaint }}>No structured data table available for this query.</div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function ActivityFeed({ log }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ fontFamily: fontHead, fontSize: 13, fontWeight: 600, color: C.textSoft }}>Live Activity Logs</div>
        <StatusDot color={C.success} pulse />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {(!log || log.length === 0) ? (
          <div style={{ fontFamily: fontMono, fontSize: 12, color: C.textFaint, padding: '10px 0' }}>No activity yet. Run a search query above to see live events.</div>
        ) : (
          log.map((entry, i) => (
            <div
              key={entry.id || i}
              style={{
                display: 'flex', gap: 12, padding: '7px 0', borderBottom: `1px solid ${C.borderSoft}`,
                animation: i === 0 ? 'rowIn 0.3s ease-out' : 'none',
              }}
            >
              <span style={{ fontFamily: fontMono, fontSize: 11.5, color: C.textFaint, flexShrink: 0, width: 66 }}>{entry.time}</span>
              <span style={{ fontFamily: fontMono, fontSize: 12.5, color: C.textSoft }}>
                Request <span style={{ color: C.text }}>{entry.text}</span> via <span style={{ color: C.textFaint }}>{entry.brainLabel}</span> → routed to <span style={{ color: C.accent }}>{entry.providerName}</span>, {entry.keyLabel}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DashboardTab({ providers, brainKeys, stats, apiKey, onPruneDatabase }) {
  const brainHealthy = providerStatus(brainKeys) !== 'failing' && providerStatus(brainKeys) !== 'empty';

  return (
    <div style={{ maxWidth: 840 }}>
      <h1 style={{ fontFamily: fontHead, fontSize: 24, fontWeight: 600, color: C.text, margin: '0 0 24px' }}>Dashboard</h1>
      
      {/* Rate-Limited Keys Warning Alert */}
      <RateLimitAlertBanner rateLimitedKeys={stats?.rateLimitedKeys} />

      {/* Main Stat Ledger (Real Live Numbers) */}
      <StatLedger providers={providers} brainKeys={brainKeys} stats={stats} />

      {/* Database Storage & Self-Cleaning Quota Monitor */}
      <DatabaseStorageCard storage={stats?.storage} onPrune={onPruneDatabase} />

      {/* Multimodal Live Stream Tester (Text, Images, Video, Audio, Data) */}
      <LiveStreamTester apiKey={apiKey} />

      {/* Routing Sequence Flow */}
      <RoutingFlow brainHealthy={brainHealthy} />

      {/* Real 7-Day Request Chart */}
      <RequestChart chartData={stats?.chartData} />

      {/* Real Provider Breakdown Table */}
      <ProviderBreakdown providers={providers} providerStats={stats?.providerStats} />

      {/* Live Activity Feed */}
      <ActivityFeed log={stats?.activityLog} />
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState('key');
  const [apiKey, setApiKey] = useState(null);
  const [providers, setProviders] = useState([]);
  const [brainKeys, setBrainKeys] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch initial state from backend
  const refreshAllData = async () => {
    try {
      const [keyRes, brainRes, providersRes, statsRes] = await Promise.all([
        fetch('/api/keys').then(r => r.json()),
        fetch('/api/brain').then(r => r.json()),
        fetch('/api/providers').then(r => r.json()),
        fetch('/api/stats').then(r => r.json()),
      ]);

      if (keyRes?.apiKey) setApiKey(keyRes.apiKey);
      if (brainRes?.keys) setBrainKeys(brainRes.keys);
      if (providersRes?.providers) setProviders(providersRes.providers);
      if (statsRes) setStats(statsRes);
    } catch (err) {
      console.error('Error loading data from server:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();
    const interval = setInterval(refreshAllData, 8000);
    return () => clearInterval(interval);
  }, []);

  const generateKey = async () => {
    try {
      const res = await fetch('/api/keys', { method: 'POST' });
      const data = await res.json();
      if (data?.apiKey) setApiKey(data.apiKey);
    } catch (err) {
      console.error('Failed to generate key:', err);
    }
  };

  const revokeKey = async () => {
    try {
      await fetch('/api/keys', { method: 'DELETE' });
      setApiKey(null);
    } catch (err) {
      console.error('Failed to revoke key:', err);
    }
  };

  const handleAddBrainKey = async raw => {
    try {
      const res = await fetch('/api/brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: raw }),
      });
      const data = await res.json();
      if (data?.key) setBrainKeys(prev => [...prev, data.key]);
    } catch (err) {
      console.error('Failed to add brain key:', err);
    }
  };

  const handleDeleteBrainKey = async keyId => {
    try {
      await fetch(`/api/brain/${keyId}`, { method: 'DELETE' });
      setBrainKeys(prev => prev.filter(k => k.id !== keyId));
    } catch (err) {
      console.error('Failed to delete brain key:', err);
    }
  };

  const handleAddProvider = async (name, category) => {
    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category }),
      });
      const data = await res.json();
      if (data?.provider) setProviders(prev => [...prev, data.provider]);
    } catch (err) {
      console.error('Failed to add provider:', err);
    }
  };

  const handleDeleteProvider = async id => {
    try {
      await fetch(`/api/providers/${id}`, { method: 'DELETE' });
      setProviders(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Failed to delete provider:', err);
    }
  };

  const handleAddProviderKey = async (providerId, raw) => {
    try {
      const res = await fetch(`/api/providers/${providerId}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: raw }),
      });
      const data = await res.json();
      if (data?.key) {
        setProviders(prev => prev.map(p => p.id === providerId
          ? { ...p, keys: [...p.keys, data.key] }
          : p
        ));
      }
    } catch (err) {
      console.error('Failed to add provider key:', err);
    }
  };

  const handleDeleteProviderKey = async (providerId, keyId) => {
    try {
      await fetch(`/api/providers/${providerId}/keys/${keyId}`, { method: 'DELETE' });
      setProviders(prev => prev.map(p => p.id === providerId
        ? { ...p, keys: p.keys.filter(k => k.id !== keyId) }
        : p
      ));
    } catch (err) {
      console.error('Failed to delete provider key:', err);
    }
  };

  const brainStatus = providerStatus(brainKeys);

  return (
    <div style={{
      display: 'flex', height: '100vh', background: C.bg,
      fontFamily: fontHead, minWidth: 900, overflowX: 'auto',
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes pulseDot {
          0%, 100% { box-shadow: 0 0 0 0 rgba(62,207,142,0.5); }
          50% { box-shadow: 0 0 0 4px rgba(62,207,142,0); }
        }
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(-4px); background: ${C.accentSoft}; }
          to { opacity: 1; transform: translateY(0); background: transparent; }
        }
        input::placeholder { color: ${C.textFaint}; }
        input:focus { border-color: ${C.accent} !important; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }

        button { font: inherit; }
        button:focus-visible, input:focus-visible, [role="dialog"] button:focus-visible {
          outline: 2px solid ${C.accent};
          outline-offset: 2px;
        }
        .nav-btn:hover { background: ${C.panelHover} !important; color: ${C.text} !important; }
        .nav-btn[aria-current="page"]:hover { background: ${C.accentSoftHover} !important; color: ${C.accent} !important; }
        .icon-btn:hover { background: ${C.panelHover}; }
        .icon-btn.danger:hover { background: ${C.dangerSoft}; color: ${C.danger} !important; }
        .row-toggle:hover { background: ${C.panelHover}; }
        .primary-btn:hover { filter: brightness(1.08); }
        .secondary-btn:hover { background: ${C.panelHover} !important; }
        .secondary-btn.danger:hover { background: ${C.dangerSoft} !important; }
        .add-btn:hover { background: ${C.accentSoftHover} !important; }
      `}</style>
      <Sidebar active={active} setActive={setActive} brainStatus={brainStatus} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '36px 44px' }}>
        {active === 'key' && <MyKeyTab apiKey={apiKey} generateKey={generateKey} revokeKey={revokeKey} />}
        {active === 'brain' && <BrainTab brainKeys={brainKeys} addBrainKey={handleAddBrainKey} deleteBrainKey={handleDeleteBrainKey} />}
        {active === 'providers' && (
          <ProvidersTab
            providers={providers}
            addProvider={handleAddProvider}
            deleteProvider={handleDeleteProvider}
            addKey={handleAddProviderKey}
            deleteKey={handleDeleteProviderKey}
          />
        )}
        {active === 'dashboard' && (
          <DashboardTab
            providers={providers}
            brainKeys={brainKeys}
            stats={stats}
            apiKey={apiKey}
            onPruneDatabase={refreshAllData}
          />
        )}
      </div>
    </div>
  );
}
