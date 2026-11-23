import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, SortAsc, SortDesc, X } from 'lucide-react';

export default function ColumnFilterDropdown({ 
  columnKey, 
  title, 
  data, 
  currentFilters, 
  onFilterChange, 
  currentSort, 
  onSortChange,
  onClose,
  parentRef
}) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const uniqueValues = useMemo(() => {
    const map = new Map();
    data.forEach(item => {
      let val = item[columnKey];
      if (columnKey === 'nature') {
        val = item.items?.map(i => i.nature).join(', ');
      }
      if (columnKey === 'billsProvided') {
        const isMade = ['yes', 'bills made', 'made'].includes(String(val || 'no').toLowerCase().trim());
        val = isMade ? 'Bills Made' : 'Not Made';
      }
      val = String(val !== undefined && val !== null ? val : '').trim();
      
      const lowerVal = val.toLowerCase() || '(blank)';
      const displayVal = val || '(Blank)';
      
      if (!map.has(lowerVal)) {
        map.set(lowerVal, displayVal);
      }
    });
    
    const sortedKeys = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
    return sortedKeys.map(k => ({ key: k, display: map.get(k) }));
  }, [data, columnKey]);

  const filteredValues = useMemo(() => {
    if (!searchTerm) return uniqueValues;
    const term = searchTerm.toLowerCase();
    return uniqueValues.filter(v => v.display.toLowerCase().includes(term));
  }, [uniqueValues, searchTerm]);

  // Using currentFilters directly for the checkbox states ensures it stays in sync with Auto-Apply
  const selectedValues = useMemo(() => {
    if (Array.isArray(currentFilters)) {
      return new Set(currentFilters);
    }
    return new Set(uniqueValues.map(v => v.key));
  }, [currentFilters, uniqueValues]);

  const handleSelectAll = () => {
    const newSet = new Set(selectedValues);
    
    // If all currently VISIBLE items are selected, unselect them all
    const allVisibleSelected = filteredValues.every(v => newSet.has(v.key));
    
    if (allVisibleSelected) {
      filteredValues.forEach(v => newSet.delete(v.key));
    } else {
      filteredValues.forEach(v => newSet.add(v.key));
    }
    
    if (newSet.size === uniqueValues.length) {
      onFilterChange(columnKey, null);
    } else {
      onFilterChange(columnKey, Array.from(newSet));
    }
  };

  const handleToggleValue = (key) => {
    const newSet = new Set(selectedValues);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    
    if (newSet.size === uniqueValues.length) {
      onFilterChange(columnKey, null); // All selected = no filter
    } else {
      onFilterChange(columnKey, Array.from(newSet));
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    onFilterChange(columnKey, null);
  };

  const dropdownRef = useRef(null);
  useEffect(() => {
    // We don't need any position tracking for a side drawer!
    // Just lock the body scroll while the drawer is open to prevent background scrolling
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Determine indeterminate state for the "Select All" checkbox based on filtered results
  const visibleSelectedCount = filteredValues.filter(v => selectedValues.has(v.key)).length;
  const isAllVisibleSelected = visibleSelectedCount === filteredValues.length && filteredValues.length > 0;
  const isIndeterminate = visibleSelectedCount > 0 && visibleSelectedCount < filteredValues.length;

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease-out forwards'
        }}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        ref={dropdownRef}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '380px',
          maxWidth: '100vw',
          backgroundColor: '#151518',
          borderLeft: '1px solid rgba(212, 175, 55, 0.2)',
          boxShadow: '-20px 0 50px rgba(0, 0, 0, 0.8)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          fontSize: '0.95rem',
          color: '#FFF',
          textAlign: 'left',
          animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>

        {/* Drawer Header */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#D4AF37' }}>Filter Column</h3>
            <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '4px' }}>{title}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#FFF', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
            <X size={18} />
          </button>
        </div>

        {/* Sort Actions */}
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Sort</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => { onSortChange(columnKey, 'asc'); onClose(); }}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: currentSort?.key === columnKey && currentSort?.direction === 'asc' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255,255,255,0.03)', border: '1px solid', borderColor: currentSort?.key === columnKey && currentSort?.direction === 'asc' ? '#D4AF37' : 'transparent', color: currentSort?.key === columnKey && currentSort?.direction === 'asc' ? '#D4AF37' : '#CCC', cursor: 'pointer', borderRadius: '8px', transition: 'all 0.2s' }}
            >
              <SortAsc size={16} /> A to Z
            </button>
            <button 
              onClick={() => { onSortChange(columnKey, 'desc'); onClose(); }}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: currentSort?.key === columnKey && currentSort?.direction === 'desc' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255,255,255,0.03)', border: '1px solid', borderColor: currentSort?.key === columnKey && currentSort?.direction === 'desc' ? '#D4AF37' : 'transparent', color: currentSort?.key === columnKey && currentSort?.direction === 'desc' ? '#D4AF37' : '#CCC', cursor: 'pointer', borderRadius: '8px', transition: 'all 0.2s' }}
            >
              <SortDesc size={16} /> Z to A
            </button>
          </div>
        </div>

        {/* Filter Search */}
        <div style={{ padding: '20px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filter</div>
          {currentFilters && (
            <button 
              onClick={handleClear}
              style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
            >
              Clear Filter
            </button>
          )}
        </div>
        
        <div style={{ padding: '0 20px 15px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', color: '#888' }} />
            <input 
              type="text" 
              placeholder={`Search in ${title}...`} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '12px 12px 12px 36px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#FFF', outline: 'none', fontSize: '0.9rem' }}
            />
          </div>
        </div>

        {/* Checkbox List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '10px 12px', margin: 0, borderRadius: '8px', background: 'rgba(255,255,255,0.02)', transition: 'background 0.2s', border: '1px solid transparent' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'} onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}>
            <input 
              type="checkbox" 
              checked={isAllVisibleSelected}
              ref={el => { if(el) el.indeterminate = isIndeterminate; }}
              onChange={handleSelectAll}
              style={{ accentColor: '#D4AF37', width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: '700', color: '#D4AF37' }}>{searchTerm ? 'Select All Results' : 'Select All'}</span>
          </label>
          
          {filteredValues.map(item => (
            <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '10px 12px', margin: 0, borderRadius: '8px', transition: 'background 0.2s', border: '1px solid transparent' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
              <input 
                type="checkbox" 
                checked={selectedValues.has(item.key)}
                onChange={() => handleToggleValue(item.key)}
                style={{ accentColor: '#D4AF37', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: selectedValues.has(item.key) ? '#FFF' : '#AAA', fontSize: '0.95rem' }} title={item.display}>
                {item.display}
              </span>
            </label>
          ))}
          {filteredValues.length === 0 && (
            <div style={{ color: '#888', textAlign: 'center', padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <Search size={32} color="rgba(255,255,255,0.1)" />
              <div>No matches found</div>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
