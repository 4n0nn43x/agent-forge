import React, { useState, useEffect } from 'react';
import { Upload, File, CheckCircle, X, Loader2 } from 'lucide-react';
import * as api from '../../services/api';
import Alert from '../Common/Alert';

const DocumentUpload = ({ agentId, onSkip }) => {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (agentId) {
      loadDocuments();
    }
  }, [agentId]);

  const loadDocuments = async () => {
    try {
      const response = await api.getDocuments(agentId);
      setDocuments(response.data);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);

    if (!agentId) {
      setError('Please create the agent first before uploading documents');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    for (const file of files) {
      try {
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

        await api.uploadDocument(agentId, file, (progress) => {
          setUploadProgress((prev) => ({ ...prev, [file.name]: progress }));
        });

        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });

        setSuccess(`${file.name} uploaded successfully!`);
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError(
          err.response?.data?.detail || `Failed to upload ${file.name}`
        );
      }
    }

    setUploading(false);
    await loadDocuments();
    e.target.value = ''; // Reset input
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Upload Documents
        </h2>
        <p className="text-gray-600">
          Add documents to your agent's knowledge base (optional)
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} />
      )}
      {success && (
        <Alert type="success" message={success} onClose={() => setSuccess(null)} />
      )}

      {!agentId && (
        <Alert
          type="warning"
          message="Create the agent first to upload documents"
        />
      )}

      {/* Upload Area */}
      {agentId && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors">
          <input
            type="file"
            id="file-upload"
            multiple
            accept=".pdf,.txt,.md,.docx"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center"
          >
            <Upload className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-sm font-medium text-gray-900 mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              PDF, TXT, MD, or DOCX (max 10MB per file)
            </p>
          </label>
        </div>
      )}

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([filename, progress]) => (
            <div key={filename} className="flex items-center space-x-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700">{filename}</span>
                  <span className="text-gray-500">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-primary-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Documents */}
      {documents.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Uploaded Documents ({documents.length})
          </h3>
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <File className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {doc.filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(doc.file_size)} • {doc.chunk_count} chunks
                    </p>
                  </div>
                </div>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          How does this work?
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Documents are processed and split into chunks</li>
          <li>• Each chunk is stored in a vector database</li>
          <li>• When users ask questions, relevant chunks are retrieved</li>
          <li>• The agent uses these chunks to provide accurate answers</li>
        </ul>
      </div>
    </div>
  );
};

export default DocumentUpload;
