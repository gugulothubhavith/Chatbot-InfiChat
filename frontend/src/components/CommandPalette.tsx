import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlass, PencilSimple, Gear, Image as ImageIcon, Database, Monitor, Code, ChatTeardropText } from "@phosphor-icons/react";
import { m, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { token } = useAuth();
  const [sessions, setSessions] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (open && token) {
      axios.get("/chat/sessions", { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setSessions(res.data))
        .catch(console.error);
    }
  }, [open, token]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          {/* Overlay */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <m.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-2xl rounded-2xl overflow-hidden glass-heavy shadow-2xl"
            style={{ border: "1px solid var(--color-border)" }}
          >
            <Command
              className="w-full flex flex-col"
              style={{ color: "var(--color-text-primary)" }}
              shouldFilter={true}
            >
              <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
                <MagnifyingGlass className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                <Command.Input
                  autoFocus
                  placeholder="What do you need?"
                  value={search}
                  onValueChange={setSearch}
                  className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-lg placeholder:opacity-40"
                  style={{ color: "var(--color-text-primary)" }}
                />
              </div>

              <Command.List className="max-h-[50vh] overflow-y-auto p-2 custom-scrollbar">
                <Command.Empty className="py-12 text-center text-sm opacity-50">No results found.</Command.Empty>

                <Command.Group heading="Suggestions" className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-2">
                  <Command.Item
                    onSelect={() => runCommand(() => { window.dispatchEvent(new Event('reset-chat')); navigate('/'); })}
                    className="flex items-center gap-3 px-3 py-3 mt-1 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <PencilSimple className="h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                    <span className="font-medium text-sm">New Chat</span>
                  </Command.Item>
                  <Command.Item
                    onSelect={() => runCommand(() => navigate('/code'))}
                    className="flex items-center gap-3 px-3 py-3 mt-1 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Code className="w-4 h-4 opacity-70" />
                    <span className="font-medium text-sm">InfiBuild Studio</span>
                  </Command.Item>
                </Command.Group>

                <Command.Group heading="Secondary Pages" className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-4">
                  <Command.Item
                    onSelect={() => runCommand(() => navigate('/image'))}
                    className="flex items-center gap-3 px-3 py-3 mt-1 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <ImageIcon className="w-4 h-4 opacity-70" />
                    <span className="font-medium text-sm">Image Generation</span>
                  </Command.Item>
                  <Command.Item
                    onSelect={() => runCommand(() => navigate('/rag'))}
                    className="flex items-center gap-3 px-3 py-3 mt-1 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Database className="w-4 h-4 opacity-70" />
                    <span className="font-medium text-sm">Knowledge Base (RAG)</span>
                  </Command.Item>
                </Command.Group>

                <Command.Group heading="Recent Chats" className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-4">
                  {sessions.slice(0, 10).map(session => (
                    <Command.Item
                      key={session.id}
                      onSelect={() => runCommand(() => navigate(`/${session.id}`))}
                      value={session.title}
                      className="flex items-center gap-3 px-3 py-3 mt-1 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <ChatTeardropText className="h-4 w-4 opacity-50" weight="fill" />
                      <span className="font-medium text-sm truncate">{session.title}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
