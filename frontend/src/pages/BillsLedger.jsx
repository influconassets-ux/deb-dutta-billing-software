import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getLedger, updateBillInLedger, getSettings, clearLedger, deleteBill, getCachedSettings, getCachedLedger, getCachedLedgerTimestamp } from '../utils/storage';
import { BookOpen, Search, FileText, IndianRupee, AlertTriangle, Trash2, Eye, X, Printer, User, UserCircle, Filter, Download, FileSpreadsheet, Camera, Edit2, RefreshCw, Lock } from 'lucide-react';
import BillForm from '../components/BillForm';
import BillPreview from '../components/BillPreview';
import ClerkBillPreview from '../components/ClerkBillPreview';
import ColumnFilterDropdown from '../components/ColumnFilterDropdown';
import AuthGateModal from '../components/AuthGateModal';
import { useAlert } from '../context/AlertContext';
import { useFeeStructure } from '../context/FeeStructureContext';
import ExcelJS from 'exceljs';
import { getBillTotals, isNilItem, getForgoneFees, getForgoneItems } from '../utils/billTotals';
import { saveAs } from 'file-saver';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';

const SkeletonRow = () => (
  <tr>
    <td style={{ padding: '1.25rem 1rem' }}><div className="skeleton skeleton-cell" style={{ width: '60%' }}></div></td>
    <td style={{ padding: '1.25rem 1rem' }}><div className="skeleton skeleton-cell"></div><div className="skeleton skeleton-cell" style={{ width: '80%', marginTop: '5px' }}></div></td>
    <td style={{ padding: '1.25rem 1rem' }}><div className="skeleton skeleton-cell" style={{ width: '70%' }}></div></td>
    <td style={{ padding: '1.25rem 1rem' }}><div className="skeleton skeleton-cell"></div><div className="skeleton skeleton-cell" style={{ width: '50%', marginTop: '5px' }}></div></td>
    <td style={{ padding: '1.25rem 1rem' }}><div className="skeleton skeleton-cell"></div></td>
    <td style={{ padding: '1.25rem 1rem' }}><div className="skeleton skeleton-cell"></div></td>
    <td style={{ padding: '1.25rem 1rem' }}><div className="skeleton skeleton-cell"></div></td>
    <td style={{ padding: '1.25rem 1rem' }}><div className="skeleton skeleton-badge" style={{ margin: '0 auto' }}></div></td>
    <td style={{ padding: '1.25rem 1rem' }}><div className="skeleton skeleton-badge" style={{ margin: '0 auto' }}></div></td>
    <td style={{ padding: '1.25rem 1rem' }}><div className="skeleton skeleton-cell"></div></td>
    <td style={{ padding: '1.25rem 1rem' }}><div className="skeleton skeleton-cell"></div></td>
  </tr>
);

const HeaderCell = ({
  title,
  colKey,
  width,
  align = 'left',
  columnFilters,
  sortConfig,
  activeFilterColumn,
  setActiveFilterColumn,
  getFilterDataForColumn,
  handleColumnFilterChange,
  handleColumnSortChange
}) => {
  const isActive = columnFilters[colKey] !== undefined || sortConfig?.key === colKey;
  const [isHovered, setIsHovered] = useState(false);
  const thRef = useRef(null);

  return (
    <th ref={thRef} style={{ width, position: 'relative', padding: '16px 12px', textAlign: align, verticalAlign: 'middle' }}>
      <div
        onClick={() => setActiveFilterColumn(activeFilterColumn === colKey ? null : colKey)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'flex-start',
          justifyContent: align === 'right' ? 'flex-end' : (align === 'center' ? 'center' : 'flex-start'),
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '4px',
          backgroundColor: activeFilterColumn === colKey ? 'rgba(255,255,255,0.1)' : 'transparent',
          userSelect: 'none',
          color: '#D4AF37'
        }}
      >
        <span style={{ whiteSpace: 'nowrap' }}>
          {title}{' '}
          <Filter
            size={14}
            style={{
              color: isActive ? '#FFF' : (isHovered ? '#D4AF37' : '#888'),
              opacity: isActive || isHovered ? 1 : 0.8,
              transition: 'all 0.2s ease',
              verticalAlign: 'middle',
              marginLeft: '2px'
            }}
          />
        </span>
      </div>
      {activeFilterColumn === colKey && (
        <ColumnFilterDropdown
          columnKey={colKey}
          title={title}
          data={getFilterDataForColumn(colKey)}
          currentFilters={columnFilters[colKey]}
          onFilterChange={handleColumnFilterChange}
          currentSort={sortConfig}
          onSortChange={handleColumnSortChange}
          onClose={() => setActiveFilterColumn(null)}
          parentRef={thRef}
        />
      )}
    </th>
  );
};

export default function BillsLedger() {
  const { showAlert, showConfirm } = useAlert();
  const { feeOpen, panelWidth } = useFeeStructure();
  const [ledger, setLedger] = useState(() => getCachedLedger());
  const [settings, setSettings] = useState(getCachedSettings());
  const [searchTerm, setSearchTerm] = useState('');
  const currentYear = new Date().getFullYear().toString();
  const [filterYear, setFilterYear] = useState(currentYear);
  const [filterStatus, setFilterStatus] = useState('All');
  const [previewBill, setPreviewBill] = useState(null);
  const [previewType, setPreviewType] = useState('advocate'); // 'advocate' or 'clerk'
  const [isLoading, setIsLoading] = useState(() => getCachedLedger().length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => getCachedLedgerTimestamp());
  const [visibleCount, setVisibleCount] = useState(20);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortConfig, setSortConfig] = useState(null);
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);
  const observer = useRef();
  const previewContainerRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(1);
  
  // Edit & Auth State
  const [editingBill, setEditingBill] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editPreviewType, setEditPreviewType] = useState('advocate');
  const [editHighlightField, setEditHighlightField] = useState(null);
  const [editPreviewScale, setEditPreviewScale] = useState(1);
  const editPreviewContainerRef = useRef(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [billToEdit, setBillToEdit] = useState(null);

  useEffect(() => {
    if (previewBill) {
      const handleResize = () => {
        if (previewContainerRef.current) {
          // Adjust targetWidth if necessary. The bill paper is typically ~794px (210mm)
          const containerWidth = previewContainerRef.current.offsetWidth;
          const targetWidth = 850;
          if (containerWidth < targetWidth) {
            setPreviewScale(containerWidth / targetWidth);
          } else {
            setPreviewScale(1);
          }
        }
      };
      window.addEventListener('resize', handleResize);
      // Re-measure after the fee-panel's own slide transition finishes, not just on window resize
      const timer = setTimeout(handleResize, 350);
      return () => { window.removeEventListener('resize', handleResize); clearTimeout(timer); };
    } else {
      setPreviewScale(1);
    }
  }, [previewBill, previewType, feeOpen]);

  useEffect(() => {
    if (editingBill) {
      const handleResize = () => {
        if (editPreviewContainerRef.current) {
          const containerWidth = editPreviewContainerRef.current.offsetWidth;
          const targetWidth = 860;
          if (containerWidth < targetWidth) {
            setEditPreviewScale(containerWidth / targetWidth);
          } else {
            setEditPreviewScale(1);
          }
        }
      };
      window.addEventListener('resize', handleResize);
      // Re-measure after the fee-panel's own slide transition finishes, not just on window resize
      const timer = setTimeout(handleResize, 350);
      return () => { window.removeEventListener('resize', handleResize); clearTimeout(timer); };
    } else {
      setEditPreviewScale(1);
      setEditHighlightField(null);
    }
  }, [editingBill, editPreviewType, feeOpen]);

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState('filtered');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  useEffect(() => {
    setVisibleCount(20);
  }, [searchTerm, filterYear, filterStatus]);

  const loadLedgerData = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    } else if (getCachedLedger().length === 0) {
      setIsLoading(true);
    }

    try {
      const [ledgerData, settingsData] = await Promise.all([
        getLedger(),
        getSettings()
      ]);
      if (ledgerData) {
        setLedger(ledgerData);
        setLastSyncTime(new Date().toISOString());
      }
      if (settingsData) {
        setSettings(settingsData);
      }
      if (isManual) {
        showAlert('Ledger synchronized with server', 'success');
      }
    } catch (err) {
      console.error('Failed to sync ledger data:', err);
      if (isManual) {
        showAlert('Failed to refresh ledger', 'error');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showAlert]);

  useEffect(() => {
    loadLedgerData();

    return () => {
      if (window.recaptchaVerifierLedger) {
        try {
          window.recaptchaVerifierLedger.clear();
        } catch (e) {}
        window.recaptchaVerifierLedger = null;
      }
    };
  }, [loadLedgerData]);

  const extractYear = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      return parts[0].length === 4 ? parts[0] : parts[2];
    }
    if (dateStr.includes('.')) return dateStr.split('.')[2];
    if (dateStr.length >= 4) return dateStr.match(/\d{4}/)?.[0] || null;
    return null;
  };

  const availableYears = ['All', ...new Set(ledger.map(b => extractYear(b.date)).filter(Boolean))].sort((a, b) => {
    if (a === 'All') return -1;
    if (b === 'All') return 1;
    return Number(b) - Number(a);
  });

  const baseFilteredLedger = useMemo(() => {
    return ledger.filter(bill => {
      const term = searchTerm.toLowerCase();
      const searchMatch = !searchTerm || (
        (bill.client || '').toLowerCase().includes(term) ||
        (bill.caseName || '').toLowerCase().includes(term) ||
        (bill.memoNo || '').toLowerCase().includes(term) ||
        (bill.date || '').toLowerCase().includes(term)
      );

      let yearMatch = true;
      if (filterYear !== 'All') {
        const year = extractYear(bill.date);
        if (year !== filterYear) yearMatch = false;
      }

      let statusMatch = true;
      if (filterStatus !== 'All') {
        const totalFees = getBillTotals(bill).total;
        const amountReceived = Number(bill.amountReceived) || 0;
        const due = totalFees - amountReceived;

        let calcStatus = bill.status || 'Due';
        if (!bill.status && due <= 0 && totalFees > 0) calcStatus = 'Paid';

        if (calcStatus !== filterStatus) statusMatch = false;
      }

      return searchMatch && yearMatch && statusMatch;
    });
  }, [ledger, searchTerm, filterYear, filterStatus]);

  const getFilterDataForColumn = (targetColKey) => {
    return baseFilteredLedger.filter(bill => {
      for (const [colKey, filterValue] of Object.entries(columnFilters)) {
        if (colKey === targetColKey) continue; // Skip current column
        if (filterValue === null || filterValue === undefined) continue;

        let val = bill[colKey];
        if (colKey === 'nature') {
          val = bill.items?.map(i => i.nature).join(', ');
        }
        if (colKey === 'billsProvided') {
          const isMade = ['yes', 'bills made', 'made'].includes(String(val || 'no').toLowerCase().trim());
          val = isMade ? 'Given' : 'Not Given';
        }
        val = String(val !== undefined && val !== null ? val : '').trim();

        if (Array.isArray(filterValue)) {
          if (filterValue.length === 0) return false;
          const checkVal = val.toLowerCase() || '(blank)';
          if (!filterValue.includes(checkVal)) return false;
        } else if (typeof filterValue === 'string') {
          if (!val.toLowerCase().includes(filterValue.toLowerCase())) return false;
        }
      }
      return true;
    });
  };

  const filteredLedger = useMemo(() => {
    return baseFilteredLedger.filter(bill => {
      // Column Filters
      let columnMatch = true;
      for (const [colKey, filterValue] of Object.entries(columnFilters)) {
        if (filterValue === null || filterValue === undefined) continue;

        let val = bill[colKey];
        if (colKey === 'nature') {
          val = bill.items?.map(i => i.nature).join(', ');
        }
        if (colKey === 'billsProvided') {
          const isMade = ['yes', 'bills made', 'made'].includes(String(val || 'no').toLowerCase().trim());
          val = isMade ? 'Given' : 'Not Given';
        }
        val = String(val !== undefined && val !== null ? val : '').trim();

        if (Array.isArray(filterValue)) {
          if (filterValue.length === 0) {
            columnMatch = false;
            break;
          }
          const checkVal = val.toLowerCase() || '(blank)';
          if (!filterValue.includes(checkVal)) {
            columnMatch = false;
            break;
          }
        } else if (typeof filterValue === 'string') {
          if (!val.toLowerCase().includes(filterValue.toLowerCase())) {
            columnMatch = false;
            break;
          }
        }
      }

      return columnMatch;
    }).sort((a, b) => {
      // Sort logic
      if (sortConfig) {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (sortConfig.key === 'nature') {
          valA = a.items?.map(i => i.nature).join(', ');
          valB = b.items?.map(i => i.nature).join(', ');
        }
        if (sortConfig.key === 'billsProvided') {
          valA = ['yes', 'bills made', 'made'].includes(String(valA || 'no').toLowerCase().trim()) ? 'Given' : 'Not Given';
          valB = ['yes', 'bills made', 'made'].includes(String(valB || 'no').toLowerCase().trim()) ? 'Given' : 'Not Given';
        }
        valA = String(valA || '');
        valB = String(valB || '');

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      }

      // Default sort: explicitly maintain the exact insertion order from the Excel sheet
      return String(a._id).localeCompare(String(b._id));
    });
  }, [ledger, searchTerm, filterYear, filterStatus, columnFilters, sortConfig]);

  useEffect(() => {
    // When filters change, scroll back to top so user doesn't see a blank screen
    const wrapper = document.querySelector('.page-wrapper');
    if (wrapper) {
      wrapper.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [columnFilters, searchTerm, filterYear, filterStatus]);

  const grandTotal = useMemo(() => {
    return filteredLedger.reduce((total, bill) => {
      const billTotal = getBillTotals(bill).total;
      return total + billTotal;
    }, 0);
  }, [filteredLedger]);

  const nilActualTotal = useMemo(
    () => filteredLedger.reduce((sum, bill) => sum + getBillTotals(bill).unbilled, 0),
    [filteredLedger]
  );

  const lastElementRef = useCallback(node => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && visibleCount < filteredLedger.length) {
        setVisibleCount(prev => prev + 20);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, visibleCount, filteredLedger.length]);

  const handleAmountChange = async (bill, val) => {
    const updated = { ...bill, amountReceived: val };
    const newBill = await updateBillInLedger(updated);
    if (newBill) setLedger(prev => prev.map(b => (b._id || b.id) === (newBill._id || newBill.id) ? newBill : b));
  };

  const handleStatusChange = async (bill, val) => {
    const updated = { ...bill, status: val };
    const newBill = await updateBillInLedger(updated);
    if (newBill) setLedger(prev => prev.map(b => (b._id || b.id) === (newBill._id || newBill.id) ? newBill : b));
  };

  const handleBillsProvidedChange = async (bill, val) => {
    const updated = { ...bill, billsProvided: val };
    const newBill = await updateBillInLedger(updated);
    if (newBill) setLedger(prev => prev.map(b => (b._id || b.id) === (newBill._id || newBill.id) ? newBill : b));
  };

  const handleRemarksChange = async (bill, val) => {
    const updated = { ...bill, remarks: val };
    const newBill = await updateBillInLedger(updated);
    if (newBill) setLedger(prev => prev.map(b => (b._id || b.id) === (newBill._id || newBill.id) ? newBill : b));
  };

  const handleClearAll = () => {
    showConfirm('WARNING: Are you sure you want to delete ALL saved bills? This action cannot be undone.', () => {
      setPendingAction({ type: 'clearAll' });
      setShowAuthModal(true);
    });
  };

  const handleDeleteBill = (id) => {
    showConfirm('Are you sure you want to delete this bill?', () => {
      setPendingAction({ type: 'deleteBill', id });
      setShowAuthModal(true);
    });
  };

  const handleColumnFilterChange = (colKey, allowedValues) => {
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      if (allowedValues === null) {
        delete newFilters[colKey];
      } else {
        newFilters[colKey] = allowedValues;
      }
      return newFilters;
    });
  };

  const handleColumnSortChange = (colKey, direction) => {
    setSortConfig({ key: colKey, direction });
  };

  const handleEditClick = (bill) => {
    setBillToEdit(bill);
    setPendingAction({ type: 'edit' });
    setShowAuthModal(true);
  };

  const handleAuthVerified = async () => {
    setShowAuthModal(false);
    const action = pendingAction;
    setPendingAction(null);
    if (!action) return;

    if (action.type === 'edit') {
      setEditingBill(JSON.parse(JSON.stringify(billToEdit)));
      showAlert('Authentication successful', 'success');
    } else if (action.type === 'deleteBill') {
      try {
        await deleteBill(action.id);
        setLedger(prev => prev.filter(b => (b._id || b.id) !== action.id));
        showAlert('Bill deleted successfully', 'success');
      } catch (err) {
        showAlert('Failed to delete bill', 'error');
      }
    } else if (action.type === 'clearAll') {
      const updated = await clearLedger();
      setLedger(updated);
      showAlert('All bills deleted', 'success');
    }
  };

  const handleInlinePreviewSave = async (updatedBill) => {
    try {
      const saved = await updateBillInLedger(updatedBill);
      if (saved) {
        setLedger(prev => prev.map(b => (b._id || b.id) === (saved._id || saved.id) ? saved : b));
        setPreviewBill(saved);
        showAlert('Bill updated successfully', 'success');
      }
    } catch (err) {
      console.error('Inline preview save error:', err);
      showAlert(err.message || 'Failed to update bill', 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (isSavingEdit || !editingBill) return;
    setIsSavingEdit(true);
    try {
      const updated = await updateBillInLedger(editingBill);
      if (updated) {
        setLedger(prev => prev.map(b => (b._id || b.id) === (updated._id || updated.id) ? updated : b));
        setEditingBill(null);
        showAlert('Bill updated successfully', 'success');
      } else {
        showAlert('Failed to update bill: No response from server', 'error');
      }
    } catch (err) {
      console.error('Update bill error:', err);
      showAlert(err.message || 'Failed to update bill', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const thStyle = { padding: '16px 12px', textAlign: 'left', fontWeight: '700', color: '#D4AF37', fontSize: '0.85rem', borderBottom: '1px solid #333' };
  const tdStyle = { padding: '16px 12px', color: '#FFF', fontSize: '0.9rem', verticalAlign: 'top', borderBottom: '1px solid #333' };

  const handleSavePdf = async () => {
    if (!previewBill) return;

    let billNo = '';
    let year = new Date().getFullYear();
    if (previewBill.memoNo) {
      const parts = previewBill.memoNo.split('/');
      billNo = parts[0] || '';
      if (parts.length === 4) year = parts[3];
    }

    const safeClientName = (previewBill.client || '').replace(/\n/g, ' ').trim();

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

    const natureInitials = getNatureInitials(previewBill.items);
    const safeDate = (previewBill.date || '').replace(/\//g, '-');

    let rawFileName = `Draft_Bill_${safeDate}`;
    if (previewBill.memoNo) {
      rawFileName = `${billNo} of ${year} ${safeClientName} ${natureInitials} ${safeDate}`.trim();
    }

    // Replace normal slashes with unicode slashes
    rawFileName = rawFileName.replace(/\//g, '\u2215');
    // Strip only invalid Windows filename characters, allowing everything else
    const fileNameStr = rawFileName.replace(/[<>:"\\|?*]/g, '_').replace(/\s+/g, ' ');

    try {
      const captureArea = document.getElementById('preview-capture-area');
      if (!captureArea) return;

      const prefix = previewType === 'advocate' ? 'Advocate_Bill' : 'Clerk_Bill';
      const filename = `${prefix}_${fileNameStr}.pdf`;

      // Temporarily remove transform for accurate pdf rendering
      const originalTransform = captureArea.style.transform;
      const originalMargin = captureArea.style.marginBottom;
      captureArea.style.transform = 'none';
      captureArea.style.marginBottom = '0';

      const opt = {
        margin: 0,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: 'avoid-all' }
      };

      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }]
          });

          // Generate PDF as blob first
          const pdfBlob = await html2pdf().set(opt).from(captureArea).outputPdf('blob');

          const writable = await handle.createWritable();
          await writable.write(pdfBlob);
          await writable.close();
        } catch (e) {
          if (e.name !== 'AbortError') {
            html2pdf().set(opt).from(captureArea).save();
          }
        }
      } else {
        html2pdf().set(opt).from(captureArea).save();
      }

      // Restore transform
      setTimeout(() => {
        captureArea.style.transform = originalTransform;
        captureArea.style.marginBottom = originalMargin;
      }, 100);

    } catch (err) {
      console.error("PDF Generation error:", err);
      showAlert('Failed to generate PDF document. See console for details.', 'error');
    }
  };

  const executeExport = async () => {
    let dataToExport = ledger;
    const now = new Date();

    if (exportType === 'filtered') {
      dataToExport = filteredLedger;
    } else if (exportType === 'lastMonth') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      dataToExport = ledger.filter(b => {
        if (!b.date) return false;
        const [d, m, y] = b.date.split('-');
        if (!d || !m || !y) return false;
        const date = new Date(y, m - 1, d);
        return date >= lastMonth && date <= endOfLastMonth;
      });
    } else if (exportType === 'lastYear') {
      const lastYearStr = (now.getFullYear() - 1).toString();
      dataToExport = ledger.filter(b => extractYear(b.date) === lastYearStr);
    } else if (exportType === 'last2Years') {
      const currentYear = now.getFullYear();
      const lastYearStr = (currentYear - 1).toString();
      const twoYearsAgoStr = (currentYear - 2).toString();
      dataToExport = ledger.filter(b => {
        const y = extractYear(b.date);
        return y === currentYear.toString() || y === lastYearStr || y === twoYearsAgoStr;
      });
    } else if (exportType === 'custom') {
      if (!exportStartDate || !exportEndDate) {
        showAlert("Please select both start and end dates.", 'warning');
        return;
      }
      const start = new Date(exportStartDate);
      const end = new Date(exportEndDate);
      end.setHours(23, 59, 59, 999);
      dataToExport = ledger.filter(b => {
        if (!b.date) return false;
        const [d, m, y] = b.date.split('-');
        if (!d || !m || !y) return false;
        const date = new Date(y, m - 1, d);
        return date >= start && date <= end;
      });
    }

    if (dataToExport.length === 0) {
      showAlert("No bills found for the selected criteria.", 'info');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bills Ledger');

    // Define columns based on screenshot & user request
    worksheet.columns = [
      { header: 'Bill No.', key: 'memoNo', width: 22 },
      { header: 'Name of Case', key: 'caseName', width: 45 },
      { header: 'Case No.', key: 'caseNumber', width: 25 },
      { header: 'Nature of Brief', key: 'nature', width: 35 },
      { header: 'Client Name', key: 'client', width: 30 },
      { header: 'Briefed By', key: 'briefedBy', width: 20 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Total Fees', key: 'totalFees', width: 15 },
      { header: 'NIL Actual Value (Admin)', key: 'unbilled', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Bill Given', key: 'billsProvided', width: 16 },
      { header: 'Amount Received', key: 'received', width: 18 }
    ];

    // Style Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 35;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE26B0A' } // Orange
      };
      cell.font = {
        name: 'Georgia',
        size: 11,
        color: { argb: 'FFFFFFFF' },
        bold: true
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Populate data
    dataToExport.forEach(bill => {
      const { total: totalFees, isNil: isAllNilBill, unbilled } = getBillTotals(bill);
      const clerkage = Math.round(totalFees * 0.10);
      const natureCombined = bill.items.map(i => i.nature).join('\n');

      const amountReceived = Number(bill.amountReceived) || 0;
      const due = totalFees - amountReceived;

      let calcStatus = bill.status || 'Due';
      if (!bill.status && due <= 0 && totalFees > 0) calcStatus = 'Paid';

      const isBillsMade = ['yes', 'bills made', 'made'].includes(String(bill.billsProvided || 'no').toLowerCase().trim());

      const row = worksheet.addRow({
        memoNo: bill.memoNo || '',
        caseName: bill.caseName || '',
        caseNumber: bill.caseNumber || '',
        nature: natureCombined || '',
        client: bill.client || '',
        briefedBy: bill.briefedBy || '',
        date: bill.date || '',
        totalFees: isAllNilBill ? 'NIL' : totalFees,
        unbilled: unbilled > 0 ? unbilled : '',
        status: calcStatus,
        billsProvided: isBillsMade ? 'Given' : 'Not Given',
        received: amountReceived
      });

      // Calculate approximate row height based on text length and new lines
      const lines = Math.max(
        (bill.caseName || '').split('\\n').length,
        (natureCombined || '').split('\\n').length,
        Math.ceil((bill.caseName || '').length / 40),
        Math.ceil((natureCombined || '').length / 30)
      );
      row.height = Math.max(35, lines * 18);

      // Determine background color
      let rowColor = 'FFFFFFFF'; // White default
      if (calcStatus === 'Paid') {
        rowColor = 'FF92D050'; // Light Green
      }

      const fontColor = calcStatus === 'Due' ? 'FF000000' : 'FF000000'; // Keep black font for readability

      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowColor }
        };
        cell.font = {
          name: 'Georgia',
          size: 11,
          color: { argb: fontColor }
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Bills_Export_${new Date().toISOString().split('T')[0]}.xlsx`);

    setShowExportModal(false);
  };

  const handleSnapshot = async () => {
    const tableContainer = document.getElementById('ledger-table-container');
    if (!tableContainer) return;
    
    const prevOverflow = tableContainer.style.overflow;
    tableContainer.style.overflow = 'visible';
    
    try {
      const canvas = await html2canvas(tableContainer, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#1A1A1A'
      });
      
      canvas.toBlob((blob) => {
        saveAs(blob, `Ledger_Snapshot_${new Date().toISOString().split('T')[0]}.png`);
      });
    } catch (err) {
      console.error("Snapshot error:", err);
      showAlert('Failed to take snapshot.', 'error');
    } finally {
      tableContainer.style.overflow = prevOverflow;
    }
  };

  return (
    <>
      <div className="page-wrapper fade-in" style={{ backgroundColor: '#111111', padding: '2rem' }}>
        <div className="print-hide" style={{ maxWidth: '1600px', margin: '0 auto', paddingBottom: '40px' }}>

          {/* Page Header */}
          <div className="page-header" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
              <div style={{ backgroundColor: 'white', border: '1px solid #D4AF37', padding: '4px', borderRadius: '4px', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0', color: '#D4AF37' }}>Bills Ledger</h2>
                <div style={{ color: '#888', fontSize: '0.95rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span>Complete history of all generated memorandums</span>
                  {lastSyncTime && (
                    <span style={{ fontSize: '0.78rem', color: isRefreshing ? '#D4AF37' : '#aaa', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {isRefreshing ? 'Syncing with server...' : `Cached • Last synced: ${new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', marginTop: '1rem' }}>
              <button
                onClick={() => loadLedgerData(true)}
                disabled={isRefreshing}
                title={lastSyncTime ? `Last synced: ${new Date(lastSyncTime).toLocaleTimeString()}` : 'Sync with server'}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: isRefreshing ? 'rgba(212, 175, 55, 0.2)' : 'transparent', border: '1px solid #D4AF37', color: '#D4AF37', padding: '12px 16px', borderRadius: '4px', cursor: isRefreshing ? 'not-allowed' : 'pointer', fontWeight: '600', transition: 'all 0.2s', flex: '1 1 auto', justifyContent: 'center' }}
                onMouseOver={(e) => { if (!isRefreshing) { e.currentTarget.style.background = '#D4AF37'; e.currentTarget.style.color = '#111'; } }}
                onMouseOut={(e) => { if (!isRefreshing) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#D4AF37'; } }}
              >
                <RefreshCw size={18} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                {isRefreshing ? 'Syncing...' : 'Sync / Refresh'}
              </button>
              {ledger.length > 0 && (
                <>
                  <button
                    onClick={() => setShowExportModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#D4AF37', border: '1px solid #D4AF37', color: 'white', padding: '12px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s', flex: '1 1 auto', justifyContent: 'center' }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    <FileSpreadsheet size={18} /> Export Excel
                  </button>
                  <button
                    onClick={handleSnapshot}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px solid #D4AF37', color: '#D4AF37', padding: '12px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s', flex: '1 1 auto', justifyContent: 'center' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#D4AF37'; e.currentTarget.style.color = 'white'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#D4AF37'; }}
                  >
                    <Camera size={18} /> Take Snapshot
                  </button>
                  <button
                    onClick={handleClearAll}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '12px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s', flex: '1 1 auto', justifyContent: 'center' }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <AlertTriangle size={18} /> Clear Ledger
                  </button>
                </>
              )}

              <div style={{ padding: '12px 25px', display: 'flex', alignItems: 'center', gap: '15px', borderRadius: '4px', backgroundColor: '#1A1A1A', border: '1px solid #333', flex: '1 1 auto', justifyContent: 'center' }}>
                <div style={{ color: '#888', fontSize: '0.95rem', fontWeight: '600' }}>Total Fees (Filtered)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '1.4rem', fontWeight: '800', color: '#D4AF37' }}>
                  <IndianRupee size={20} /> {grandTotal.toLocaleString()}
                </div>
              </div>

              {nilActualTotal > 0 && (
                <div
                  title="Actual value of items billed as NIL — admin record, never printed on bills"
                  style={{ padding: '12px 25px', display: 'flex', alignItems: 'center', gap: '15px', borderRadius: '4px', backgroundColor: 'rgba(96,165,250,0.06)', border: '1px dashed rgba(96,165,250,0.45)', flex: '1 1 auto', justifyContent: 'center' }}
                >
                  <div style={{ color: '#93c5fd', fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lock size={14} /> NIL Actual (Filtered)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '1.4rem', fontWeight: '800', color: '#93c5fd' }}>
                    <IndianRupee size={20} /> {nilActualTotal.toLocaleString('en-IN')}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search & Filter */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', maxWidth: '1100px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center', gap: '15px', padding: '1rem 1.5rem', borderRadius: '4px', border: '1px solid #333', backgroundColor: '#1A1A1A' }}>
              <Search size={24} color="#D4AF37" />
              <input
                type="text"
                placeholder="Search bills by client, case name, memo no, or date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', border: 'none', outline: 'none', fontSize: '1.15rem', backgroundColor: 'transparent', padding: '0', boxShadow: 'none', color: '#FFF' }}
              />
            </div>

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              style={{ width: 'auto', padding: '0.85rem 1.25rem', borderRadius: '4px', border: '1px solid #333', outline: 'none', backgroundColor: '#1A1A1A', color: '#FFF', cursor: 'pointer', minWidth: '140px', fontWeight: '600' }}
            >
              {availableYears.map(year => (
                <option key={year} value={year} style={{ background: '#111' }}>
                  {year === 'All' ? 'All Years' : year}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ width: 'auto', padding: '0.85rem 1.25rem', borderRadius: '4px', border: '1px solid #333', outline: 'none', backgroundColor: '#1A1A1A', color: '#FFF', cursor: 'pointer', minWidth: '140px', fontWeight: '600' }}
            >
              <option value="All" style={{ background: '#111' }}>All Statuses</option>
              <option value="Paid" style={{ background: '#111' }}>Paid</option>
              <option value="Due" style={{ background: '#111' }}>Due</option>
              <option value="Partial" style={{ background: '#111' }}>Partial</option>
            </select>
          </div>

          {/* Ledger Table */}
          <div id="ledger-table-container" style={{ padding: '0', overflow: 'hidden', backgroundColor: '#1A1A1A', borderRadius: '4px', border: '1px solid #333' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ minWidth: '1560px', width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333' }}>
                    <HeaderCell title="Bill No." colKey="memoNo" width="8%" columnFilters={columnFilters} sortConfig={sortConfig} activeFilterColumn={activeFilterColumn} setActiveFilterColumn={setActiveFilterColumn} getFilterDataForColumn={getFilterDataForColumn} handleColumnFilterChange={handleColumnFilterChange} handleColumnSortChange={handleColumnSortChange} />
                    <HeaderCell title="Name of Case" colKey="caseName" width="15%" columnFilters={columnFilters} sortConfig={sortConfig} activeFilterColumn={activeFilterColumn} setActiveFilterColumn={setActiveFilterColumn} getFilterDataForColumn={getFilterDataForColumn} handleColumnFilterChange={handleColumnFilterChange} handleColumnSortChange={handleColumnSortChange} />
                    <HeaderCell title="Case No." colKey="caseNumber" width="10%" columnFilters={columnFilters} sortConfig={sortConfig} activeFilterColumn={activeFilterColumn} setActiveFilterColumn={setActiveFilterColumn} getFilterDataForColumn={getFilterDataForColumn} handleColumnFilterChange={handleColumnFilterChange} handleColumnSortChange={handleColumnSortChange} />
                    <HeaderCell title="Nature of Brief" colKey="nature" width="22%" columnFilters={columnFilters} sortConfig={sortConfig} activeFilterColumn={activeFilterColumn} setActiveFilterColumn={setActiveFilterColumn} getFilterDataForColumn={getFilterDataForColumn} handleColumnFilterChange={handleColumnFilterChange} handleColumnSortChange={handleColumnSortChange} />
                    <HeaderCell title="Client" colKey="client" width="15%" columnFilters={columnFilters} sortConfig={sortConfig} activeFilterColumn={activeFilterColumn} setActiveFilterColumn={setActiveFilterColumn} getFilterDataForColumn={getFilterDataForColumn} handleColumnFilterChange={handleColumnFilterChange} handleColumnSortChange={handleColumnSortChange} />
                    <HeaderCell title="Briefed By" colKey="briefedBy" width="10%" columnFilters={columnFilters} sortConfig={sortConfig} activeFilterColumn={activeFilterColumn} setActiveFilterColumn={setActiveFilterColumn} getFilterDataForColumn={getFilterDataForColumn} handleColumnFilterChange={handleColumnFilterChange} handleColumnSortChange={handleColumnSortChange} />
                    <th style={{ width: '9%', textAlign: 'right', color: '#D4AF37', padding: '16px 12px' }}>Amount (Rs.)</th>
                    <th
                      title="Actual value of items billed as NIL — admin record, never printed on bills"
                      style={{ width: '11%', textAlign: 'left', color: '#93c5fd', padding: '16px 12px', whiteSpace: 'nowrap' }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Lock size={13} /> NIL Actual (Admin)</span>
                    </th>
                    <HeaderCell title="Bill Given" colKey="billsProvided" width="9%" align="center" columnFilters={columnFilters} sortConfig={sortConfig} activeFilterColumn={activeFilterColumn} setActiveFilterColumn={setActiveFilterColumn} getFilterDataForColumn={getFilterDataForColumn} handleColumnFilterChange={handleColumnFilterChange} handleColumnSortChange={handleColumnSortChange} />
                    <th style={{ width: '12%', textAlign: 'center', color: '#D4AF37', padding: '16px 12px' }}>Status & Actions</th>
                    <th style={{ width: '12%', textAlign: 'left', color: '#D4AF37', padding: '16px 12px' }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 15 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : filteredLedger.length > 0 ? (
                    <>
                      {filteredLedger.slice(0, visibleCount).map((bill, index) => {
                        const { total: totalFees, itemsTotal, isNil: isAllNilBill, waived: isWaived, unbilled } = getBillTotals(bill);
                        const nilItems = getForgoneItems(bill);
                        const amountReceived = Number(bill.amountReceived) || 0;
                        const due = totalFees - amountReceived;

                        let displayStatus = bill.status || 'Due';
                        if (!bill.status && due <= 0 && totalFees > 0) displayStatus = 'Paid';

                        const isBillsMade = ['yes', 'bills made', 'made'].includes(String(bill.billsProvided || 'no').toLowerCase().trim());

                        return (
                          <tr key={bill._id || bill.id} style={{ borderBottom: '1px solid #333', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#222'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                            <td style={tdStyle} data-label="Bill No."><span style={{ fontWeight: '700', color: '#D4AF37' }}>{bill.memoNo || '-'}</span></td>
                            <td style={tdStyle} data-label="Name of Case"><div style={{ whiteSpace: 'pre-line', lineHeight: '1.4' }}>{bill.caseName}</div></td>
                            <td style={tdStyle} data-label="Case No.">{bill.caseNumber || '-'}</td>
                            <td style={tdStyle} data-label="Nature of Brief"><div style={{ lineHeight: '1.5' }}>
                              {bill.items.map((i, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '4px' }}>
                                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#D4AF37', marginTop: '7px', flexShrink: 0 }}></div>
                                  <span>
                                    {i.nature}
                                    {isNilItem(i) && (
                                      <span
                                        title="Billed as NIL — see the NIL Actual (Admin) column"
                                        style={{ marginLeft: '6px', whiteSpace: 'nowrap', fontSize: '0.72rem', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', color: '#93c5fd', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)' }}
                                      >
                                        NIL
                                      </span>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div></td>
                            <td style={tdStyle} data-label="Client"><span style={{ fontWeight: '600', color: '#FFF' }}>{bill.client.split('\n')[0]}</span></td>
                            <td style={tdStyle} data-label="Briefed By"><span style={{ color: '#aaa' }}>{bill.briefedBy || '-'}</span></td>
                            <td style={{ ...tdStyle, textAlign: 'right' }} data-label="Amount (Rs.)">{isAllNilBill ? (
                              <span
                                title={isWaived && itemsTotal > 0 ? `NIL bill — fees of ₹${itemsTotal.toLocaleString('en-IN')} not charged` : 'NIL'}
                                style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}
                              >
                                <span style={{ fontWeight: '800', color: '#D4AF37', letterSpacing: '0.04em' }}>NIL</span>
                                {isWaived && itemsTotal > 0 && (
                                  <span style={{ fontSize: '0.75rem', color: '#71717a', textDecoration: 'line-through' }}>₹{itemsTotal.toLocaleString('en-IN')}</span>
                                )}
                              </span>
                            ) : (
                              <span style={{ fontWeight: '700', color: '#D4AF37' }}>{totalFees > 0 ? `₹${totalFees}` : '-'}</span>
                            )}
</td>
                            <td style={tdStyle} data-label="NIL Actual (Admin)">
                              {nilItems.length === 0 ? (
                                <span style={{ color: '#52525b' }}>—</span>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '140px' }}>
                                  {isWaived && (
                                    <span
                                      title="Whole bill marked NIL — every item's fees were not charged"
                                      style={{ alignSelf: 'flex-start', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '1px 6px', borderRadius: '4px', color: '#D4AF37', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)' }}
                                    >
                                      Whole bill NIL
                                    </span>
                                  )}
                                  {nilItems.map((it, k) => {
                                    const actual = getForgoneFees(it, isWaived);
                                    const gmLabel = isNilItem(it) ? it.actualGm : it.gm;
                                    return (
                                      <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#a1a1aa', lineHeight: 1.3 }}>{it.nature || 'Item'}</span>
                                        {actual > 0 ? (
                                          <span style={{ fontWeight: 700, color: '#93c5fd', fontVariantNumeric: 'tabular-nums' }}>
                                            ₹{actual.toLocaleString('en-IN')}
                                            {gmLabel && <span style={{ fontWeight: 500, fontSize: '0.72rem', color: '#71717a' }}> · {gmLabel} GM</span>}
                                          </span>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => handleEditClick(bill)}
                                            title="Edit this bill to record the actual value"
                                            style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.75rem', fontStyle: 'italic', color: '#71717a', textDecoration: 'underline dotted' }}
                                          >
                                            Not recorded
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {nilItems.length > 1 && unbilled > 0 && (
                                    <div style={{ borderTop: '1px solid rgba(96,165,250,0.2)', paddingTop: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#93c5fd' }}>
                                      Total ₹{unbilled.toLocaleString('en-IN')}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center' }} data-label="Bill Given">
                              <select
                                value={isBillsMade ? 'Bills Made' : 'Not Made'}
                                onChange={(e) => handleBillsProvidedChange(bill, e.target.value)}
                                style={{
                                  border: 'none',
                                  outline: 'none',
                                  cursor: 'pointer',
                                  backgroundColor: isBillsMade ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                  color: isBillsMade ? '#4ade80' : '#f87171',
                                  width: 'auto',
                                  height: 'auto',
                                  minWidth: '100px',
                                  padding: '6px 10px',
                                  borderRadius: '4px',
                                  fontWeight: '700',
                                  fontSize: '0.85rem',
                                  textAlign: 'center',
                                  textAlignLast: 'center'
                                }}
                              >
                                <option value="Bills Made" style={{ background: '#111', color: '#4ade80' }}>Given</option>
                                <option value="Not Made" style={{ background: '#111', color: '#f87171' }}>Not Given</option>
                              </select>
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center' }} data-label="Status & Actions">
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                <select
                                  value={displayStatus}
                                  onChange={(e) => handleStatusChange(bill, e.target.value)}
                                  style={{
                                    border: 'none',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: displayStatus === 'Paid' ? 'rgba(34, 197, 94, 0.2)' : (displayStatus === 'Partial' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)'),
                                    color: displayStatus === 'Paid' ? '#4ade80' : (displayStatus === 'Partial' ? '#facc15' : '#f87171'),
                                    width: 'auto',
                                    height: 'auto',
                                    minWidth: '80px',
                                    padding: '6px 12px',
                                    borderRadius: '4px',
                                    fontWeight: '700',
                                    fontSize: '0.85rem',
                                    textAlign: 'center',
                                    textAlignLast: 'center'
                                  }}
                                >
                                  <option value="Due" style={{ background: '#111', color: '#f87171' }}>Due</option>
                                  <option value="Paid" style={{ background: '#111', color: '#4ade80' }}>Paid</option>
                                  <option value="Partial" style={{ background: '#111', color: '#facc15' }}>Partial</option>
                                </select>
                                <button
                                  onClick={() => setPreviewBill(bill)}
                                  style={{ background: 'transparent', border: 'none', color: '#D4AF37', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', opacity: 0.8 }}
                                  onMouseOver={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.15)'; }}
                                  onMouseOut={(e) => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.transform = 'scale(1)'; }}
                                  title="Preview & Download Bill"
                                >
                                  <Eye size={18} />
                                </button>
                                <button
                                  onClick={() => handleEditClick(bill)}
                                  style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', opacity: 0.8 }}
                                  onMouseOver={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.15)'; }}
                                  onMouseOut={(e) => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.transform = 'scale(1)'; }}
                                  title="Edit Bill"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteBill(bill._id || bill.id)}
                                  style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', opacity: 0.6 }}
                                  onMouseOver={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.15)'; }}
                                  onMouseOut={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.transform = 'scale(1)'; }}
                                  title="Delete Bill"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                            <td style={{ ...tdStyle, minWidth: '180px' }} data-label="Remarks">
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
                          </tr>
                        );
                      })}
                      {visibleCount < filteredLedger.length && (
                        <tr ref={lastElementRef}>
                          <td colSpan="11" style={{ padding: '2rem' }}>
                            <div className="skeleton skeleton-cell" style={{ width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto', opacity: 0.5 }}></div>
                          </td>
                        </tr>
                      )}
                    </>
                  ) : (
                    <tr>
                      <td colSpan="11" style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
                        No bills match your search filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {previewBill && createPortal(
        <div className="modal-overlay print-modal-reset" style={{ position: 'fixed', top: 0, left: 0, right: feeOpen ? panelWidth : 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>

          <div className="print-modal-content-reset" style={{ backgroundColor: '#1C1C1E', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.3)', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '1000px', maxHeight: '95vh', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>

            {/* Modal Header */}
            <div className="print-hide" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: '15px', gap: '15px', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', backgroundColor: '#18181b' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', flex: '1 1 auto', justifyContent: 'center' }}>
                <button
                  style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 15px', backgroundColor: previewType === 'advocate' ? '#D4AF37' : 'transparent', color: previewType === 'advocate' ? 'white' : '#D4AF37', border: '1px solid #D4AF37', borderRadius: '6px', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                  onClick={() => setPreviewType('advocate')}
                >
                  <User size={16} /> Advocate Bill
                </button>
                <button
                  style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 15px', backgroundColor: previewType === 'clerk' ? '#D4AF37' : 'transparent', color: previewType === 'clerk' ? 'white' : '#D4AF37', border: '1px solid #D4AF37', borderRadius: '6px', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                  onClick={() => setPreviewType('clerk')}
                >
                  <UserCircle size={16} /> Clerkage Bill
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', flex: '1 1 auto', justifyContent: 'center' }}>
                <button
                  onClick={handleSavePdf}
                  style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 15px', backgroundColor: '#D4AF37', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  <Download size={16} /> Save PDF
                </button>
                <button
                  onClick={() => window.print()}
                  style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 15px', backgroundColor: 'transparent', color: '#D4AF37', fontWeight: 'bold', border: '1px solid #D4AF37', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}
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

            {/* Modal Body / Scrollable Area */}
            <div
              ref={previewContainerRef}
              className="print-modal-body-reset"
              style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '30px', backgroundColor: '#2a2a2d', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <div
                id="preview-capture-area"
                style={{
                  transformOrigin: 'top center',
                  display: 'flex',
                  justifyContent: 'center',
                  transform: `scale(${previewScale})`,
                  marginBottom: previewScale < 1 ? `-${(1 - previewScale) * 1100}px` : '0',
                  transition: 'transform 0.2s ease-out, margin-bottom 0.2s ease-out'
                }}
              >
                {previewType === 'advocate' ? (
                  <BillPreview settings={settings} bill={previewBill} onSave={handleInlinePreviewSave} />
                ) : (
                  <ClerkBillPreview settings={settings} bill={previewBill} onSave={handleInlinePreviewSave} />
                )}
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Export Modal */}
      {showExportModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div style={{ backgroundColor: '#1A1A1A', padding: '2.5rem', borderRadius: '16px', border: '1px solid rgba(212, 175, 55, 0.4)', width: '450px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileSpreadsheet color="#D4AF37" size={24} />
                <h3 style={{ margin: 0, color: '#D4AF37', fontSize: '1.4rem', fontWeight: '700' }}>Export Options</h3>
              </div>
              <button onClick={() => setShowExportModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#888', cursor: 'pointer', borderRadius: '50%', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { id: 'filtered', label: 'Current View (Filtered)', desc: 'Export the bills currently shown on screen.' },
                { id: 'lastMonth', label: 'Last Month', desc: 'Export bills generated in the previous month.' },
                { id: 'lastYear', label: 'Last Year', desc: 'Export bills generated in the previous calendar year.' },
                { id: 'last2Years', label: 'Last 2 Years', desc: 'Export bills from this year and the previous year.' },
                { id: 'custom', label: 'Custom Date Range', desc: 'Select a specific start and end date.' }
              ].map(opt => (
                <div
                  key={opt.id}
                  onClick={() => setExportType(opt.id)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: exportType === opt.id ? '2px solid #D4AF37' : '1px solid #333',
                    backgroundColor: exportType === opt.id ? 'rgba(212, 175, 55, 0.1)' : '#222',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: exportType === opt.id ? '5px solid #D4AF37' : '2px solid #666', backgroundColor: 'transparent' }}></div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: exportType === opt.id ? '#D4AF37' : '#FFF', fontWeight: '600', fontSize: '1rem' }}>{opt.label}</span>
                    <span style={{ color: '#888', fontSize: '0.8rem', marginTop: '2px' }}>{opt.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            {exportType === 'custom' && (
              <div style={{ display: 'flex', gap: '15px', marginTop: '15px', padding: '15px', backgroundColor: '#111', borderRadius: '10px', border: '1px solid #333' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: '#D4AF37', fontSize: '0.85rem', marginBottom: '6px', fontWeight: '600' }}>Start Date</label>
                  <input type="date" value={exportStartDate} onChange={(e) => setExportStartDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', backgroundColor: '#222', color: '#FFF', outline: 'none', colorScheme: 'dark' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: '#D4AF37', fontSize: '0.85rem', marginBottom: '6px', fontWeight: '600' }}>End Date</label>
                  <input type="date" value={exportEndDate} onChange={(e) => setExportEndDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', backgroundColor: '#222', color: '#FFF', outline: 'none', colorScheme: 'dark' }} />
                </div>
              </div>
            )}

            <button
              onClick={executeExport}
              style={{ width: '100%', padding: '14px', marginTop: '1.5rem', backgroundColor: '#D4AF37', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.05rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)' }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 15px rgba(212, 175, 55, 0.4)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(212, 175, 55, 0.3)'; }}
            >
              <Download size={18} /> Download Excel Data
            </button>
          </div>
        </div>,
        document.body
      )}

      <AuthGateModal
        open={showAuthModal}
        onClose={() => { setShowAuthModal(false); setPendingAction(null); }}
        onVerified={handleAuthVerified}
        phone={settings?.forgotPasswordPhone}
        otpOnly={pendingAction?.type === 'deleteBill' || pendingAction?.type === 'clearAll'}
        pinOnly={pendingAction?.type === 'edit'}
        message={
          pendingAction?.type === 'edit'
            ? <>Enter your 4-digit PIN to authorize editing for bill <strong>{billToEdit?.memoNo}</strong>.</>
            : pendingAction?.type === 'clearAll'
              ? 'Enter the OTP sent to your registered number to authorize deleting ALL bills.'
              : 'Enter the OTP sent to your registered number to authorize deleting this bill.'
        }
      />

      {/* Edit Bill Modal with Live Preview & Interactive Click-to-Edit */}
      {editingBill && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: feeOpen ? panelWidth : 0, bottom: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px', transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <div style={{ background: '#141416', width: '98%', maxWidth: '1700px', height: '94vh', maxHeight: '94vh', borderRadius: '14px', border: '1px solid rgba(212, 175, 55, 0.4)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid #2a2a2d', background: '#18181b', zIndex: 10, flexWrap: 'wrap', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ backgroundColor: '#D4AF37', color: '#000', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit2 size={18} />
                </div>
                <div>
                  <h2 style={{ color: '#D4AF37', margin: 0, fontSize: '1.3rem', fontWeight: '700' }}>
                    Edit Bill {editingBill.memoNo ? `– ${editingBill.memoNo}` : ''}
                  </h2>
                  <div style={{ color: '#888', fontSize: '0.82rem', marginTop: '2px' }}>
                    Live Preview &amp; Click-to-Edit Mode
                  </div>
                </div>
              </div>

              {/* Center Toggle: Advocate Bill vs Clerkage Bill Preview */}
              <div style={{ display: 'flex', backgroundColor: '#111', borderRadius: '8px', padding: '3px', border: '1px solid #333', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setEditPreviewType('advocate')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: editPreviewType === 'advocate' ? '#D4AF37' : 'transparent',
                    color: editPreviewType === 'advocate' ? '#000' : '#aaa',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <User size={14} /> Advocate Bill
                </button>
                <button
                  type="button"
                  onClick={() => setEditPreviewType('clerk')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: editPreviewType === 'clerk' ? '#D4AF37' : 'transparent',
                    color: editPreviewType === 'clerk' ? '#000' : '#aaa',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <UserCircle size={14} /> Clerkage Bill
                </button>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  onClick={() => setEditingBill(null)} 
                  disabled={isSavingEdit}
                  style={{ padding: '9px 18px', background: 'transparent', border: '1px solid #555', color: '#ccc', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEdit} 
                  disabled={isSavingEdit}
                  style={{ 
                    padding: '9px 22px', 
                    background: isSavingEdit ? '#998030' : '#D4AF37', 
                    border: 'none', 
                    color: '#000', 
                    borderRadius: '6px', 
                    cursor: isSavingEdit ? 'not-allowed' : 'pointer', 
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)'
                  }}
                >
                  {isSavingEdit && <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditingBill(null)}
                  style={{ padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', backgroundColor: 'rgba(255,255,255,0.06)', color: '#888', cursor: 'pointer' }}
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body: Split 2-Column Layout */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              
              {/* Left Panel: Form */}
              <div style={{ flex: '1 1 50%', maxWidth: '52%', overflowY: 'auto', padding: '1.5rem 2rem', borderRight: '1px solid #2a2a2d', backgroundColor: '#111' }}>
                <BillForm 
                  bill={editingBill} 
                  onChange={setEditingBill} 
                  isRough={false} 
                  highlightField={editHighlightField} 
                />

                {/* Bottom Save Action Bar */}
                <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #333', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button 
                    onClick={() => setEditingBill(null)} 
                    disabled={isSavingEdit}
                    style={{ padding: '12px 24px', background: 'transparent', border: '1px solid #555', color: '#ccc', borderRadius: '6px', cursor: 'pointer', fontSize: '0.95rem' }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveEdit} 
                    disabled={isSavingEdit}
                    style={{ 
                      padding: '12px 30px', 
                      background: isSavingEdit ? '#998030' : '#D4AF37', 
                      border: 'none', 
                      color: '#000', 
                      borderRadius: '6px', 
                      cursor: isSavingEdit ? 'not-allowed' : 'pointer', 
                      fontWeight: '700',
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 15px rgba(212, 175, 55, 0.4)'
                    }}
                  >
                    {isSavingEdit && <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                    {isSavingEdit ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              {/* Right Panel: Live Bill Preview */}
              <div 
                ref={editPreviewContainerRef}
                style={{ flex: '1 1 50%', overflowY: 'auto', overflowX: 'hidden', padding: '20px', backgroundColor: '#202023', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                {/* Visual click-to-edit hint */}
                <div style={{
                  marginBottom: '15px',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(212, 175, 55, 0.12)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  color: '#D4AF37',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  userSelect: 'none'
                }}>
                  <span>💡</span>
                  <span>Click any section on the bill below to focus and edit it in the form</span>
                </div>

                <div
                  style={{
                    transformOrigin: 'top center',
                    display: 'flex',
                    justifyContent: 'center',
                    transform: `scale(${editPreviewScale})`,
                    marginBottom: editPreviewScale < 1 ? `-${(1 - editPreviewScale) * 1100}px` : '0',
                    transition: 'transform 0.2s ease-out, margin-bottom 0.2s ease-out'
                  }}
                >
                  {editPreviewType === 'advocate' ? (
                    <BillPreview 
                      settings={settings} 
                      bill={editingBill} 
                      onFieldClick={(field) => {
                        setEditHighlightField(field);
                        setTimeout(() => setEditHighlightField(null), 3000);
                      }} 
                    />
                  ) : (
                    <ClerkBillPreview 
                      settings={settings} 
                      bill={editingBill} 
                      onFieldClick={(field) => {
                        setEditHighlightField(field);
                        setTimeout(() => setEditHighlightField(null), 3000);
                      }} 
                    />
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
