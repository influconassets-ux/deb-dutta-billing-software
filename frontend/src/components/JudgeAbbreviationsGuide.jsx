import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Scale, ArrowRight, Plus, Trash2, BookPlus } from 'lucide-react';
import { JUDGE_ABBREVIATION_GROUPS } from '../utils/judgeAbbreviations';

export default function JudgeAbbreviationsGuide({ onClose, customAbbreviations = [], onAddCustom, onRemoveCustom, hiddenBuiltinAbbreviations = [], onHideBuiltin }) {
  const [activeTab, setActiveTab] = useState('reference'); // 'reference' or 'custom'
  const [query, setQuery] = useState('');
  const [newAbbr, setNewAbbr] = useState('');
  const [newFull, setNewFull] = useState('');
  const [saving, setSaving] = useState(false);
  const [removingIndex, setRemovingIndex] = useState(null);
  const [removingBuiltinAbbr, setRemovingBuiltinAbbr] = useState(null);
  const [formError, setFormError] = useState('');

  const visibleGroups = useMemo(() => {
    const hiddenSet = new Set(hiddenBuiltinAbbreviations.map(a => a.toLowerCase()));
    if (hiddenSet.size === 0) return JUDGE_ABBREVIATION_GROUPS;
    return JUDGE_ABBREVIATION_GROUPS
      .map(group => ({
        ...group,
        // A display row like "Addl. CJM / ACJM" covers multiple real short forms -
        // hide the row only once every one of those has been removed.
        items: group.items.filter(
          ({ abbr }) => !abbr.split('/').map(a => a.trim().toLowerCase()).every(a => hiddenSet.has(a))
        )
      }))
      .filter(group => group.items.length > 0);
  }, [hiddenBuiltinAbbreviations]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visibleGroups;
    return visibleGroups
      .map(group => ({
        ...group,
        items: group.items.filter(
          ({ abbr, full }) => abbr.toLowerCase().includes(q) || full.toLowerCase().includes(q)
        )
      }))
      .filter(group => group.items.length > 0);
  }, [query, visibleGroups]);

  const handleRemoveBuiltin = async (abbr) => {
    const abbrsToHide = abbr.split('/').map(a => a.trim());
    setRemovingBuiltinAbbr(abbr);
    try {
      await onHideBuiltin(abbrsToHide);
    } finally {
      setRemovingBuiltinAbbr(null);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const abbr = newAbbr.trim();
    const full = newFull.trim();
    if (!abbr || !full) {
      setFormError('Enter both a short form and its full form.');
      return;
    }
    const isDuplicate = customAbbreviations.some(c => c.abbr.toLowerCase() === abbr.toLowerCase());
    if (isDuplicate) {
      setFormError(`"${abbr}" is already in your list.`);
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      await onAddCustom(abbr, full);
      setNewAbbr('');
      setNewFull('');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (index) => {
    setRemovingIndex(index);
    try {
      await onRemoveCustom(index);
    } finally {
      setRemovingIndex(null);
    }
  };

  const tabBtnStyle = (tab) => ({
    flex: 1, padding: '10px', background: 'transparent', border: 'none',
    borderBottom: activeTab === tab ? '2px solid #D4AF37' : '2px solid transparent',
    color: activeTab === tab ? '#D4AF37' : '#888',
    fontWeight: activeTab === tab ? '700' : '500', cursor: 'pointer', fontSize: '0.9rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
  });

  return createPortal(
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)',
        zIndex: 1400, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '720px', maxHeight: '85vh',
          display: 'flex', flexDirection: 'column',
          padding: 0, overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem 1.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.3)', color: '#D4AF37'
            }}>
              <Scale size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: 'white' }}>
                Coram Abbreviation Guide
              </h2>
              <p style={{ color: '#a1a1aa', margin: '2px 0 0 0', fontSize: '0.85rem' }}>
                Short forms are expanded automatically — here's what each one means.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer',
              padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 1rem' }}>
          <button type="button" onClick={() => setActiveTab('reference')} style={tabBtnStyle('reference')}>
            <Scale size={14} /> Reference List
          </button>
          <button type="button" onClick={() => setActiveTab('custom')} style={tabBtnStyle('custom')}>
            <BookPlus size={14} /> My Abbreviations {customAbbreviations.length > 0 && `(${customAbbreviations.length})`}
          </button>
        </div>

        {activeTab === 'reference' ? (
          <>
            {/* Search */}
            <div style={{ padding: '1rem 1.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa' }} />
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search abbreviation or full title..."
                  style={{
                    width: '100%', padding: '10px 10px 10px 36px', boxSizing: 'border-box',
                    background: '#111', border: '1px solid #333', borderRadius: '6px',
                    color: 'white', fontSize: '0.9rem', outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Groups */}
            <div style={{ overflowY: 'auto', padding: '1.25rem 1.75rem 1.75rem' }}>
              {filteredGroups.length === 0 ? (
                <p style={{ color: '#a1a1aa', textAlign: 'center', padding: '2rem 0' }}>No matches found.</p>
              ) : (
                filteredGroups.map((group) => (
                  <div key={group.title} style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{
                      fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase',
                      color: '#D4AF37', margin: '0 0 0.75rem 0'
                    }}>
                      {group.title}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {group.items.map(({ abbr, full }) => (
                        <div
                          key={abbr}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '10px 12px', borderRadius: '8px',
                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)'
                          }}
                        >
                          <span style={{
                            flexShrink: 0, minWidth: '0', fontWeight: '700', fontSize: '0.85rem',
                            color: '#D4AF37', background: 'rgba(212, 175, 55, 0.12)',
                            border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '6px',
                            padding: '4px 10px', whiteSpace: 'nowrap'
                          }}>
                            {abbr}
                          </span>
                          <ArrowRight size={14} color="#555" style={{ flexShrink: 0 }} />
                          <span style={{ color: '#eee', fontSize: '0.9rem', flex: 1 }}>{full}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveBuiltin(abbr)}
                            disabled={removingBuiltinAbbr === abbr}
                            title="Remove from guide"
                            style={{
                              background: 'transparent', border: 'none', color: '#888', cursor: 'pointer',
                              padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0, transition: 'color 0.15s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div style={{ overflowY: 'auto', padding: '1.5rem 1.75rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Add form */}
            <form onSubmit={handleAdd} style={{
              background: 'rgba(212, 175, 55, 0.05)', border: '1px solid rgba(212, 175, 55, 0.2)',
              borderRadius: '10px', padding: '1rem'
            }}>
              <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.8rem', color: '#a1a1aa' }}>
                Add your own short form once — it's remembered and auto-expanded everywhere from then on.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr auto', gap: '10px', alignItems: 'end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Short Form</label>
                  <input
                    type="text"
                    value={newAbbr}
                    onChange={(e) => { setNewAbbr(e.target.value); setFormError(''); }}
                    placeholder="e.g. Spl. J."
                    style={{
                      padding: '9px 10px', background: '#111', border: '1px solid #333', borderRadius: '6px',
                      color: 'white', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Full Form</label>
                  <input
                    type="text"
                    value={newFull}
                    onChange={(e) => { setNewFull(e.target.value); setFormError(''); }}
                    placeholder="e.g. Special Judge"
                    style={{
                      padding: '9px 10px', background: '#111', border: '1px solid #333', borderRadius: '6px',
                      color: 'white', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
                    background: '#D4AF37', border: 'none', borderRadius: '6px', color: '#000',
                    fontWeight: '700', fontSize: '0.85rem', cursor: saving ? 'default' : 'pointer',
                    opacity: saving ? 0.7 : 1, whiteSpace: 'nowrap'
                  }}
                >
                  <Plus size={15} /> {saving ? 'Saving...' : 'Add'}
                </button>
              </div>
              {formError && (
                <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '0.6rem 0 0 0' }}>{formError}</p>
              )}
            </form>

            {/* Custom list */}
            <div>
              <h3 style={{
                fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase',
                color: '#D4AF37', margin: '0 0 0.75rem 0'
              }}>
                Your Abbreviations
              </h3>
              {customAbbreviations.length === 0 ? (
                <p style={{ color: '#666', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
                  You haven't added any custom abbreviations yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {customAbbreviations.map(({ abbr, full }, index) => (
                    <div
                      key={`${abbr}-${index}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 12px', borderRadius: '8px',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)'
                      }}
                    >
                      <span style={{
                        flexShrink: 0, fontWeight: '700', fontSize: '0.85rem',
                        color: '#D4AF37', background: 'rgba(212, 175, 55, 0.12)',
                        border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '6px',
                        padding: '4px 10px', whiteSpace: 'nowrap'
                      }}>
                        {abbr}
                      </span>
                      <ArrowRight size={14} color="#555" style={{ flexShrink: 0 }} />
                      <span style={{ color: '#eee', fontSize: '0.9rem', flex: 1 }}>{full}</span>
                      <button
                        type="button"
                        onClick={() => handleRemove(index)}
                        disabled={removingIndex === index}
                        title="Remove"
                        style={{
                          background: 'transparent', border: 'none', color: '#888', cursor: 'pointer',
                          padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'color 0.15s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
