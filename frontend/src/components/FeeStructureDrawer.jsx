import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Download, Printer, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

const PDF_URL = '/fee-structure-2026.pdf';
// zoom = null means "fit" (the viewer's default fit-to-panel view)
const pdfViewUrl = (zoom) => `${PDF_URL}#toolbar=0&navpanes=0${zoom ? `&zoom=${zoom}` : ''}`;

const ZOOM_STEPS = [50, 75, 100, 125, 150, 175, 200, 250, 300];
const ZOOM_STORAGE_KEY = 'feeStructureZoom';

const readSavedZoom = () => {
  try {
    const v = Number(localStorage.getItem(ZOOM_STORAGE_KEY));
    return ZOOM_STEPS.includes(v) ? v : null;
  } catch { return null; }
};

// The panel itself sits below the heaviest modals (bill preview/edit shrink their own
// width to make room for it instead). The tab handle must stay above every modal in the
// app at all times so it's always reachable, even while a modal is open on top of it.
const PANEL_Z_INDEX = 1150;
const TAB_Z_INDEX = 10500;

export default function FeeStructureDrawer({ open, panelWidth, onToggle, onClose }) {
  const iframeRef = useRef(null);
  const [zoom, setZoom] = useState(readSavedZoom);

  const applyZoom = (z) => {
    setZoom(z);
    try {
      if (z) localStorage.setItem(ZOOM_STORAGE_KEY, String(z));
      else localStorage.removeItem(ZOOM_STORAGE_KEY);
    } catch { /* storage unavailable — zoom just won't be remembered */ }
  };
  // From "fit" we don't know the exact rendered %, so treat it as 100% when stepping.
  const current = zoom ?? 100;
  const zoomIn = () => applyZoom(ZOOM_STEPS.find(s => s > current) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1]);
  const zoomOut = () => applyZoom([...ZOOM_STEPS].reverse().find(s => s < current) ?? ZOOM_STEPS[0]);
  const canZoomIn = current < ZOOM_STEPS[ZOOM_STEPS.length - 1] || zoom === null;
  const canZoomOut = current > ZOOM_STEPS[0] || zoom === null;

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const handlePrint = () => {
    try {
      iframeRef.current?.contentWindow?.print();
    } catch (e) {
      window.open(PDF_URL, '_blank');
    }
  };

  const toolbarBtnStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '34px', height: '34px', borderRadius: '50%', border: 'none', cursor: 'pointer',
    background: 'rgba(20,20,20,0.8)', color: 'white', backdropFilter: 'blur(4px)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)', transition: 'all 0.2s'
  };

  return createPortal(
    <>
      {/* Tab handle */}
      <button
        type="button"
        onClick={onToggle}
        title="Fee Structure 2026"
        style={{
          position: 'fixed',
          top: '50%',
          right: open ? panelWidth : 0,
          transform: 'translateY(-50%)',
          zIndex: TAB_Z_INDEX,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'linear-gradient(135deg, #D4AF37 0%, #b8952e 100%)',
          color: '#1a1a1a',
          border: 'none',
          borderRadius: '8px 0 0 8px',
          padding: '14px 8px',
          cursor: 'pointer',
          boxShadow: '-2px 0 12px rgba(0,0,0,0.35)',
          transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          fontSize: '0.78rem',
          fontWeight: '700',
          letterSpacing: '0.03em'
        }}
      >
        <ChevronLeft size={16} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s', writingMode: 'horizontal-tb' }} />
        Fee Structure
      </button>

      {/* Panel — docked alongside content, always on top of every other overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: open ? 0 : `calc(-1 * ${panelWidth})`,
          width: panelWidth,
          height: '100vh',
          background: '#2a2a2a',
          borderLeft: '1px solid rgba(212, 175, 55, 0.3)',
          boxShadow: open ? '-4px 0 24px rgba(0,0,0,0.5)' : 'none',
          zIndex: PANEL_Z_INDEX,
          overflow: 'hidden',
          transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Floating print/download controls */}
        <div style={{ position: 'absolute', top: '14px', right: '14px', zIndex: 1, display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={handlePrint}
            title="Print"
            style={toolbarBtnStyle}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212, 175, 55, 0.9)'; e.currentTarget.style.color = '#000'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(20,20,20,0.8)'; e.currentTarget.style.color = 'white'; }}
          >
            <Printer size={16} />
          </button>
          <a
            href={PDF_URL}
            download
            title="Download"
            style={toolbarBtnStyle}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212, 175, 55, 0.9)'; e.currentTarget.style.color = '#000'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(20,20,20,0.8)'; e.currentTarget.style.color = 'white'; }}
          >
            <Download size={16} />
          </a>
        </div>

        {open && (
          <iframe
            key={zoom ?? 'fit'} // the PDF viewer only reads #zoom on load, so remount on change
            ref={iframeRef}
            src={pdfViewUrl(zoom)}
            title="Draft Fees Structure 2026"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        )}

        {/* Zoom controls */}
        <div
          role="group"
          aria-label="Zoom"
          style={{
            position: 'absolute', bottom: '18px', left: '50%', transform: 'translateX(-50%)', zIndex: 1,
            display: 'flex', alignItems: 'center', gap: '2px', padding: '4px',
            background: 'rgba(20,20,20,0.88)', backdropFilter: 'blur(6px)',
            border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '999px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.45)', userSelect: 'none'
          }}
        >
          <ZoomButton onClick={zoomOut} disabled={!canZoomOut} title="Zoom out"><ZoomOut size={16} /></ZoomButton>
          <span
            aria-live="polite"
            style={{ minWidth: '52px', textAlign: 'center', color: 'white', fontSize: '0.8rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
          >
            {zoom ? `${zoom}%` : 'Fit'}
          </span>
          <ZoomButton onClick={zoomIn} disabled={!canZoomIn} title="Zoom in"><ZoomIn size={16} /></ZoomButton>
          <span style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />
          <ZoomButton onClick={() => applyZoom(null)} disabled={zoom === null} title="Fit to panel"><Maximize2 size={15} /></ZoomButton>
        </div>
      </div>
    </>,
    document.body
  );
}

function ZoomButton({ onClick, disabled, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '32px', height: '32px', borderRadius: '50%', border: 'none',
        background: 'transparent', color: disabled ? 'rgba(255,255,255,0.3)' : 'white',
        cursor: disabled ? 'default' : 'pointer', transition: 'background 0.15s, color 0.15s'
      }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = 'rgba(212, 175, 55, 0.9)'; e.currentTarget.style.color = '#000'; } }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = disabled ? 'rgba(255,255,255,0.3)' : 'white'; }}
    >
      {children}
    </button>
  );
}
