import React, { useState, useEffect } from 'react';
import { File, Upload, Loader2 } from 'lucide-react';
import * as api from '../../services/api';
import Alert from '../Common/Alert';

const DocumentPanel = ({ agentId }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadDocuments();
  }, [agentId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.getDocuments(agentId);
      setDocuments(response.data);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    setError(null);
    setSuccess(null);

    for (const file of files) {
      try {
        await api.uploadDocument(agentId, file);
        setSuccess(`${file.name} uploaded!`);
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError(err.response?.data?.detail || `Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    await loadDocuments();
    e.target.value = '';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Documents</h3>

        {/* Upload Button */}
        <label
          className={`btn btn-secondary w-full flex items-center justify-center space-x-2 ${
            uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <input
            type="file"
            multiple
            accept=".pdf,.txt,.md,.docx"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </>
          )}
        </label>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-3">
          <Alert type="error" message={error} onClose={() => setError(null)} />
        </div>
      )}
      {success && (
        <div className="mb-3">
          <Alert type="success" message={success} onClose={() => setSuccess(null)} />
        </div>
      )}

      {/* Documents List */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            No documents uploaded yet
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-start space-x-2">
                <File className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {doc.filename}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatFileSize(doc.file_size)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {doc.chunk_count} chunks
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DocumentPanel;
