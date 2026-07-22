import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { LazyMotion, m, domAnimation } from 'framer-motion';
import { Database, RefreshCcw, HardDrive, Download, FileSpreadsheet, Table, Key as KeyIcon, Hexagon, Search, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';
import * as XLSX from 'xlsx';

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

type Engine = 'postgres' | 'redis' | 'chroma';

export default function DatabaseControl() {
    const { token } = useAuth();
    
    // Explorer State
    const [engine, setEngine] = useState<Engine>('postgres');
    const [items, setItems] = useState<string[]>([]);
    const [selectedItem, setSelectedItem] = useState<string>('');
    const [data, setData] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [loadingItems, setLoadingItems] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState('');

    // Fetch Items list depending on engine
    useEffect(() => {
        if (!token) return;
        const fetchItems = async () => {
            setLoadingItems(true);
            setItems([]);
            setSelectedItem('');
            setData(null);
            setError('');
            try {
                const res = await axios.get(`${API}/admin/db/${engine}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (engine === 'postgres') setItems(res.data.tables || []);
                if (engine === 'redis') setItems(res.data.keys || []);
                if (engine === 'chroma') setItems(res.data.collections || []);
            } catch (err: any) {
                setError(`Failed to fetch ${engine} info: ` + (err.response?.data?.detail || err.message));
            } finally {
                setLoadingItems(false);
            }
        };
        fetchItems();
    }, [engine, token]);

    // Fetch Data for selected item
    useEffect(() => {
        if (!selectedItem || !token) return;
        let isSubscribed = true;

        const fetchData = async () => {
            setLoadingData(true);
            setError('');
            try {
                const encode = encodeURIComponent(selectedItem);
                const res = await axios.get(`${API}/admin/db/${engine}/${encode}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (isSubscribed) setData(res.data);
            } catch (err: any) {
                if (isSubscribed) setError(`Failed to fetch data for ${selectedItem}: ` + (err.response?.data?.detail || err.message));
            } finally {
                if (isSubscribed) setLoadingData(false);
            }
        };

        fetchData();
        const int = setInterval(fetchData, 3000); // Real-time unrestricted polling
        return () => { isSubscribed = false; clearInterval(int); };
    }, [selectedItem, engine, token]);

    // Format export data safely
    const getExportData = () => {
        if (!data) return [];
        let exportData: any[] = [];
        
        if (engine === 'postgres' && data.rows) {
            exportData = data.rows;
        } else if (engine === 'redis') {
            exportData = [{
                Key: data.key,
                Type: data.type,
                TTL: data.ttl,
                Value: typeof data.value === 'object' ? JSON.stringify(data.value) : data.value
            }];
        } else if (engine === 'chroma' && data.ids) {
            exportData = data.ids.map((id: string, i: number) => ({
                id,
                document: data.documents?.[i] || '',
                metadata: JSON.stringify(data.metadatas?.[i] || {}),
                embedding: data.embeddings ? JSON.stringify(data.embeddings[i]) : ''
            }));
        } else {
            // Fallback generic wrap
            exportData = Array.isArray(data) ? data : [data];
        }
        return exportData;
    };

    const handleExportCSV = () => {
        const exportData = getExportData();
        if (exportData.length === 0) return;
        const ws = XLSX.utils.json_to_sheet(exportData);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `${selectedItem}_export.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportExcel = () => {
        const exportData = getExportData();
        if (exportData.length === 0) return;
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, `${selectedItem}_export.xlsx`);
    };

    const filteredItems = items.filter(it => it.toLowerCase().includes(searchQuery.toLowerCase()));

    const renderTableData = () => {
        if (!data) return null;
        if (engine === 'postgres' && data.columns && data.rows) {
            return (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                {data.columns.map((col: string) => <th key={col} className="p-3 font-semibold">{col}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map((row: any, i: number) => (
                                <tr key={i} className="border-b border-border hover:bg-muted/20">
                                    {data.columns.map((col: string) => (
                                        <td key={col} className="p-3 truncate max-w-xs">{String(row[col] ?? '')}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {data.rows.length === 0 && <div className="p-8 text-center text-muted-foreground">Table is empty.</div>}
                </div>
            );
        } else if (engine === 'redis') {
            return (
                <div className="p-4 space-y-4">
                    <div className="flex gap-4 mb-4 border-b border-border pb-4">
                        <div className="admin-card bg-muted/20 p-3"><span className="text-xs text-muted-foreground block">Key</span><span className="font-mono font-bold">{data.key}</span></div>
                        <div className="admin-card bg-muted/20 p-3"><span className="text-xs text-muted-foreground block">Type</span><span className="font-mono font-bold">{data.type}</span></div>
                        <div className="admin-card bg-muted/20 p-3"><span className="text-xs text-muted-foreground block">TTL</span><span className="font-mono font-bold">{data.ttl}s</span></div>
                    </div>
                    <div>
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Value</span>
                        <pre className="p-4 bg-muted/30 border border-border rounded-lg text-xs overflow-auto max-h-[500px]">
                            {typeof data.value === 'object' ? JSON.stringify(data.value, null, 2) : String(data.value)}
                        </pre>
                    </div>
                </div>
            );
        } else if (engine === 'chroma' && data.ids) {
            return (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="p-3 font-semibold">ID</th>
                                <th className="p-3 font-semibold w-1/3">Document</th>
                                <th className="p-3 font-semibold w-1/3">Metadata</th>
                                <th className="p-3 font-semibold">Embedding Size</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.ids.map((id: string, i: number) => (
                                <tr key={id} className="border-b border-border hover:bg-muted/20">
                                    <td className="p-3 font-mono text-xs">{id}</td>
                                    <td className="p-3 truncate max-w-xs">{data.documents?.[i] || 'N/A'}</td>
                                    <td className="p-3 truncate max-w-[200px] font-mono text-[10px]">
                                        {JSON.stringify(data.metadatas?.[i] || {})}
                                    </td>
                                    <td className="p-3">
                                        {data.embeddings?.[i] ? `[${data.embeddings[i].length} dims]` : 'Filtered/None'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {data.ids.length === 0 && <div className="p-8 text-center text-muted-foreground">Collection is empty.</div>}
                </div>
            );
        }
        
        // Fallback dump
        return <pre className="p-4 text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>;
    };

    return (
        <Layout>
            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-[calc(100vh-6rem)] flex flex-col space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
                    <div>
                        <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
                            <Database className="w-7 h-7 text-emerald-500" /> Database Explorer
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Real-time direct access to PostgreSQL, Redis, and ChromaDB.
                        </p>
                    </div>
                    
                    {/* Engine Selector */}
                    <div className="flex items-center p-1 bg-muted/50 border border-border rounded-xl">
                        <button onClick={() => setEngine('postgres')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${engine === 'postgres' ? 'bg-background shadow-sm border border-border text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                            <Table className="w-4 h-4" /> PostgreSQL
                        </button>
                        <button onClick={() => setEngine('redis')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${engine === 'redis' ? 'bg-background shadow-sm border border-border text-red-500' : 'text-muted-foreground hover:text-foreground'}`}>
                            <KeyIcon className="w-4 h-4" /> Redis
                        </button>
                        <button onClick={() => setEngine('chroma')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${engine === 'chroma' ? 'bg-background shadow-sm border border-border text-violet-500' : 'text-muted-foreground hover:text-foreground'}`}>
                            <Hexagon className="w-4 h-4" /> ChromaDB
                        </button>
                    </div>
                </div>

                {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm flex-shrink-0">{error}</div>}

                {/* Main Split Layout */}
                <div className="flex-1 flex gap-4 min-h-0 bg-background/50 border border-border rounded-xl overflow-hidden p-1 shadow-inner">
                    
                    {/* Sidebar / Item List */}
                    <div className="w-64 bg-muted/20 border-r border-border rounded-l-lg flex flex-col">
                        <div className="p-3 border-b border-border flex items-center gap-2">
                            <Search className="w-4 h-4 text-muted-foreground" />
                            <input 
                                type="text"
                                placeholder={`Filter ${engine}...`}
                                className="bg-transparent border-none outline-none text-sm w-full"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {loadingItems ? (
                                <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
                            ) : filteredItems.length > 0 ? (
                                filteredItems.map(item => (
                                    <button 
                                        key={item}
                                        onClick={() => setSelectedItem(item)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors flex items-center justify-between group ${selectedItem === item ? 'bg-primary text-primary-foreground font-bold shadow-md' : 'hover:bg-muted/50 text-foreground'}`}
                                    >
                                        <span className="truncate">{item}</span>
                                        {selectedItem === item && <ArrowRight className="w-4 h-4 opacity-50" />}
                                    </button>
                                ))
                            ) : (
                                <div className="p-4 text-center text-muted-foreground text-xs">No entries found.</div>
                            )}
                        </div>
                    </div>

                    {/* Data View */}
                    <div className="flex-1 bg-background rounded-r-lg flex flex-col relative min-w-0">
                        {selectedItem ? (
                            <>
                                {/* Toolbar */}
                                <div className="h-14 border-b border-border flex items-center justify-between px-4 flex-shrink-0 bg-muted/10">
                                    <div className="flex items-center gap-2 font-mono text-sm font-bold truncate">
                                        <HardDrive className="w-4 h-4 text-muted-foreground" /> {selectedItem}
                                        {loadingData && <RefreshCcw className="w-3 h-3 text-emerald-500 animate-spin ml-2" />}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={handleExportCSV} disabled={!data || loadingData} className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold transition-colors border border-blue-500/20 disabled:opacity-50">
                                            <FileSpreadsheet className="w-4 h-4" /> Export CSV
                                        </button>
                                        <button onClick={handleExportExcel} disabled={!data || loadingData} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold transition-colors border border-emerald-500/20 disabled:opacity-50">
                                            <Download className="w-4 h-4" /> Export Excel
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Table Area */}
                                <div className="flex-1 overflow-auto custom-scrollbar relative">
                                    {loadingData && !data ? (
                                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                                            <div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
                                        </div>
                                    ) : renderTableData()}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                                <Database className="w-16 h-16 opacity-10 mb-4" />
                                <h3 className="text-lg font-bold">No Data Source Selected</h3>
                                <p className="text-sm max-w-sm mt-1">Select a table, key, or collection from the sidebar to view its real-time unrestricted data and export to CSV/Excel.</p>
                            </div>
                        )}
                    </div>

                </div>
            </m.div>
        </Layout>
    );
}
