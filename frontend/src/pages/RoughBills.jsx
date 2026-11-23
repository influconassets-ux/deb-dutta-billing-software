import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getRoughBills, deleteRoughBill, saveRoughBill, updateRoughBill, getCachedSettings } from '../utils/storage';
import { BookOpen, Search, FileText, Trash2, Plus, ArrowRight, Save, X, Eye, Printer } from 'lucide-react';
import BillForm from '../components/BillForm';
import BillPreview from '../components/BillPreview';
import { getBillTotals } from '../utils/billTotals';
import AuthGateModal from '../components/AuthGateModal';
import { useAlert } from '../context/AlertContext';

const SkeletonRow = () => (
  <tr>
    <td style={{ padding: '1.25rem 1rem' }}><div className="skeleton skeleton-cell" style={{ width: '60%' }}></div></td>
    <td style={{ padding: '1.25rem 1rem' }}><div className="skeleton skeleton-cell"></div><div className="skeleton skeleton-cell" style={{ width: '80%', marginTop: '5px' }}></div></td>
    <td style={{ padding: '1.25rem 1rem' }}><div className="skeleton skeleton-cell" style={{ width: '70%' }}></div></td>
    <td style={{ padding: '1.25rem 1rem' }}><div className="skeleton skeleton-cell"></div><div className="skeleton skeleton-cell" style={{ width: '50%', marginTop: '5px' }}></div></td>
    <td style={{ padding: '1.25rem 1rem' }}><div className="skeleton skeleton-badge" style={{ margin: '0 auto' }}></div></td>
  </tr>
);

export default function RoughBills() {
  const { showAlert, showConfirm } = useAlert();
  const navigate = useNavigate();
  const [ledger, setLedger] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [billToDelete, setBillToDelete] = useState(null);
  const [previewBill, setPreviewBill] = useState(null);
  const settings = getCachedSettings();
  const [newBill, setNewBill] = useState({
    date: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
    court: '',
    client: '',
    caseName: '',
    briefedBy: '',
    items: [{ nature: '', gm: '', fees: '' }]
  });

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const data = await getRoughBills();
        if (isMounted) {
          setLedger(data || []);
        }
      } catch (err) {
        if (isMounted) showAlert('Failed to load rough bills.', 'error');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [showAlert]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await getRoughBills();
      setLedger(data || []);
    } catch (err) {
      showAlert('Failed to load rough bills.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRough = async () => {
    try {
      await saveRoughBill(newBill);
      showAlert('Rough Bill created successfully!', 'success');
      setIsCreating(false);
      setNewBill({
        date: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
        court: '',
        client: '',
        caseName: '',
        briefedBy: '',
        items: [{ nature: '', gm: '', fees: '' }]
      });
      loadData();
    } catch (err) {
      showAlert('Failed to create rough bill.', 'error');
    }
  };

  const handleDelete = (id) => {
    showConfirm('Are you sure you want to delete this rough bill?', () => {
      setBillToDelete(id);
      setShowAuthModal(true);
    });
  };

  const handleAuthVerified = async () => {
    setShowAuthModal(false);
    const id = billToDelete;
    setBillToDelete(null);
    if (!id) return;
    try {
      await deleteRoughBill(id);
      const updated = ledger.filter(b => (b._id || b.id) !== id);
      setLedger(updated);
      localStorage.setItem('cachedRoughBills', JSON.stringify(updated));
      showAlert('Rough Bill deleted successfully', 'success');
    } catch (err) {
      showAlert('Failed to delete rough bill', 'error');
    }
  };

  const handleCreateBill = (bill) => {
    navigate('/', { state: { roughBill: bill } });
  };

  const handleRemarksChange = async (bill, val) => {
    try {
      const updated = await updateRoughBill({ ...bill, remarks: val });
      setLedger(prev => prev.map(b => (b._id || b.id) === (updated._id || updated.id) ? updated : b));
    } catch (err) {
      showAlert('Failed to save remarks', 'error');
    }
  };

  const filteredLedger = ledger.filter(bill => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      (bill.date || '').toLowerCase().includes(term) ||
      (bill.client || '').toLowerCase().includes(term) ||
      (bill.caseName || '').toLowerCase().includes(term);
    return matchSearch;
  });

  return (
    <div className="page-wrapper fade-in" style={{ padding: '2rem', height: '100%', overflowY: 'auto', backgroundColor: '#111111' }}>
      <div className="ledger-panel" style={{ backgroundColor: '#1C1C1E', borderRadius: '12px', padding: '1.5rem', border: '1px solid #333', maxWidth: '1600px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem', fontWeight: '700', color: '#D4AF37', margin: 0 }}>
            <div style={{ backgroundColor: 'white', border: '1px solid #D4AF37', padding: '6px', borderRadius: '4px', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={20} />
            </div>
            Rough Bills
          </h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa' }} />
              <input
                type="text"
                placeholder="Search rough bills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 10px 10px 40px',
                  backgroundColor: '#1C1C1E',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              />
            </div>
            <button
              onClick={() => setIsCreating(!isCreating)}
              style={{
                backgroundColor: isCreating ? '#ef4444' : '#D4AF37',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isCreating ? <><X size={18} /> Cancel</> : <><Plus size={18} /> Create Rough Bill</>}
            </button>
          </div>
        </div>

        {isCreating && (
          <div style={{ backgroundColor: '#1C1C1E', padding: '2rem', borderRadius: '8px', border: '1px solid #333', marginBottom: '2rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: 'white' }}>New Rough Bill</h3>
            <BillForm bill={newBill} onChange={setNewBill} isRough={true} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button
                onClick={handleSaveRough}
                style={{
                  backgroundColor: '#D4AF37',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Save size={18} /> SAVE ROUGH BILL
              </button>
            </div>
          </div>
        )}

        {/* Table container */}
        <div style={{ backgroundColor: '#111', borderRadius: '8px', border: '1px solid #333', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px', color: 'white' }}>
            <thead style={{ backgroundColor: '#1C1C1E', borderBottom: '1px solid #333' }}>
              <tr>
                <th style={{ padding: '1.25rem 1rem', color: '#D4AF37', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '1.25rem 1rem', color: '#D4AF37', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Client & Case</th>
                <th style={{ padding: '1.25rem 1rem', color: '#D4AF37', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Items</th>
                <th style={{ padding: '1.25rem 1rem', color: '#D4AF37', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Remarks</th>
                <th style={{ padding: '1.25rem 1rem', color: '#D4AF37', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'center', width: '250px' }}>Actions</th>
              </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />)
                ) : filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#a1a1aa' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <FileText size={32} style={{ opacity: 0.5 }} />
                        <p>No rough bills found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((bill, index) => {
                    const { total: totalFees, itemsTotal, isNil, waived } = getBillTotals(bill);
                    const itemsDesc = bill.items && bill.items.length > 0 
                      ? `${bill.items[0].nature || 'Item'} ${bill.items.length > 1 ? `(+${bill.items.length - 1} more)` : ''}`
                      : 'No items';
                      
                    return (
                      <tr 
                        key={bill._id || bill.id || index} 
                        style={{ borderBottom: '1px solid #333', transition: 'background-color 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = '#222'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '1.25rem 1rem', verticalAlign: 'middle' }}>{bill.date}</td>
                        <td style={{ padding: '1.25rem 1rem', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: '600', color: 'white', marginBottom: '4px' }}>{bill.client || 'N/A'}</div>
                          <div style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>{bill.caseName || 'N/A'}</div>
                        </td>
                        <td style={{ padding: '1.25rem 1rem', verticalAlign: 'middle', color: '#a1a1aa', fontSize: '0.9rem' }}>
                          {isNil ? (
                            <div style={{ color: '#D4AF37', fontWeight: '800', letterSpacing: '0.04em' }}>
                              NIL
                              {waived && itemsTotal > 0 && (
                                <span style={{ marginLeft: '8px', fontSize: '0.8rem', fontWeight: 500, color: '#71717a', textDecoration: 'line-through', letterSpacing: 0 }}>
                                  ₹{itemsTotal.toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div style={{ color: '#D4AF37', fontWeight: '700' }}>₹{totalFees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                          )}
                          <div>{itemsDesc}</div>
                        </td>
                        <td style={{ padding: '1.25rem 1rem', verticalAlign: 'top', minWidth: '180px' }}>
                          <textarea
                            defaultValue={bill.remarks || ''}
                            placeholder="Add remarks..."
                            rows={1}
                            ref={(el) => {
                              if (el) {
                                el.style.height = 'auto';
                                el.style.height = `${el.scrollHeight}px`;
                              }
                            }}
                            onInput={(e) => {
                              e.target.style.height = 'auto';
                              e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            onBlur={(e) => {
                              if (e.target.value !== (bill.remarks || '')) handleRemarksChange(bill, e.target.value);
                            }}
                            style={{
                              width: '100%',
                              minWidth: '160px',
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid #333',
                              borderRadius: '4px',
                              color: '#eee',
                              padding: '6px 8px',
                              fontSize: '0.85rem',
                              outline: 'none',
                              resize: 'vertical',
                              overflow: 'hidden',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              lineHeight: '1.4',
                              fontFamily: 'inherit'
                            }}
                          />
                        </td>
                        <td style={{ padding: '1.25rem 1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={() => setPreviewBill(bill)}
                              style={{ background: 'transparent', color: '#D4AF37', border: '1px solid #D4AF37', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.85, transition: 'all 0.2s' }}
                              onMouseOver={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.1)'; }}
                              onMouseOut={e => { e.currentTarget.style.opacity = 0.85; e.currentTarget.style.backgroundColor = 'transparent'; }}
                              title="Preview Rough Bill"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleCreateBill(bill)}
                              style={{ 
                                backgroundColor: 'rgba(212, 175, 55, 0.1)', color: '#D4AF37', border: '1px solid #D4AF37', padding: '6px 12px', 
                                borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                fontWeight: '600', fontSize: '0.85rem', transition: 'all 0.2s'
                              }}
                              onMouseOver={e => { e.currentTarget.style.backgroundColor = '#D4AF37'; e.currentTarget.style.color = 'black'; }}
                              onMouseOut={e => { e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.1)'; e.currentTarget.style.color = '#D4AF37'; }}
                            >
                              <ArrowRight size={14} /> Convert to Real Bill
                            </button>
                            <button
                              onClick={() => handleDelete(bill._id || bill.id)}
                              style={{ background: 'transparent', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7, transition: 'opacity 0.2s' }}
                              onMouseOver={e => e.currentTarget.style.opacity = 1}
                              onMouseOut={e => e.currentTarget.style.opacity = 0.7}
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
        </div>

      </div>

      <AuthGateModal
        open={showAuthModal}
        onClose={() => { setShowAuthModal(false); setBillToDelete(null); }}
        onVerified={handleAuthVerified}
        phone={settings?.forgotPasswordPhone}
        message="Enter the OTP sent to your registered number to authorize deleting this rough bill."
        otpOnly
      />

      {previewBill && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#1C1C1E', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.3)', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '1000px', maxHeight: '95vh', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div className="print-hide" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: '15px', gap: '15px', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', backgroundColor: '#18181b' }}>
              <div style={{ color: '#D4AF37', fontWeight: '700', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={16} /> Rough Bill Preview
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => window.print()}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', backgroundColor: 'transparent', color: '#D4AF37', fontWeight: 'bold', border: '1px solid #D4AF37', borderRadius: '6px', cursor: 'pointer' }}
                >
                  <Printer size={16} /> Print
                </button>
                <button
                  onClick={() => setPreviewBill(null)}
                  style={{ padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.3)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="print-modal-body-reset" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '30px', backgroundColor: '#2a2a2d', display: 'flex', justifyContent: 'center' }}>
              <BillPreview settings={settings} bill={previewBill} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
