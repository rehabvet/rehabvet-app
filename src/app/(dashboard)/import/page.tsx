'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, XCircle, RefreshCw, User, PawPrint } from 'lucide-react';

interface ImportResult {
  success: boolean;
  patientName: string;
  ownerName: string;
  ownerPhone: string;
  clientFound: boolean;
  patientFound: boolean;
  totalVisits: number;
  imported: number;
  skipped: number;
  warnings: string[];
  error?: string;
}

interface FileStatus {
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  result?: ImportResult;
}

export default function ImportPage() {
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (newFiles: FileList | File[]) => {
    const pdfs = Array.from(newFiles).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    setFiles(prev => [
      ...prev,
      ...pdfs.map(f => ({ file: f, status: 'pending' as const })),
    ]);
  };

  const uploadFile = async (idx: number) => {
    const entry = files[idx];
    if (!entry || entry.status === 'uploading') return;

    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, status: 'uploading' } : f));

    const fd = new FormData();
    fd.append('file', entry.file);

    try {
      const res = await fetch('/api/import/pdf', { method: 'POST', body: fd });
      const data = await res.json();
      setFiles(prev => prev.map((f, i) => i === idx
        ? { ...f, status: data.success ? 'done' : 'error', result: data }
        : f
      ));
    } catch (e) {
      setFiles(prev => prev.map((f, i) => i === idx
        ? { ...f, status: 'error', result: { success: false, error: String(e) } as ImportResult }
        : f
      ));
    }
  };

  const uploadAll = async () => {
    const pending = files.map((f, i) => ({ ...f, idx: i })).filter(f => f.status === 'pending');
    for (const { idx } of pending) await uploadFile(idx);
  };

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const pendingCount = files.filter(f => f.status === 'pending').length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import Clinical Records</h1>
        <p className="text-sm text-gray-500 mt-1">Upload PDF exports from the old PMS to import visit records, invoices and billing history.</p>
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer mb-6 ${
          dragging ? 'border-[#EC6496] bg-pink-50' : 'border-gray-300 hover:border-[#EC6496] hover:bg-pink-50/30'
        }`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
        <p className="text-base font-medium text-gray-700">Drop PDF files here or click to browse</p>
        <p className="text-sm text-gray-400 mt-1">One PDF per patient — exports from old PMS</p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={e => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">{files.length} file{files.length !== 1 ? 's' : ''} queued</h2>
            {pendingCount > 0 && (
              <button
                onClick={uploadAll}
                className="flex items-center gap-2 px-4 py-2 bg-[#EC6496] text-white text-sm font-medium rounded-lg hover:bg-[#d4547f] transition-colors"
              >
                <Upload className="w-4 h-4" />
                Import All ({pendingCount})
              </button>
            )}
          </div>

          {files.map((entry, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              {/* File header */}
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{entry.file.name}</p>
                  <p className="text-xs text-gray-400">{(entry.file.size / 1024).toFixed(1)} KB</p>
                </div>
                <div className="flex items-center gap-2">
                  {entry.status === 'pending' && (
                    <>
                      <button
                        onClick={() => uploadFile(idx)}
                        className="text-xs px-3 py-1.5 bg-[#EC6496] text-white rounded-lg hover:bg-[#d4547f]"
                      >
                        Import
                      </button>
                      <button onClick={() => removeFile(idx)} className="text-gray-400 hover:text-gray-600">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {entry.status === 'uploading' && (
                    <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                  )}
                  {entry.status === 'done' && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {entry.status === 'error' && (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>

              {/* Result */}
              {entry.result && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {entry.result.error ? (
                    <p className="text-sm text-red-600 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> {entry.result.error}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {/* Match info */}
                      <div className="flex flex-wrap gap-3 text-xs">
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-full font-medium ${entry.result.clientFound ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          <User className="w-3 h-3" />
                          {entry.result.clientFound ? entry.result.ownerName : `Client not found (${entry.result.ownerPhone})`}
                        </span>
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-full font-medium ${entry.result.patientFound ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          <PawPrint className="w-3 h-3" />
                          {entry.result.patientFound ? entry.result.patientName : `Patient not found: ${entry.result.patientName}`}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="flex gap-4 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                          <strong>{entry.result.imported}</strong> imported
                        </span>
                        {entry.result.skipped > 0 && (
                          <span className="flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                            <strong>{entry.result.skipped}</strong> skipped (already exist)
                          </span>
                        )}
                        <span className="text-gray-400">{entry.result.totalVisits} total visits in file</span>
                      </div>

                      {/* Warnings */}
                      {entry.result.warnings.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 space-y-0.5">
                          {entry.result.warnings.map((w, wi) => (
                            <p key={wi} className="text-xs text-amber-700 flex items-start gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {w}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">How it works</h3>
        <ul className="text-sm text-gray-600 space-y-1.5 list-disc list-inside">
          <li>Each PDF should be a full patient history export from the old PMS</li>
          <li>Client is matched by mobile number — with or without +65 prefix</li>
          <li>Visit records, invoices and billing line items are all imported</li>
          <li>Already-imported bills (by Bill#) are automatically skipped</li>
          <li>Multiple PDFs can be uploaded and imported in one go</li>
        </ul>
      </div>
    </div>
  );
}
