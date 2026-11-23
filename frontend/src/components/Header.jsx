import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { User, CalendarDays } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';
import WorkCalendarModal from './WorkCalendarModal';

export default function Header() {
  const [isChangePwdOpen, setIsChangePwdOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const navItems = [
    { path: '/', label: 'Create Bill' },
    { path: '/ledger', label: 'Bills Ledger' },
    { path: '/rough-bills', label: 'Rough Bills' },
    { path: '/settings', label: 'Settings' }
  ];

  return (
    <>
      <style>{`
        .custom-nav-header {
          background-color: #1C1C1E;
          margin: 1rem auto;
          width: 98%;
          max-width: 1800px;
          padding: 1rem 2rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-direction: row;
        }
        .custom-nav-links {
          display: flex;
          align-items: center;
          gap: 2rem;
        }
        .custom-nav-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        @media screen and (max-width: 1024px) {
          .custom-nav-header {
            flex-direction: column;
            gap: 1.5rem;
            padding: 1.5rem;
          }
          .custom-nav-links {
            flex-wrap: wrap;
            justify-content: center;
            gap: 1rem;
          }
          .custom-nav-actions {
            justify-content: center;
            width: 100%;
          }
        }
      `}</style>
      <header className="custom-nav-header print-hide fade-in" style={{ position: 'relative', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/logo.png" alt="Logo" style={{ height: '45px', width: 'auto', borderRadius: '50%' }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800', color: 'white', letterSpacing: '-0.03em', lineHeight: '1.2' }}>Rhiddhiman Mukherjee</h2>
            <div style={{ fontSize: '0.65rem', color: '#D4AF37', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase' }}>ADVOCATE, HIGH COURT CALCUTTA</div>
          </div>
        </div>

        <nav className="custom-nav-links">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                color: isActive ? '#D4AF37' : '#a1a1aa',
                fontWeight: '700',
                textDecoration: 'none',
                paddingBottom: '5px',
                borderBottom: isActive ? '2px solid #D4AF37' : 'none',
                fontSize: '1rem'
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="custom-nav-actions">
          <button
            onClick={() => setIsCalendarOpen(true)}
            style={{ color: '#D4AF37', border: '1px solid #D4AF37', background: 'transparent', cursor: 'pointer', borderRadius: '6px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '0.85rem' }}
            title="See your works by date"
          >
            <CalendarDays size={16} /> My Works
          </button>
          <button
            onClick={() => setIsChangePwdOpen(true)}
            style={{ color: '#D4AF37', border: '1px solid #D4AF37', background: 'transparent', cursor: 'pointer', borderRadius: '50%', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Change Password"
          >
            <User size={16} />
          </button>
          <button 
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }}
            style={{ 
              backgroundColor: 'white', 
              color: '#ef4444', 
              border: 'none', 
              padding: '8px 24px', 
              borderRadius: '4px', 
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            LOG OUT
          </button>
        </div>
      </header>

      {isChangePwdOpen && (
        <ChangePasswordModal onClose={() => setIsChangePwdOpen(false)} />
      )}

      {isCalendarOpen && (
        <WorkCalendarModal onClose={() => setIsCalendarOpen(false)} />
      )}
    </>
  );
}
