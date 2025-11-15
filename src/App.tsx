import { useState, useEffect } from 'react';
import { useTreeStore } from '@/stores/treeStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { ReadView } from '@/components/ReadView';
import { TreeView } from '@/components/TreeView';
import { GenerateDialog } from '@/components/GenerateDialog';
import { SettingsDialog } from '@/components/SettingsDialog';
import {
  FileText,
  GitBranch,
  Settings,
  Plus,
  Save,
  FolderOpen,
  Moon,
  Sun,
  Zap,
  X,
  Github,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import clsx from 'clsx';

type ViewMode = 'read' | 'tree';

interface Tab {
  id: string;
  treeId: string;
  name: string;
  viewMode: ViewMode;
}

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState('');

  const { trees, createTree, exportTree, importTree, updateTreeName } = useTreeStore();
  const { preferences, toggleDarkMode } = useSettingsStore();

  // Initialize with a default tree if none exists
  useEffect(() => {
    if (tabs.length === 0) {
      const treeId = createTree('Untitled');
      const tab: Tab = {
        id: `tab-${Date.now()}`,
        treeId,
        name: 'Untitled',
        viewMode: 'tree',
      };
      setTabs([tab]);
      setActiveTabId(tab.id);
    }
  }, []);

  // Apply dark mode
  useEffect(() => {
    if (preferences.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [preferences.darkMode]);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const createNewTab = () => {
    const treeId = createTree('Untitled');
    const tab: Tab = {
      id: `tab-${Date.now()}`,
      treeId,
      name: 'Untitled',
      viewMode: 'tree',
    };
    setTabs([...tabs, tab]);
    setActiveTabId(tab.id);
  };

  const closeTab = (tabId: string) => {
    const newTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(newTabs);

    if (activeTabId === tabId) {
      setActiveTabId(newTabs.length > 0 ? newTabs[0].id : null);
    }

    if (newTabs.length === 0) {
      createNewTab();
    }
  };

  const handleSaveTree = () => {
    if (!activeTab) return;

    try {
      const json = exportTree(activeTab.treeId);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTab.name}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Tree saved successfully');
    } catch (error) {
      toast.error('Failed to save tree');
    }
  };

  const handleOpenTree = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const treeId = importTree(text);
        const tree = trees[treeId];

        const tab: Tab = {
          id: `tab-${Date.now()}`,
          treeId,
          name: tree.name,
          viewMode: 'tree',
        };
        setTabs([...tabs, tab]);
        setActiveTabId(tab.id);
        toast.success('Tree loaded successfully');
      } catch (error) {
        toast.error('Failed to load tree');
      }
    };
    input.click();
  };

  const toggleViewMode = () => {
    if (!activeTab) return;

    setTabs(
      tabs.map((tab) =>
        tab.id === activeTabId
          ? { ...tab, viewMode: tab.viewMode === 'read' ? 'tree' : 'read' }
          : tab
      )
    );
  };

  const handleTabNameEdit = (tabId: string, currentName: string) => {
    setEditingTabId(tabId);
    setEditingTabName(currentName);
  };

  const handleTabNameSave = (tabId: string, treeId: string) => {
    if (editingTabName.trim()) {
      // Update both the tab name and the tree name
      setTabs(tabs.map(t => t.id === tabId ? { ...t, name: editingTabName } : t));
      updateTreeName(treeId, editingTabName);
      toast.success('Name updated');
    }
    setEditingTabId(null);
    setEditingTabName('');
  };

  const handleTabNameCancel = () => {
    setEditingTabId(null);
    setEditingTabName('');
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Loom</h1>

          <div className="flex items-center gap-2">
            <button
              onClick={createNewTab}
              className="p-2 rounded hover:bg-accent"
              title="New Tree"
            >
              <Plus size={20} />
            </button>
            <button
              onClick={handleOpenTree}
              className="p-2 rounded hover:bg-accent"
              title="Open Tree"
            >
              <FolderOpen size={20} />
            </button>
            <button
              onClick={handleSaveTree}
              className="p-2 rounded hover:bg-accent"
              title="Save Tree"
            >
              <Save size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleViewMode}
            className="p-2 rounded hover:bg-accent"
            title={activeTab?.viewMode === 'read' ? 'Tree View' : 'Read View'}
          >
            {activeTab?.viewMode === 'read' ? <GitBranch size={20} /> : <FileText size={20} />}
          </button>

          {activeTab && (
            <button
              onClick={() => setShowGenerateDialog(true)}
              className="p-2 rounded hover:bg-accent bg-primary/10 text-primary"
              title="Generate"
            >
              <Zap size={20} />
            </button>
          )}

          <button onClick={toggleDarkMode} className="p-2 rounded hover:bg-accent" title="Theme">
            {preferences.darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button
            onClick={() => setShowSettingsDialog(true)}
            className="p-2 rounded hover:bg-accent"
            title="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/50">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-t cursor-pointer group',
              activeTabId === tab.id
                ? 'bg-background border-t border-l border-r border-border'
                : 'hover:bg-background/50'
            )}
            onClick={() => setActiveTabId(tab.id)}
          >
            {editingTabId === tab.id ? (
              <input
                type="text"
                value={editingTabName}
                onChange={(e) => setEditingTabName(e.target.value)}
                onBlur={() => handleTabNameSave(tab.id, tab.treeId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleTabNameSave(tab.id, tab.treeId);
                  } else if (e.key === 'Escape') {
                    handleTabNameCancel();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                className="text-sm bg-transparent border-b border-primary outline-none px-1 w-32"
              />
            ) : (
              <span
                className="text-sm"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleTabNameEdit(tab.id, tab.name);
                }}
                title="Double-click to edit"
              >
                {tab.name}
              </span>
            )}
            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-accent rounded"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {activeTab && activeTab.viewMode === 'read' && <ReadView treeId={activeTab.treeId} />}
        {activeTab && activeTab.viewMode === 'tree' && <TreeView treeId={activeTab.treeId} />}
      </main>

      {/* Generate Dialog */}
      {showGenerateDialog && activeTab && (
        <GenerateDialog treeId={activeTab.treeId} onClose={() => setShowGenerateDialog(false)} />
      )}

      {/* Settings Dialog */}
      {showSettingsDialog && (
        <SettingsDialog onClose={() => setShowSettingsDialog(false)} />
      )}

      {/* GitHub Link */}
      <a
        href="https://github.com/amphetamarina/loom"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 right-4 p-3 bg-background border border-border rounded-full hover:bg-accent transition-colors shadow-lg z-40"
        title="View on GitHub"
      >
        <Github size={20} />
      </a>
    </div>
  );
}
