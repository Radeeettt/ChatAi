import React, { useState, useEffect } from 'react';
import api from '../utils/api';

interface KBEntry {
  id: number;
  title: string;
  content: string;
  category: string;
  createdAt: string;
}

const KnowledgeBase = () => {
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: 0, title: '', content: '', category: 'SOP' });

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const res = await api.get('/knowledge');
      setEntries(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpenModal = (entry?: KBEntry) => {
    if (entry) {
      setFormData(entry);
    } else {
      setFormData({ id: 0, title: '', content: '', category: 'SOP' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await api.put(`/knowledge/${formData.id}`, formData);
      } else {
        await api.post('/knowledge', formData);
      }
      setIsModalOpen(false);
      fetchEntries();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      await api.delete(`/knowledge/${id}`);
      fetchEntries();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Knowledge Base</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage SOPs, pricing, and guidelines for the AI.</p>
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          + Add New Entry
        </button>
      </div>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
        {entries.map(entry => (
          <div key={entry.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>{entry.title}</h3>
              <span style={{
                background: 'rgba(99, 102, 241, 0.2)',
                color: 'var(--primary)',
                padding: '0.2rem 0.6rem',
                borderRadius: '1rem',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                {entry.category}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', flex: 1, whiteSpace: 'pre-wrap' }}>
              {entry.content.length > 150 ? entry.content.substring(0, 150) + '...' : entry.content}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button
                onClick={() => handleOpenModal(entry)}
                style={{ flex: 1, padding: '0.5rem', background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: '0.5rem' }}
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(entry.id)}
                style={{ flex: 1, padding: '0.5rem', background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: '0.5rem' }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '600px', padding: '2rem', background: 'var(--bg-card)' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>{formData.id ? 'Edit Entry' : 'Add New Entry'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{
                    background: 'var(--bg-dark)',
                    border: '1px solid var(--border)',
                    color: 'white',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    outline: 'none'
                  }}
                >
                  <option value="SOP">SOP</option>
                  <option value="PRICE">Pricing</option>
                  <option value="FAQ">FAQ</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Content (Text to train AI)</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={8}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '0.75rem', background: 'transparent', color: 'white', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
