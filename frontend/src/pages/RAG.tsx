import React, { useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
import { useAuth } from "../hooks/useAuth";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { UploadSimple as Upload, MagnifyingGlass as Search, FileText, Spinner as Loader2, Database } from "@phosphor-icons/react";

export default function RAG() {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const cards = gsap.utils.toArray(".rag-card");
    gsap.fromTo(cards,
      { opacity: 0, y: 30, scale: 0.98 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 90%",
          toggleActions: "play none none none",
          scroller: "#scroll-wrapper",
        }
      }
    );
    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, { scope: containerRef });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post("/rag/upload", formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      alert("Document uploaded successfully!");
      setFile(null);
    } catch (err: any) {
      alert(`Upload failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);

    try {
      const res = await axios.post(
        "/rag/query",
        { query },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResults(res.data.results);
    } catch (err: any) {
      alert(`Query failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 glass-heavy sticky top-0 z-10" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-accent)', color: '#fff' }}>
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-2xl tracking-wide" style={{ color: 'var(--color-text-primary)' }}>Knowledge Base</h1>
            <p className="text-xs font-medium opacity-70" style={{ color: 'var(--color-text-secondary)' }}>Upload documents and ask questions using RAG technology</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8" style={{ background: 'var(--color-bg-secondary)' }}>
        <div ref={containerRef} className="max-w-5xl mx-auto space-y-8">

        <div className="grid md:grid-cols-2 gap-6">
          {/* Upload Section */}
          <Card className="rag-card h-full glass-light border-0 shadow-none opacity-0" style={{ background: 'var(--color-surface)' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <Upload className="h-5 w-5 opacity-70" />
                Upload Knowledge
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-xl p-8 transition-colors flex flex-col items-center justify-center text-center group cursor-pointer press-scale" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-hover)' }}>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <label htmlFor="file-upload" className="w-full h-full flex flex-col items-center cursor-pointer">
                  <div className="h-12 w-12 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ background: 'var(--color-bg-secondary)' }}>
                    {file ? <FileText className="h-6 w-6" style={{ color: 'var(--color-accent)' }} /> : <Upload className="h-6 w-6" style={{ color: 'var(--color-text-tertiary)' }} />}
                  </div>
                  <h3 className="text-base font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                    {file ? file.name : "Click to upload a document"}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "PDF, TXT, or MD files up to 10MB"}
                  </p>
                </label>
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="w-full h-12 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 flex items-center justify-center press-scale border-0"
                  style={{ background: 'var(--color-accent)', color: '#fff', boxShadow: '0 4px 12px color-mix(in oklch, var(--color-accent) 40%, transparent)' }}
                >
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {uploading ? "Uploading..." : "Add to Knowledge Base"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Query Section */}
          <Card className="rag-card h-full glass-light border-0 shadow-none opacity-0" style={{ background: 'var(--color-surface)' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <Search className="h-5 w-5 opacity-70" />
                Ask Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What is discussed in the document?"
                  className="flex-1 w-full h-12 px-4 text-sm rounded-xl focus:outline-none transition-shadow font-medium input-ring"
                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  onKeyDown={(e) => e.key === "Enter" && handleQuery()}
                />
                <Button 
                  onClick={handleQuery} 
                  disabled={!query.trim() || loading} 
                  className="h-12 w-12 rounded-xl flex items-center justify-center transition-all border-0 press-scale"
                  style={{ background: 'var(--color-text-primary)', color: 'var(--color-bg)' }}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              <div className="space-y-3 mt-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {results.length > 0 ? (
                  results.map((result, idx) => (
                    <div key={idx + "-" + result.substring(0, 10)} className="p-4 rounded-xl text-sm leading-relaxed animate-in fade-in slide-in-from-bottom-2" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
                      {result}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10" style={{ color: 'var(--color-text-tertiary)' }}>
                    <Database className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium text-sm">No results yet. Ask a question to get started.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </div>
  );
}