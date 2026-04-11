import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Upload() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const imageRef = useRef(null);
  const [activeMethod, setActiveMethod] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files[0] || e.target?.files[0];
    if (file) {
      setSelectedFile(file);
      setActiveMethod('csv');
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target?.files[0];
    if (file) {
      setSelectedFile(file);
      setActiveMethod('image');
    }
  };

  const handleProceed = () => {
    navigate('/upload/verify');
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 className="section-title">{t('upload.title')}</h1>
        <p className="section-subtitle">{t('upload.subtitle')}</p>
      </div>

      <div className="grid-3" style={{ marginBottom: 'var(--space-6)' }}>
        {/* CSV Upload */}
        <div
          className={`upload-card ${activeMethod === 'csv' ? 'active' : ''} ${dragOver ? 'active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => fileRef.current?.click()}
          id="upload-csv"
        >
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileDrop} hidden />
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>📄</div>
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>
            {t('upload.csv_title')}
          </h3>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
            {t('upload.csv_desc')}
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <span className="badge badge-muted">.csv</span>
            <span className="badge badge-muted">.xlsx</span>
            <span className="badge badge-muted">.xls</span>
          </div>
        </div>

        {/* Image OCR */}
        <div
          className={`upload-card ${activeMethod === 'image' ? 'active' : ''}`}
          onClick={() => imageRef.current?.click()}
          id="upload-image"
        >
          <input ref={imageRef} type="file" accept="image/*" onChange={handleImageSelect} hidden />
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>📷</div>
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>
            {t('upload.image_title')}
          </h3>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
            {t('upload.image_desc')}
          </p>
          <span className="badge badge-primary">🤖 AI OCR</span>
        </div>

        {/* Manual Entry */}
        <div
          className={`upload-card ${activeMethod === 'manual' ? 'active' : ''}`}
          onClick={() => { setActiveMethod('manual'); navigate('/upload/verify'); }}
          id="upload-manual"
        >
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>✏️</div>
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>
            {t('upload.manual_title')}
          </h3>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            {t('upload.manual_desc')}
          </p>
        </div>
      </div>

      {/* Selected File Info */}
      {selectedFile && (
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ fontSize: '1.5rem' }}>{activeMethod === 'csv' ? '📄' : '📷'}</span>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{selectedFile.name}</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                {(selectedFile.size / 1024).toFixed(1)} KB
              </div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleProceed} id="btn-proceed-upload">
            Process & Verify →
          </button>
        </div>
      )}

      {/* Recent Uploads */}
      <div className="glass-card">
        <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)' }}>
          Recent Uploads
        </h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>File</th>
              <th>Type</th>
              <th>Records</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>march_sales.csv</td>
              <td><span className="badge badge-info">CSV</span></td>
              <td>150</td>
              <td><span className="badge badge-success">Verified</span></td>
              <td>Apr 10, 2026</td>
            </tr>
            <tr>
              <td>ledger_page_3.jpg</td>
              <td><span className="badge badge-primary">OCR</span></td>
              <td>28</td>
              <td><span className="badge badge-success">Verified</span></td>
              <td>Apr 8, 2026</td>
            </tr>
            <tr>
              <td>feb_inventory.xlsx</td>
              <td><span className="badge badge-info">Excel</span></td>
              <td>95</td>
              <td><span className="badge badge-success">Verified</span></td>
              <td>Mar 28, 2026</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
