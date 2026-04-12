import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { uploadApi } from '../../services/api';

export default function Upload() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const imageRef = useRef(null);
  const [activeMethod, setActiveMethod] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState('');

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    setError(null);
    const file = e.dataTransfer?.files[0] || e.target?.files[0];
    if (file) {
      setSelectedFile(file);
      setActiveMethod('csv');
    }
  };

  const handleImageSelect = (e) => {
    setError(null);
    const file = e.target?.files[0];
    if (file) {
      setSelectedFile(file);
      setActiveMethod('image');
    }
  };

  const handleProceed = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      if (activeMethod === 'image') {
        // ── Image OCR upload ──
        setUploadProgress('Uploading image to AI OCR engine...');
        const result = await uploadApi.image(selectedFile);

        if (!result.extracted_data || result.extracted_data.length === 0) {
          setError('OCR could not extract any data from this image. Please try a clearer photo or use CSV upload instead.');
          setUploading(false);
          return;
        }

        // Transform API response into verify-page format
        const verifyData = result.extracted_data.map((item, idx) => ({
          id: idx + 1,
          name: item.name || '',
          date: item.date || '',
          quantity: item.quantity || 0,
          price: item.price || 0,
          category: 'medicines',
          confidence: item.confidence || 0.5,
        }));

        navigate('/upload/verify', {
          state: {
            data: verifyData,
            source: 'image',
            overallConfidence: result.overall_confidence,
            fileName: selectedFile.name,
          },
        });

      } else if (activeMethod === 'csv') {
        // ── CSV/Excel upload ──
        setUploadProgress('Parsing spreadsheet...');
        const result = await uploadApi.csv(selectedFile);

        if (!result.products || result.products.length === 0) {
          setError('No valid data rows found in the file.');
          setUploading(false);
          return;
        }

        const verifyData = result.products.map((item, idx) => ({
          id: idx + 1,
          name: item.name || '',
          date: item.date || '',
          quantity: item.quantity || 0,
          price: item.price || 0,
          category: 'medicines',
          confidence: item.confidence || 1.0,
        }));

        navigate('/upload/verify', {
          state: {
            data: verifyData,
            source: 'csv',
            overallConfidence: 1.0,
            fileName: selectedFile.name,
            columnsDetected: result.columns_detected,
          },
        });
      }

    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.message || 'Upload failed. Please check your connection and try again.');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 className="section-title">{t('upload.title')}</h1>
        <p className="section-subtitle">{t('upload.subtitle')}</p>
      </div>

      {/* Error banner */}
      {error && (
        <div
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-4)',
            color: 'var(--color-danger)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <div className="grid-3" style={{ marginBottom: 'var(--space-6)' }}>
        {/* CSV Upload */}
        <div
          className={`upload-card ${activeMethod === 'csv' ? 'active' : ''} ${dragOver ? 'active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => fileRef.current?.click()}
          id="upload-csv"
          style={{ pointerEvents: uploading ? 'none' : 'auto', opacity: uploading ? 0.6 : 1 }}
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
          style={{ pointerEvents: uploading ? 'none' : 'auto', opacity: uploading ? 0.6 : 1 }}
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
          onClick={() => { setActiveMethod('manual'); navigate('/upload/verify', { state: { data: [], source: 'manual' } }); }}
          id="upload-manual"
          style={{ pointerEvents: uploading ? 'none' : 'auto', opacity: uploading ? 0.6 : 1 }}
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
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ fontSize: '1.5rem' }}>{activeMethod === 'csv' ? '📄' : '📷'}</span>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{selectedFile.name}</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                {(selectedFile.size / 1024).toFixed(1)} KB
              </div>
            </div>
          </div>

          {uploading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div className="spinner" style={{ width: 20, height: 20, border: '3px solid var(--color-bg-active)', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)', fontWeight: 500 }}>
                {uploadProgress || 'Processing...'}
              </span>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={handleProceed} id="btn-proceed-upload">
              Process & Verify →
            </button>
          )}
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

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
