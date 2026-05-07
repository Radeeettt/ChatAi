import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { logout, username } = useAuth();

  return (
    <div className="glass-panel" style={{
      width: '260px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem',
      borderRadius: '0',
      borderRight: '1px solid var(--border)',
      borderTop: 'none',
      borderBottom: 'none',
      borderLeft: 'none'
    }}>
      <h2 style={{ color: 'var(--primary)', marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
        AI Inbox
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        <NavLink 
          to="/" 
          style={({ isActive }) => ({
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            color: isActive ? 'white' : 'var(--text-muted)',
            backgroundColor: isActive ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
            transition: 'all 0.2s',
            fontWeight: isActive ? 600 : 400
          })}
        >
          💬 Chat Inbox
        </NavLink>
        <NavLink 
          to="/knowledge" 
          style={({ isActive }) => ({
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            color: isActive ? 'white' : 'var(--text-muted)',
            backgroundColor: isActive ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
            transition: 'all 0.2s',
            fontWeight: isActive ? 600 : 400
          })}
        >
          📚 Knowledge Base
        </NavLink>
      </div>

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          Logged in as <strong>{username}</strong>
        </p>
        <button 
          onClick={logout}
          style={{
            width: '100%',
            background: 'transparent',
            color: 'var(--danger)',
            border: '1px solid var(--danger)',
            padding: '0.5rem',
            borderRadius: '0.5rem',
            fontWeight: '600'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
