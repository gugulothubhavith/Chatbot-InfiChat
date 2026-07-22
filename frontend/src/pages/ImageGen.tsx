import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import axios from "axios";
import { Button } from "../components/ui/Button";
import { Sparkle as Sparkles, Spinner as Loader2, DownloadSimple as Download } from "@phosphor-icons/react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
const handleDownload = async (url: string, index: number) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `generated-image-${Date.now()}-${index}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Download failed, opening in new tab:", error);
    window.open(url, '_blank');
  }
};

export default function ImageGen() {
  const { token } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Only animate if images exist
    if (images.length === 0) return;

    const cards = gsap.utils.toArray(".image-card");
    
    cards.forEach((card: any) => {
      gsap.fromTo(card,
        { opacity: 0, y: 50, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: card,
            start: "top 90%", // Start animation when top of card hits 90% of viewport
            toggleActions: "play none none none",
            scroller: "#scroll-wrapper", // Use our Lenis wrapper
          }
        }
      );
    });

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, { dependencies: [images], scope: containerRef });

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);

    try {
      const res = await axios.post(
        "/image/generate",
        { prompt },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setImages((prev) => [res.data.image_url, ...prev]);
    } catch (err: any) {
      alert(`Generation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };


  return (
<LazyMotion features={domAnimation}>
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 glass-heavy sticky top-0 z-10" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-2xl tracking-wide" style={{ color: 'var(--color-text-primary)' }}>Image Generation</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8" style={{ background: 'var(--color-bg-secondary)' }}>
        <div ref={containerRef} className="max-w-6xl mx-auto space-y-8">

          {/* Input Section */}
          <div className="p-6 rounded-3xl glass-light relative overflow-hidden group press-scale" style={{ border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(to right, color-mix(in oklch, var(--color-accent) 5%, transparent), color-mix(in oklch, var(--color-accent) 10%, transparent))' }} />
            <div className="flex gap-4 relative z-10">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                disabled={loading}
                placeholder="Describe the image you want to generate... (e.g., 'A cyberpunk city in rain, neon lights')"
                className="flex-1 w-full h-14 px-4 text-base rounded-xl focus:outline-none transition-shadow font-medium input-ring"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              />
              <Button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="h-14 px-8 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 flex items-center press-scale border-0"
                style={{ background: 'var(--color-accent)', color: '#fff', boxShadow: '0 4px 12px color-mix(in oklch, var(--color-accent) 40%, transparent)' }}
              >
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                Generate
              </Button>
            </div>
          </div>

          {/* Gallery */}
          <m.div 
            className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.1 } }
            }}
          >
            {loading && (
              <m.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="aspect-square rounded-3xl animate-pulse flex items-center justify-center" style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
                <div className="flex flex-col items-center gap-2" style={{ color: 'var(--color-text-tertiary)' }}>
                  <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
                  <span className="text-sm font-medium">Dreaming...</span>
                </div>
              </m.div>
            )}

            <AnimatePresence mode="popLayout">
            {images.map((img, idx) => (
              <m.div 
                key={img} 
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
                className="image-card group flex flex-col rounded-3xl overflow-hidden shadow-lg transition-transform hover:scale-[1.02] glass-light press-scale mb-6 break-inside-avoid"
                style={{ border: '1px solid var(--color-border)', opacity: 0 }}
              >
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={img}
                    alt={`Generated ${idx}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                  {/* Subtle hover gradient for aesthetic depth */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>

                <div className="p-4" style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-11 rounded-xl shadow-sm transition-transform active:scale-[0.98] font-semibold input-ring border-0 press-scale hover-glow"
                    style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text-primary)' }}
                    onClick={() => handleDownload(img, idx)}
                  >
                    <Download className="h-4 w-4 mr-2" style={{ color: 'var(--color-text-primary)' }} />
                    Download Image
                  </Button>
                </div>
              </m.div>
            ))}
            </AnimatePresence>

            {!loading && images.length === 0 && (
              <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-24 flex flex-col items-center justify-center border-2 border-dashed rounded-3xl" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}>
                <Sparkles className="h-10 w-10 mb-4 opacity-40" />
                <p className="font-medium text-sm">Your generated images will appear here</p>
              </m.div>
            )}
          </m.div>
        </div>
      </div>
    </div>
  </LazyMotion>
);
}
