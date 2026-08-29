import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, Database, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';

export interface DocumentItem {
  id: string;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
  chunkCount: number;
  status: string;
  createdAt: string;
}

export const DocumentManager: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [manualText, setManualText] = useState('');
  const [filename, setFilename] = useState('');

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/v1/documents', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        await fetchDocuments();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleManualAdd = async () => {
    if (!manualText.trim() || !filename.trim()) return;

    setUploading(true);
    try {
      const res = await fetch('/api/v1/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: filename.endsWith('.md') ? filename : `${filename}.md`,
          text: manualText
        })
      });
      if (res.ok) {
        setManualText('');
        setFilename('');
        await fetchDocuments();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchDocuments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalChunks = documents.reduce((acc, d) => acc + d.chunkCount, 0);

  return (
    <div className="kb-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2d241e', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={20} color="#f97316" />
            RAG Knowledge Base & Vector Index
          </h2>
          <p style={{ fontSize: '0.84rem', color: '#8c7c6e', marginTop: '4px' }}>
            Ingest text and markdown documents to compute 128D embeddings for semantic search.
          </p>
        </div>

        <button 
          onClick={fetchDocuments} 
          style={{ background: '#ffffff', border: '1px solid rgba(217,119,6,0.2)', color: '#574b40', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.82rem' }}
        >
          <RefreshCw size={14} color="#f97316" /> Refresh Index
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div style={{ background: '#ffffff', border: '1px solid rgba(217,119,6,0.12)', borderRadius: '14px', padding: '18px', boxShadow: '0 4px 15px rgba(160,120,80,0.06)' }}>
          <div style={{ fontSize: '0.74rem', color: '#8c7c6e', textTransform: 'uppercase', fontWeight: 800 }}>Indexed Documents</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#f97316', marginTop: '4px' }}>{documents.length}</div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid rgba(217,119,6,0.12)', borderRadius: '14px', padding: '18px', boxShadow: '0 4px 15px rgba(160,120,80,0.06)' }}>
          <div style={{ fontSize: '0.74rem', color: '#8c7c6e', textTransform: 'uppercase', fontWeight: 800 }}>Total Vector Chunks</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>{totalChunks}</div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid rgba(217,119,6,0.12)', borderRadius: '14px', padding: '18px', boxShadow: '0 4px 15px rgba(160,120,80,0.06)' }}>
          <div style={{ fontSize: '0.74rem', color: '#8c7c6e', textTransform: 'uppercase', fontWeight: 800 }}>Embedding Dimension</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>128D Normalized</div>
        </div>
      </div>

      {/* Upload Zone */}
      <label className="kb-dropzone">
        <input type="file" onChange={handleFileUpload} accept=".txt,.md,.json,.csv" style={{ display: 'none' }} />
        <Upload size={34} color="#f97316" style={{ marginBottom: '12px' }} />
        <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#2d241e' }}>
          {uploading ? 'Processing & Vectorizing Document...' : 'Click to Upload Document (.md, .txt, .json)'}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#8c7c6e', marginTop: '6px' }}>
          Automatically chunks text, calculates 128D embeddings, and indexes in SQLite vector database.
        </div>
      </label>

      {/* Manual Paste Section */}
      <div style={{ background: '#ffffff', border: '1px solid rgba(217,119,6,0.15)', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 20px rgba(160,120,80,0.06)' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '12px', color: '#2d241e', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={17} color="#f97316" /> Quick Ingest Markdown / Note
        </h4>
        <input
          type="text"
          placeholder="Document Title (e.g. System_Spec.md)"
          value={filename}
          onChange={e => setFilename(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: '#faf6f0', border: '1px solid rgba(217,119,6,0.15)', color: '#2d241e', fontSize: '0.86rem', marginBottom: '12px', outline: 'none' }}
        />
        <textarea
          placeholder="Paste Markdown or text document content here..."
          value={manualText}
          onChange={e => setManualText(e.target.value)}
          rows={3}
          style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: '#faf6f0', border: '1px solid rgba(217,119,6,0.15)', color: '#2d241e', fontSize: '0.86rem', marginBottom: '12px', resize: 'vertical', outline: 'none' }}
        />
        <button
          onClick={handleManualAdd}
          disabled={uploading || !filename || !manualText}
          style={{ background: 'linear-gradient(135deg, #f97316, #d97706)', border: 'none', color: '#fff', fontWeight: 800, padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(249,115,22,0.3)' }}
        >
          Ingest & Index Vector
        </button>
      </div>

      {/* Document Grid */}
      <div className="doc-grid">
        {documents.map(doc => (
          <div key={doc.id} className="doc-card">
            <div>
              <div className="doc-card-title">
                <FileText size={17} color="#f97316" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#8c7c6e', marginTop: '6px' }}>
                Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
              </div>
            </div>

            <div className="doc-card-stats">
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#059669' }}>
                <CheckCircle2 size={13} /> {doc.chunkCount} Chunks
              </span>
              <span>{(doc.fileSizeBytes / 1024).toFixed(1)} KB</span>
            </div>

            <button
              onClick={() => handleDelete(doc.id)}
              style={{ background: 'rgba(225, 29, 72, 0.08)', border: '1px solid rgba(225,29,72,0.2)', color: '#e11d48', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}
            >
              <Trash2 size={14} /> Remove Document
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
