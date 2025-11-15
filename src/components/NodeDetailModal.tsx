import React, { useState, useEffect } from 'react';
import { useTreeStore } from '@/stores/treeStore';
import { X, Edit2, Save } from 'lucide-react';

interface NodeDetailModalProps {
  treeId: string;
  nodeId: string;
  onClose: () => void;
  onEdit: (nodeId: string, text: string) => void;
}

export const NodeDetailModal: React.FC<NodeDetailModalProps> = ({
  treeId,
  nodeId,
  onClose,
  onEdit,
}) => {
  const { trees } = useTreeStore();
  const tree = trees[treeId];
  const node = tree?.nodes[nodeId];

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(node?.text || '');

  useEffect(() => {
    if (node) {
      setEditText(node.text);
    }
  }, [node]);

  if (!node) return null;

  const handleSave = () => {
    onEdit(nodeId, editText);
    setIsEditing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg w-full max-w-3xl max-h-[80vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background">
          <h2 className="text-lg font-semibold">Detalhes do Nó</h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-accent rounded"
                title="Editar"
              >
                <Edit2 size={18} />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-accent rounded">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isEditing ? (
            <div className="space-y-4">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full p-4 bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[300px] font-mono text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 flex items-center gap-2"
                >
                  <Save size={16} />
                  Salvar
                </button>
                <button
                  onClick={() => {
                    setEditText(node.text);
                    setIsEditing(false);
                  }}
                  className="px-4 py-2 border border-border rounded hover:bg-accent"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none">
              <div className="whitespace-pre-wrap font-mono text-sm p-4 bg-muted rounded-lg">
                {node.text || '(vazio)'}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-sm font-semibold mb-3">Metadados</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">ID:</span>
                <span className="ml-2 font-mono">{node.id.substring(0, 8)}...</span>
              </div>
              <div>
                <span className="text-muted-foreground">Filhos:</span>
                <span className="ml-2">{node.children.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Caracteres:</span>
                <span className="ml-2">{node.text.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Palavras:</span>
                <span className="ml-2">{node.text.split(/\s+/).filter(Boolean).length}</span>
              </div>
              {node.bookmark && (
                <div>
                  <span className="text-yellow-500">⭐ Favoritado</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
