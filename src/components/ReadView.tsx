import React, { useState, useEffect } from 'react';
import { useTreeStore } from '@/stores/treeStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { ChevronLeft, ChevronRight, Edit2, BookmarkIcon } from 'lucide-react';
import clsx from 'clsx';

interface ReadViewProps {
  treeId: string;
}

export const ReadView: React.FC<ReadViewProps> = ({ treeId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  const { trees, getCurrentNode, getAncestry, getChildren, updateNode, setCurrentNode } =
    useTreeStore();
  const { preferences } = useSettingsStore();

  const tree = trees[treeId];
  const currentNode = getCurrentNode(treeId);
  const ancestry = currentNode ? getAncestry(treeId, currentNode.id) : [];
  const children = currentNode ? getChildren(treeId, currentNode.id) : [];

  useEffect(() => {
    if (currentNode && isEditing) {
      setEditText(currentNode.text);
    }
  }, [currentNode, isEditing]);

  if (!tree || !currentNode) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No tree loaded
      </div>
    );
  }

  const handleSave = () => {
    if (currentNode) {
      updateNode(treeId, currentNode.id, { text: editText });
      setIsEditing(false);
    }
  };

  const handleNodeClick = (nodeId: string) => {
    setCurrentNode(treeId, nodeId);
    setIsEditing(false);
  };

  const navigateToChild = (index: number) => {
    if (children[index]) {
      setCurrentNode(treeId, children[index].id);
    }
  };

  const navigateToParent = () => {
    if (currentNode.parentId) {
      setCurrentNode(treeId, currentNode.parentId);
    }
  };

  const toggleBookmark = () => {
    if (currentNode) {
      updateNode(treeId, currentNode.id, { bookmark: !currentNode.bookmark });
    }
  };

  const renderStory = () => {
    return ancestry.map((node, index) => (
      <div
        key={node.id}
        className={clsx(
          'cursor-pointer transition-colors',
          node.id === currentNode.id && 'bg-accent/20',
          preferences.bold_prompt && index === 0 && 'font-bold'
        )}
        onClick={() => handleNodeClick(node.id)}
        style={{
          fontSize: `${preferences.font_size}px`,
          lineHeight: `${preferences.line_spacing + preferences.font_size}px`,
          marginBottom: `${preferences.paragraph_spacing}px`,
        }}
      >
        {node.text}
      </div>
    ));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={navigateToParent}
            disabled={!currentNode.parentId}
            className="p-2 rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => navigateToChild(0)}
            disabled={children.length === 0}
            className="p-2 rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleBookmark}
            className={clsx(
              'p-2 rounded hover:bg-accent',
              currentNode.bookmark && 'text-yellow-500'
            )}
          >
            <BookmarkIcon size={20} fill={currentNode.bookmark ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={clsx('p-2 rounded hover:bg-accent', isEditing && 'bg-accent')}
          >
            <Edit2 size={20} />
          </button>
        </div>
      </div>

      {/* Story content */}
      <div className="flex-1 overflow-auto p-8">
        {isEditing ? (
          <div className="space-y-4">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full h-64 p-4 bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              style={{
                fontSize: `${preferences.font_size}px`,
                lineHeight: `${preferences.line_spacing + preferences.font_size}px`,
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditText(currentNode.text);
                }}
                className="px-4 py-2 border border-border rounded hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="prose prose-invert max-w-none">{renderStory()}</div>
        )}
      </div>

      {/* Children preview */}
      {children.length > 0 && !isEditing && (
        <div className="border-t border-border p-4">
          <div className="text-sm text-muted-foreground mb-2">Continue with:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {children.map((child, index) => (
              <button
                key={child.id}
                onClick={() => navigateToChild(index)}
                className="p-3 text-left border border-border rounded hover:bg-accent transition-colors text-sm"
              >
                {child.text.substring(0, 100)}
                {child.text.length > 100 && '...'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
