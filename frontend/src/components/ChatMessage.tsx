import React, { useState } from "react";
import { LazyMotion, m, domAnimation } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Robot, User, Copy, Check, ThumbsUp, ThumbsDown, ShareNetwork, ArrowsClockwise,
  SpeakerHigh, Stop, Spinner, DownloadSimple, FileText, PencilSimple,
} from "@phosphor-icons/react";
import { cn } from "../lib/utils";
import { TypingIndicator } from "./ui/TypingIndicator";
import { DeepResearchProgress } from "./DeepResearchProgress";
import { DeepThinkingProgress } from "./DeepThinkingProgress";

interface Message {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  timestamp: Date;
  image?: string;
  file_name?: string;
  file_type?: string;
}

interface ChatMessageProps {
  message: Message;
  index: number;
  isLast: boolean;
  loading: boolean;
  user?: { picture?: string };
  imgError: boolean;
  onCopy: (text: string, idx: number) => void;
  onEdit: (text: string) => void;
  onRegenerate: (text: string) => void;
  onShare: (text: string) => void;
  onPlayTts: (text: string) => void;
  onStopTts: () => void;
  onLike: (idx: number | null) => void;
  onDislike: (idx: number | null) => void;
  copiedMsgIdx: number | null;
  likedMsgIdx: number | null;
  dislikedMsgIdx: number | null;
  isTtsPlaying: boolean;
  isTtsLoading: boolean;
  researchProgress: any;
  thinkingProgress: any;
  setImgError: (err: boolean) => void;
}

function DocumentCard({ name, type, isUser }: { name: string; type: string; isUser: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-[18px] border max-w-[300px] transition-all",
      isUser
        ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-sm"
        : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
    )}>
      <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
        <FileText className="h-5 w-5 text-red-500" weight="fill" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">{name}</p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium uppercase">{type.split("/")[1]?.toUpperCase() || "FILE"}</p>
      </div>
    </div>
  );
}

export function ChatMessage({
  message: msg, index, isLast, loading, user, imgError,
  onCopy, onEdit, onRegenerate, onShare, onPlayTts, onStopTts,
  onLike, onDislike, copiedMsgIdx, likedMsgIdx, dislikedMsgIdx,
  isTtsPlaying, isTtsLoading, researchProgress, thinkingProgress, setImgError,
}: ChatMessageProps) {
  if (msg.role === "system") return null;

  return (
<LazyMotion features={domAnimation}>
    <m.div
      layout="position"
      initial={{ opacity: 0, y: 20, scale: 0.98, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ 
        type: "spring", 
        damping: 25, 
        stiffness: 250, 
        mass: 0.8,
        delay: Math.min(index * 0.04, 0.3) 
      }}
      className={cn("flex gap-3.5 w-full max-w-5xl mx-auto group", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
    >
      {/* Avatar */}
      <div
        className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1 overflow-hidden ring-1"
        style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-xs)" }}
      >
        {msg.role === "user" ? (
          user?.picture && !imgError ? (
            <img src={user.picture} alt="User" className="h-full w-full object-cover"
              referrerPolicy="no-referrer" onError={() => setImgError(true)} />
          ) : <User className="h-3.5 w-3.5" style={{ color: "var(--color-text-secondary)" }} weight="bold" />
        ) : (
          <Robot className="h-3.5 w-3.5" style={{ color: "var(--color-accent)" }} weight="fill" />
        )}
      </div>

      <div className={cn("flex flex-col min-w-0", msg.role === "user" ? "items-end max-w-[85%] md:max-w-[75%]" : "items-start w-full")}>
        <div className={cn("px-4 py-2.5 rounded-2xl text-sm leading-relaxed relative", msg.role === "user" ? "rounded-br-md" : "prose-chat")}
          style={{ background: msg.role === "user" ? "var(--color-user-bubble)" : "var(--color-assistant-bubble)", color: "var(--color-text-primary)" }}
        >
          {/* Deep Thinking Progress */}
          {msg.model === "deep-thinking" && thinkingProgress && !msg.content && <DeepThinkingProgress progress={thinkingProgress} />}
          {/* Deep Research Progress */}
          {msg.model === "deep-research" && researchProgress && !msg.content && <DeepResearchProgress progress={researchProgress} />}

          {/* Image */}
          {msg.image && (
            <div className="mb-4 -mx-1 p-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative group w-fit">
              <img src={msg.image} alt="Generated content" className="rounded-lg max-h-[320px] w-auto" />
              {msg.role === "assistant" && (
                <a href={msg.image} download={`generation-${Date.now()}.png`}
                  className="absolute top-4 right-4 bg-black/60 hover:bg-black/90 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-xl backdrop-blur-sm"
                  title="Download"><DownloadSimple className="h-4 w-4" weight="bold" /></a>
              )}
            </div>
          )}

          {/* File */}
          {msg.file_name && <div className="mb-4"><DocumentCard name={msg.file_name} type={msg.file_type || "file"} isUser={msg.role === "user"} /></div>}

          {/* Content */}
          {msg.content ? (
            <ReactMarkdown
              components={{
                code(props) {
                  const { children, className } = props;
                  const match = /language-(\w+)/.exec(className || "");
                  return match ? (
                    <div className="rounded-xl overflow-hidden my-3" style={{ background: "var(--color-code-bg)", border: "1px solid var(--color-border)" }}>
                      <div className="px-4 py-2 text-xs font-medium flex justify-between items-center"
                        style={{ background: "var(--color-code-header)", borderBottom: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                        <span className="font-mono">{match[1]}</span>
                        <button onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ""))}
                          className="text-xs px-2 py-0.5 rounded-md press-scale" style={{ color: "var(--color-text-tertiary)" }}>Copy</button>
                      </div>
                      <SyntaxHighlighter style={atomDark} language={match[1]} PreTag="div"
                        customStyle={{ margin: 0, padding: "1rem", background: "transparent", fontSize: "var(--text-sm)", fontFamily: "var(--font-mono)" }}>
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    </div>
                  ) : <code className="px-1.5 py-0.5 rounded-md text-xs" style={{ background: "var(--color-accent-subtle)", color: "var(--color-accent)", fontFamily: "var(--font-mono)" }} {...props}>{children}</code>;
                },
              }}
            >{msg.content}</ReactMarkdown>
          ) : !thinkingProgress && !researchProgress && <TypingIndicator />}
        </div>

        {/* User action buttons */}
        {msg.role === "user" && msg.content && (
          <div className="flex justify-end w-full mt-1 mr-1 gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
            <button onClick={() => onCopy(msg.content, index)} className="p-1 rounded-lg press-scale" style={{ color: "var(--color-text-tertiary)" }} title="Copy">
              {copiedMsgIdx === index ? <Check className="w-3.5 h-3.5" style={{ color: "var(--color-success)" }} weight="bold" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => onEdit(msg.content)} className="p-1 rounded-lg press-scale" style={{ color: "var(--color-text-tertiary)" }} title="Edit">
              <PencilSimple className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Assistant action buttons */}
        {msg.role === "assistant" && msg.content && isLast && !loading && (
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start w-full mt-1 ml-1 gap-0.5">
            <button onClick={() => onCopy(msg.content, index)} className="p-1.5 rounded-lg press-scale" style={{ color: "var(--color-text-tertiary)" }} title="Copy">
              {copiedMsgIdx === index ? <Check className="w-3.5 h-3.5" style={{ color: "var(--color-success)" }} weight="bold" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => onLike(likedMsgIdx === index ? null : index)}
              className={cn("p-1.5 rounded-lg press-scale", likedMsgIdx === index ? "text-green-500 bg-green-500/10" : "")} title="Good">
              <ThumbsUp className="w-3.5 h-3.5" weight={likedMsgIdx === index ? "fill" : "regular"} />
            </button>
            <button onClick={() => onDislike(dislikedMsgIdx === index ? null : index)}
              className={cn("p-1.5 rounded-lg press-scale", dislikedMsgIdx === index ? "text-red-500 bg-red-500/10" : "")} title="Bad">
              <ThumbsDown className="w-3.5 h-3.5" weight={dislikedMsgIdx === index ? "fill" : "regular"} />
            </button>
            <button onClick={() => onShare(msg.content)} className="p-1.5 rounded-lg press-scale" style={{ color: "var(--color-text-tertiary)" }} title="Share">
              <ShareNetwork className="w-3.5 h-3.5" />
            </button>
            {isLast && !loading && (
              <button onClick={() => onRegenerate(msg.content)} className="p-1.5 rounded-lg press-scale" style={{ color: "var(--color-text-tertiary)" }} title="Regenerate">
                <ArrowsClockwise className="w-3.5 h-3.5" />
              </button>
            )}
            {isLast && !loading && (
              <button onClick={() => isTtsLoading || isTtsPlaying ? onStopTts() : onPlayTts(msg.content)}
                className="p-1.5 rounded-lg press-scale" style={{ color: "var(--color-text-tertiary)" }} title={isTtsLoading ? "Cancel" : isTtsPlaying ? "Stop" : "Read aloud"}>
                {isTtsLoading ? <Spinner className="w-3.5 h-3.5 animate-spin" /> : isTtsPlaying ? <Stop className="w-3.5 h-3.5" weight="fill" /> : <SpeakerHigh className="w-3.5 h-3.5" />}
              </button>
            )}
          </m.div>
        )}
      </div>
    </m.div>
  </LazyMotion>
);
}
