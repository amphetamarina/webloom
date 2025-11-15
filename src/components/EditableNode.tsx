import React, { useState, useCallback, memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { BookmarkIcon, Zap } from 'lucide-react';
import clsx from 'clsx';

interface NodeData {
  label: string;
  text: string;
  bookmark?: boolean;
  isSelected?: boolean;
  onEdit: (nodeId: string, text: string) => void;
  onGenerate: (nodeId: string) => void;
}

export const EditableNode = memo(({ id, data, selected }: NodeProps<NodeData>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(data.text);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditText(data.text);
  }, [data.text]);

  const handleSave = useCallback(() => {
    if (editText.trim() !== data.text) {
      data.onEdit(id, editText);
    }
    setIsEditing(false);
  }, [id, editText, data]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && e.shiftKey) {
        // Shift+Enter: just new line
        return;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
        // Generate after saving
        setTimeout(() => {
          data.onGenerate(id);
        }, 100);
      } else if (e.key === 'Escape') {
        setEditText(data.text);
        setIsEditing(false);
      }
    },
    [handleSave, id, data]
  );

  const handleGenerateClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      data.onGenerate(id);
    },
    [id, data]
  );

  return (
    <div
      className={clsx(
        'px-4 py-3 rounded-lg border-2 shadow-lg transition-all min-w-[200px] max-w-[300px]',
        selected
          ? 'border-primary bg-primary/10'
          : data.bookmark
          ? 'border-yellow-500 bg-background'
          : 'border-border bg-background',
        'hover:shadow-xl'
      )}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <div className="flex items-start gap-2">
        <div className="flex-1">
          {isEditing ? (
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              autoFocus
              className="w-full p-2 text-sm bg-muted border border-border rounded resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              placeholder="Digite o texto... (Enter para salvar e gerar)"
            />
          ) : (
            <div className="text-sm break-words">
              {data.text || '(vazio - clique duplo para editar)'}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          {data.bookmark && (
            <BookmarkIcon size={16} className="text-yellow-500" fill="currentColor" />
          )}
          {selected && !isEditing && (
            <button
              onClick={handleGenerateClick}
              className="p-1 hover:bg-primary/20 rounded transition-colors"
              title="Gerar continuações (ou pressione Enter ao editar)"
            >
              <Zap size={16} className="text-primary" />
            </button>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
});

EditableNode.displayName = 'EditableNode';
