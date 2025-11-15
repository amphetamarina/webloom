import React, { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useTreeStore } from '@/stores/treeStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { OpenAIService } from '@/services/openai';
import { EditableNode } from './EditableNode';
import type { TreeNode } from '@/types';
import toast from 'react-hot-toast';

interface TreeViewProps {
  treeId: string;
}

const horizontalSpacing = 300;
const verticalSpacing = 150;

const nodeTypes: NodeTypes = {
  editable: EditableNode,
};

export const TreeView: React.FC<TreeViewProps> = ({ treeId }) => {
  const { trees, setCurrentNode, updateNode, createNode, getAncestry } = useTreeStore();
  const { generationSettings, modelConfigs } = useSettingsStore();
  const tree = trees[treeId];
  const [generatingNodes, setGeneratingNodes] = useState<Set<string>>(new Set());

  const calculateLayout = useCallback(
    (rootId: string, nodes: Record<string, TreeNode>) => {
      const positions: Record<string, { x: number; y: number }> = {};
      const visited = new Set<string>();

      const calculateSubtreeWidth = (nodeId: string): number => {
        const node = nodes[nodeId];
        if (!node || visited.has(nodeId)) return 1;
        visited.add(nodeId);

        if (node.children.length === 0) return 1;

        return node.children.reduce((sum, childId) => {
          return sum + calculateSubtreeWidth(childId);
        }, 0);
      };

      const layout = (nodeId: string, x: number, y: number, visited: Set<string>): number => {
        const node = nodes[nodeId];
        if (!node || visited.has(nodeId)) return x;
        visited.add(nodeId);

        positions[nodeId] = { x, y };

        let currentX = x;
        node.children.forEach((childId) => {
          const childWidth = calculateSubtreeWidth(childId);
          const childX = currentX + (childWidth * horizontalSpacing) / 2 - horizontalSpacing / 2;
          currentX = layout(childId, childX, y + verticalSpacing, visited);
        });

        return Math.max(currentX, x + horizontalSpacing);
      };

      visited.clear();
      layout(rootId, 0, 0, new Set());

      return positions;
    },
    []
  );

  const handleEditNode = useCallback(
    (nodeId: string, text: string) => {
      updateNode(treeId, nodeId, { text });
      toast.success('Texto atualizado');
    },
    [treeId, updateNode]
  );

  const handleGenerateFromNode = useCallback(
    async (nodeId: string) => {
      if (generatingNodes.has(nodeId)) {
        toast.error('Já está gerando para este nó');
        return;
      }

      setGeneratingNodes((prev) => new Set(prev).add(nodeId));

      try {
        // Build prompt from ancestry
        const ancestry = getAncestry(treeId, nodeId);
        const prompt = ancestry.map((node) => node.text).join('\n');

        if (!prompt.trim()) {
          toast.error('Adicione algum texto antes de gerar');
          setGeneratingNodes((prev) => {
            const next = new Set(prev);
            next.delete(nodeId);
            return next;
          });
          return;
        }

        // Get model config
        const modelConfig = modelConfigs[generationSettings.model];
        if (!modelConfig) {
          throw new Error('Configuração do modelo não encontrada');
        }

        // Initialize OpenAI service
        const openaiService = new OpenAIService(modelConfig);

        // Generate completions
        toast.loading(`Gerando ${generationSettings.num_continuations} continuações...`, {
          id: 'generating',
        });

        const response = await openaiService.generate(prompt, generationSettings);

        toast.dismiss('generating');

        // Create child nodes for each completion
        response.completions.forEach((completion) => {
          const childId = createNode(treeId, completion.text, nodeId);
          // Store token data if available
          if (completion.tokens.length > 0) {
            updateNode(treeId, childId, {
              tokens: completion.tokens,
              finishReason: completion.finishReason,
            });
          }
        });

        toast.success(`${response.completions.length} continuações geradas!`);
      } catch (error) {
        console.error('Generation failed:', error);
        toast.error(error instanceof Error ? error.message : 'Falha na geração');
      } finally {
        setGeneratingNodes((prev) => {
          const next = new Set(prev);
          next.delete(nodeId);
          return next;
        });
      }
    },
    [
      treeId,
      generatingNodes,
      getAncestry,
      generationSettings,
      modelConfigs,
      createNode,
      updateNode,
    ]
  );

  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    if (!tree) return { nodes: [], edges: [] };

    const positions = calculateLayout(tree.rootId, tree.nodes);

    const nodes: Node[] = Object.values(tree.nodes).map((node) => ({
      id: node.id,
      type: 'editable',
      position: positions[node.id] || { x: 0, y: 0 },
      data: {
        text: node.text,
        bookmark: node.bookmark,
        isSelected: node.id === tree.currentNodeId,
        onEdit: handleEditNode,
        onGenerate: handleGenerateFromNode,
      },
    }));

    const edges: Edge[] = Object.values(tree.nodes).flatMap((node) =>
      node.children.map((childId) => ({
        id: `${node.id}-${childId}`,
        source: node.id,
        target: childId,
        type: 'smoothstep',
        animated: generatingNodes.has(node.id),
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#6b7280',
        },
        style: {
          stroke: generatingNodes.has(node.id) ? '#3b82f6' : '#6b7280',
          strokeWidth: generatingNodes.has(node.id) ? 2 : 1,
        },
      }))
    );

    return { nodes, edges };
  }, [tree, calculateLayout, handleEditNode, handleGenerateFromNode, generatingNodes]);

  const [nodes, , onNodesChange] = useNodesState(flowNodes);
  const [edges, , onEdgesChange] = useEdgesState(flowEdges);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setCurrentNode(treeId, node.id);
    },
    [treeId, setCurrentNode]
  );

  if (!tree) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Nenhuma árvore carregada
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        minZoom={0.1}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.id === tree.currentNodeId) return '#3b82f6';
            return '#1f2937';
          }}
        />
      </ReactFlow>
    </div>
  );
};
