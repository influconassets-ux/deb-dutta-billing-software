import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import BillForm from '../components/BillForm';
import BillPreview from '../components/BillPreview';
import ClerkBillPreview from '../components/ClerkBillPreview';
import { getSettings, saveBillToLedger, getCachedSettings, deleteRoughBill } from '../utils/storage';
import html2pdf from 'html2pdf.js';
import { FileText } from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import { useFeeStructure } from '../context/FeeStructureContext';

export default function CreateBill() {
  const { showAlert } = useAlert();
  const { feeOpen } = useFeeStructure();
  const location = useLocation();

  const [settings, setSettings] = useState(getCachedSettings());

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const [bill, setBill] = useState(() => {
    if (location.state && location.state.roughBill) {
      const { _id, id, ...rest } = location.state.roughBill;
      return {
        ...rest,
        roughId: _id || id,
        date: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
        memoNo: ''
      };
    }
    return {
      date: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
      memoNo: '',
      court: '',
      client: '',
      caseName: '',
      briefedBy: '',
      items: [
        { nature: '', gm: '', fees: '' }
      ]
    };
  });

  const previewRef = useRef(null);
  const advocateRef = useRef(null);
  const clerkRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [activeTab, setActiveTab] = useState('advocate');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (previewRef.current) {
        // The bill is 850px wide. We add 40px for comfortable padding on small screens.
        const containerWidth = previewRef.current.offsetWidth;
        const targetWidth = 890;

        if (containerWidth < targetWidth) {
          setScale(containerWidth / targetWidth);
        } else {
          setScale(1);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    // Initial check, and re-measure after the fee-panel's own slide transition finishes
    const timer = setTimeout(handleResize, 350);

    return () => { window.removeEventListener('resize', handleResize); clearTimeout(timer); };
  }, [feeOpen]);

  const handlePrint = () => {
    window.print();
  };

  const handleSaveBill = async () => {
    try {
      setIsGeneratingPDF(true);
      await saveBillToLedger(bill);
      
      if (bill.roughId) {
        try {
          await deleteRoughBill(bill.roughId);
        } catch (e) {
          console.error("Failed to delete rough bill after conversion:", e);
        }
      }

      const pdfOptions = {
        margin: 0,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      let billNo = '';
      let year = new Date().getFullYear();
      if (bill.memoNo) {
        const parts = bill.memoNo.split('/');
        billNo = parts[0] || '';
        if (parts.length === 4) year = parts[3];
      }

      const safeClientName = (bill.client || '').replace(/\n/g, ' ').trim();

      const getNatureInitials = (items) => {
        if (!items || !items.length) return '';
        const initials = new Set();
        items.forEach(item => {
          const nature = (item.nature || '').toLowerCase();
          if (nature.includes('conference')) initials.add('C');
          if (nature.includes('appear')) initials.add('A');
          if (nature.includes('draft') || nature.includes('draw')) initials.add('D');
          if (nature.includes('opinion')) initials.add('O');
        });
        return Array.from(initials).join('\u2215'); // Unicode division slash allowed in filenames
      };

      const natureInitials = getNatureInitials(bill.items);
      const safeDate = (bill.date || '').replace(/\//g, '-');

      let rawFileName = `Draft_Bill_${safeDate}`;
      if (bill.memoNo) {
        rawFileName = `${billNo} of ${year} ${safeClientName} ${natureInitials} ${safeDate}`.trim();
      }

      // Replace normal slashes with unicode slashes
      rawFileName = rawFileName.replace(/\//g, '\u2215');
      // Strip only invalid Windows filename characters, allowing everything else
      const fileNameStr = rawFileName.replace(/[<>:"\\|?*]/g, '_').replace(/\s+/g, ' ');
      const generateAndSavePdf = async (elementRef, filename) => {
        const opt = {
          margin: 0,
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: 'avoid-all' }
        };

        if (window.showSaveFilePicker) {
          try {
            const handle = await window.showSaveFilePicker({
              suggestedName: filename,
              types: [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }]
            });
            const pdfBlob = await html2pdf().set(opt).from(elementRef.current).outputPdf('blob');
            const writable = await handle.createWritable();
            await writable.write(pdfBlob);
            await writable.close();
          } catch (e) {
            if (e.name !== 'AbortError') {
              html2pdf().set(opt).from(elementRef.current).save();
            }
          }
        } else {
          html2pdf().set(opt).from(elementRef.current).save();
        }
      };

      try {
        // Advocate Bill
        await generateAndSavePdf(advocateRef, `Advocate_Bill_${fileNameStr}.pdf`);

        // Clerkage Bill
        await generateAndSavePdf(clerkRef, `Clerk_Bill_${fileNameStr}.pdf`);

        showAlert('Bill saved to Ledger & PDF documents downloaded successfully!', 'success');
      } catch (err) {
        console.error("PDF Generation error:", err);
        showAlert('Failed to generate PDF documents. See console for details.', 'error');
      } finally {
        setIsGeneratingPDF(false);
      }

      // Reset form after saving
      setBill({
        ...bill,
        memoNo: '',
        client: '',
        caseName: '',
        briefedBy: '',
        roughId: null,
        nilTotal: false,
        items: [{ nature: '', gm: '', fees: '' }]
      });
    } catch (err) {
      showAlert('Failed to save bill.', 'error');
    }
  };

  return (
    <>
      <style>
        {`
          @media print {
            html, body, #root {
              height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
            }
            .create-bill-wrapper {
              background-color: transparent !important;
              height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .preview-scaler {
              transform: none !important;
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
            }
            .preview-panel {
              margin: 0 !important;
              padding: 0 !important;
              height: 100% !important;
            }
          }
        `}
      </style>
    <div className="create-bill-wrapper fade-in" style={{ backgroundColor: '#111111', height: '100%' }}>
      <div className="form-panel print-hide" style={{ padding: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem', fontWeight: '700', marginBottom: '2rem', color: '#D4AF37' }}>
          <div style={{ backgroundColor: 'white', border: '1px solid #D4AF37', padding: '4px', borderRadius: '4px', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={18} />
          </div>
          Create New Bill
        </h2>

        <BillForm bill={bill} onChange={setBill} />

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', paddingBottom: '3rem' }}>
          <button
            className="btn"
            style={{ flex: 1, opacity: isGeneratingPDF ? 0.7 : 1, backgroundColor: '#D4AF37', color: 'white', fontWeight: 'bold', padding: '12px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            onClick={handleSaveBill}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? 'GENERATING...' : 'SAVE & DOWNLOAD (PDF)'}
          </button>
          <button
            className="btn"
            style={{ flex: 1, backgroundColor: 'transparent', border: '1px solid #D4AF37', color: '#D4AF37', fontWeight: 'bold', padding: '12px', borderRadius: '4px', cursor: 'pointer' }}
            onClick={handlePrint}
            disabled={isGeneratingPDF}
          >
            PRINT
          </button>
        </div>
      </div>

      <div className="preview-panel" ref={previewRef} style={{ position: 'relative' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          {/* Toggle Bar */}
          <div className="print-hide" style={{
            display: 'flex',
            width: '100%',
            marginBottom: '2rem',
            borderBottom: '1px solid rgba(212, 175, 55, 0.3)'
          }}>
            <button
              style={{
                padding: '15px 30px',
                backgroundColor: activeTab === 'advocate' ? '#D4AF37' : 'transparent',
                color: activeTab === 'advocate' ? 'white' : '#D4AF37',
                border: 'none',
                fontWeight: '600',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => setActiveTab('advocate')}
            >
              Advocate Bill
            </button>
            <button
              style={{
                padding: '15px 30px',
                backgroundColor: activeTab === 'clerk' ? '#D4AF37' : 'transparent',
                color: activeTab === 'clerk' ? 'white' : '#D4AF37',
                border: 'none',
                fontWeight: '600',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => setActiveTab('clerk')}
            >
              Clerkage Bill
            </button>
          </div>

          <div className="preview-scaler" style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            width: '850px',
            marginBottom: scale < 1 ? `-${(1 - scale) * 1100}px` : '0',
            transition: 'transform 0.2s ease-out, margin-bottom 0.2s ease-out',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            {activeTab === 'advocate' && <BillPreview settings={settings} bill={bill} />}
            {activeTab === 'clerk' && <ClerkBillPreview settings={settings} bill={bill} />}
          </div>
        </div>
      </div>

      {/* Hidden Render Targets for PDF Generation */}
      <div className="print-hide" style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '210mm' }}>
        <div ref={advocateRef} style={{ width: '210mm', padding: '0', background: 'white' }}>
          <BillPreview settings={settings} bill={bill} />
        </div>
        <div ref={clerkRef} style={{ width: '210mm', padding: '0', background: 'white' }}>
          <ClerkBillPreview settings={settings} bill={bill} />
        </div>
      </div>
    </div>
    </>
  );
}
