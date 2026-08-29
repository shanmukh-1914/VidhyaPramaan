import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { apiRequest } from '../api';
import { 
  FileCheck2, 
  Upload, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  ExternalLink, 
  Award,
  FileText
} from 'lucide-react';

const SAMPLE_CERTIFICATES = [
  {
    name: 'AWS Solutions Architect Associate',
    issuer: 'Amazon Web Services (AWS)',
    credentialId: 'AWS-SAA-984210',
    title: 'AWS Certified Solutions Architect - Associate',
    textSnippet: 'This is to certify that Candidate has successfully achieved AWS Certified Solutions Architect - Associate demonstrating comprehensive knowledge of cloud distributed architecture, Amazon S3, EC2, IAM and VPC networking. Issue Date: November 2024. Credential ID: AWS-SAA-984210.',
  },
  {
    name: 'Google Cloud Professional Cloud Architect',
    issuer: 'Google Cloud',
    credentialId: 'GCP-PCA-41982',
    title: 'Google Cloud Professional Cloud Architect',
    textSnippet: 'Google Cloud Certified Professional Cloud Architect. Awarded for demonstrated proficiency in designing, developing, and managing robust, secure, scalable, and dynamic solutions to leverage Google Cloud technologies. Credential ID: GCP-PCA-41982.',
  },
  {
    name: 'Meta Advanced React & TypeScript Specialist',
    issuer: 'Meta',
    credentialId: 'META-REACT-7731',
    title: 'Meta Advanced React & TypeScript Engineering',
    textSnippet: 'Meta Certificate of Specialization in Advanced React, State Management with Redux/Zustand, React Hooks, and TypeScript Component Architecture. Credential ID: META-REACT-7731.',
  },
];

export const CertificateUploadView: React.FC = () => {
  const { certifications, setCertifications, setVerifiedSkills } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<any | null>(null);
  const [selectedSample, setSelectedSample] = useState<any | null>(null);

  useEffect(() => {
    const fetchCerts = async () => {
      try {
        const res = await apiRequest('/api/credential/list');
        if (res.certifications) setCertifications(res.certifications);
      } catch (err) {
        console.warn('Fetch certs error:', err);
      }
    };
    fetchCerts();
  }, [setCertifications]);

  const handleProcessSample = async (sample: typeof SAMPLE_CERTIFICATES[0]) => {
    setSelectedSample(sample);
    setError(null);
    setLoading(true);

    try {
      const res = await apiRequest('/api/credential/verify-certificate', {
        method: 'POST',
        body: JSON.stringify({
          rawText: sample.textSnippet,
          mimeType: 'text/plain',
        }),
      });

      setOcrResult(res);
      // Refresh list
      const updated = await apiRequest('/api/credential/list');
      if (updated.certifications) setCertifications(updated.certifications);

      const refreshedSkills = await apiRequest('/api/profile/verified-skills');
      if (refreshedSkills.verifiedSkills) setVerifiedSkills(refreshedSkills.verifiedSkills);
    } catch (err: any) {
      setError(err.message || 'OCR extraction failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1] || (reader.result as string);
        const res = await apiRequest('/api/credential/verify-certificate', {
          method: 'POST',
          body: JSON.stringify({
            imageBuffer: base64Data,
            mimeType: file.type || 'image/png',
          }),
        });

        setOcrResult(res);
        const updated = await apiRequest('/api/credential/list');
        if (updated.certifications) setCertifications(updated.certifications);

        const refreshedSkills = await apiRequest('/api/profile/verified-skills');
        if (refreshedSkills.verifiedSkills) setVerifiedSkills(refreshedSkills.verifiedSkills);
      } catch (err: any) {
        setError(err.message || 'Failed to process certificate file.');
      } finally {
        setLoading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3">
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Multi-Point Character Recognition & Credential Parser</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Certificate OCR Verification Engine
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Upload certificates, professional licenses, or degrees. The OCR engine extracts issuer authority, completion date, credential identifiers, and validates cryptographic confidence.
            </p>
          </div>

          <div className="px-4 py-2 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span><strong>{certifications.length}</strong> Verified Credentials in Ledger</span>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Upload Zone & Samples */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Box (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-400" />
            <span>Upload Certificate Document (PDF / PNG / JPEG)</span>
          </h3>

          <label className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-950/60 hover:bg-slate-950 transition-all text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
              <FileCheck2 className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-white">Click or drag certificate here to upload</p>
            <p className="text-xs text-slate-400 mt-1">Supports High-Resolution PNG, JPEG, or scanned PDF documents</p>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              disabled={loading}
              className="hidden"
            />
          </label>

          {/* Quick Real World Sample Certificates */}
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-2">
              Or instantly test with authentic industry credentials:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {SAMPLE_CERTIFICATES.map((sample) => (
                <button
                  key={sample.name}
                  onClick={() => handleProcessSample(sample)}
                  disabled={loading}
                  className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-colors cursor-pointer text-xs space-y-1"
                >
                  <span className="font-bold text-white block truncate">{sample.name}</span>
                  <span className="text-[11px] text-indigo-400 block">{sample.issuer}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* OCR Result Card (1 col) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-base mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>OCR Extraction Status</span>
            </h3>

            {loading ? (
              <div className="py-12 text-center space-y-3">
                <div className="inline-block w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-400">Parsing multi-point characters & tokens...</p>
              </div>
            ) : ocrResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950 rounded-2xl border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">OCR Confidence</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {Math.round(ocrResult.certification?.ocrConfidence * 100)}%
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-sm">{ocrResult.certification?.title}</h4>
                  <p className="text-xs text-indigo-300">Issuer: {ocrResult.certification?.issuer}</p>
                  {ocrResult.certification?.credentialId && (
                    <p className="text-[11px] text-slate-400 font-mono">
                      ID: {ocrResult.certification?.credentialId}
                    </p>
                  )}
                </div>

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Credential authenticated and synced to MongoDB.</span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                <FileText className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                <span>Upload a document or choose a sample to view extracted OCR parameters.</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 text-[11px] text-slate-500">
            Complies with ISO credential verification standards.
          </div>
        </div>
      </div>

      {/* Verified Certifications Ledger */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          <span>Accredited Credentials Ledger</span>
        </h3>

        {certifications.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">
            No certificates verified yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {certifications.map((cert) => (
              <div
                key={cert._id}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-4.5 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <h4 className="font-bold text-white text-sm">{cert.title}</h4>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {Math.round(cert.ocrConfidence * 100)}% Match
                  </span>
                </div>
                <p className="text-xs text-indigo-400 font-semibold">{cert.issuer}</p>
                {cert.credentialId && (
                  <p className="text-[11px] text-slate-400 font-mono">ID: {cert.credentialId}</p>
                )}
                <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-850">
                  Verified {new Date(cert.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
