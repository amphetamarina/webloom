import React, { useCallback, useMemo, useState, useEffect } from 'react';
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
import { AIService } from '@/services/aiService';
import { EditableNode } from './EditableNode';
import { NodeDetailModal } from './NodeDetailModal';
import type { TreeNode } from '@/types';
import toast from 'react-hot-toast';

interface TreeViewProps {
  treeId: string;
}

const horizontalSpacing = 450; // Spacing between levels (left-right)
const verticalSpacing = 180;   // Spacing between siblings (top-bottom)

const nodeTypes: NodeTypes = {
  editable: EditableNode,
};

export const TreeView: React.FC<TreeViewProps> = ({ treeId }) => {
  const { trees, setCurrentNode, updateNode, createNode, getAncestry, reparentNode } = useTreeStore();
  const { generationSettings, modelConfigs, preferences, apiKeys } = useSettingsStore();
  const tree = trees[treeId];
  const [generatingNodes, setGeneratingNodes] = useState<Set<string>>(new Set());
  const [loadingNodes, setLoadingNodes] = useState<Map<string, number>>(new Map()); // nodeId -> number of loading placeholders
  const [selectedNodeForDetail, setSelectedNodeForDetail] = useState<string | null>(null);
  const [reconnectingNodeId, setReconnectingNodeId] = useState<string | null>(null);

  const calculateLayout = useCallback(
    (rootId: string, nodes: Record<string, TreeNode>) => {
      const positions: Record<string, { x: number; y: number }> = {};
      const visited = new Set<string>();

      // Calculate the height (vertical) of the subtree
      const calculateSubtreeHeight = (nodeId: string): number => {
        const node = nodes[nodeId];
        if (!node || visited.has(nodeId)) return 1;
        visited.add(nodeId);

        if (node.children.length === 0) return 1;

        return node.children.reduce((sum, childId) => {
          return sum + calculateSubtreeHeight(childId);
        }, 0);
      };

      // Horizontal layout: x increases to the right, y increases downward
      const layout = (nodeId: string, x: number, y: number, visited: Set<string>): number => {
        const node = nodes[nodeId];
        if (!node || visited.has(nodeId)) return y;
        visited.add(nodeId);

        positions[nodeId] = { x, y };

        let currentY = y;
        node.children.forEach((childId) => {
          const childHeight = calculateSubtreeHeight(childId);
          const childY = currentY + (childHeight * verticalSpacing) / 2 - verticalSpacing / 2;
          currentY = layout(childId, x + horizontalSpacing, childY, visited);
        });

        return Math.max(currentY, y + verticalSpacing);
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
      toast.success('Text updated');
    },
    [treeId, updateNode]
  );

  const handleGenerateFromNode = useCallback(
    async (nodeId: string) => {
      if (generatingNodes.has(nodeId)) {
        toast.error('Already generating for this node');
        return;
      }

      setGeneratingNodes((prev) => new Set(prev).add(nodeId));
      setLoadingNodes((prev) => new Map(prev).set(nodeId, generationSettings.num_continuations));

      try {
        // Build prompt from ancestry
        const ancestry = getAncestry(treeId, nodeId);
        const prompt = ancestry.map((node) => node.text).join('\n');

        if (!prompt.trim()) {
          toast.error('Add some text before generating');
          setGeneratingNodes((prev) => {
            const next = new Set(prev);
            next.delete(nodeId);
            return next;
          });
          setLoadingNodes((prev) => {
            const next = new Map(prev);
            next.delete(nodeId);
            return next;
          });
          return;
        }

        // Get model config
        const modelConfig = modelConfigs[generationSettings.model];
        if (!modelConfig) {
          throw new Error('Model configuration not found');
        }

        // Check if API key is configured for this provider
        if (!modelConfig.api_key) {
          if (modelConfig.provider === 'openai' && !apiKeys.openai) {
            toast.error('OpenAI API key not configured. Please add it in Settings.');
            setGeneratingNodes((prev) => {
              const next = new Set(prev);
              next.delete(nodeId);
              return next;
            });
            setLoadingNodes((prev) => {
              const next = new Map(prev);
              next.delete(nodeId);
              return next;
            });
            return;
          }
          if (modelConfig.provider === 'anthropic' && !apiKeys.anthropic) {
            toast.error('Anthropic API key not configured. Please add it in Settings.');
            setGeneratingNodes((prev) => {
              const next = new Set(prev);
              next.delete(nodeId);
              return next;
            });
            setLoadingNodes((prev) => {
              const next = new Map(prev);
              next.delete(nodeId);
              return next;
            });
            return;
          }
        }

        // Initialize AI service
        const aiService = new AIService(modelConfig, apiKeys);

        // Generate completions
        toast.loading(`Generating ${generationSettings.num_continuations} continuations...`, {
          id: 'generating',
        });

        const results = await aiService.generateCompletions(prompt, generationSettings);

        // Create nodes for all results
        results.forEach((text) => {
          createNode(treeId, text, nodeId);
        });

        toast.dismiss('generating');
        toast.success(`Continuations generated!`);
      } catch (error) {
        console.error('Generation failed:', error);
        toast.error(error instanceof Error ? error.message : 'Generation failed');
      } finally {
        setGeneratingNodes((prev) => {
          const next = new Set(prev);
          next.delete(nodeId);
          return next;
        });
        setLoadingNodes((prev) => {
          const next = new Map(prev);
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
    ]
  );

  const handleNodeDetailClick = useCallback((nodeId: string) => {
    setSelectedNodeForDetail(nodeId);
  }, []);

  const handleAddChild = useCallback(
    (nodeId: string) => {
      // Create a new empty child node
      createNode(treeId, '(new node - double-click to edit)', nodeId);
      toast.success('Child node added');
    },
    [treeId, createNode]
  );

  const handleReconnect = useCallback(
    (nodeId: string) => {
      // Start reconnecting mode
      setReconnectingNodeId(nodeId);
      toast.success('Click on another node to reconnect');
    },
    []
  );

  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    if (!tree) return { nodes: [], edges: [] };

    const positions = calculateLayout(tree.rootId, tree.nodes);
    const allNodes: Node[] = [];

    // Add existing nodes
    Object.values(tree.nodes).forEach((node) => {
      allNodes.push({
        id: node.id,
        type: 'editable',
        position: positions[node.id] || { x: 0, y: 0 },
        data: {
          text: node.text,
          bookmark: node.bookmark,
          isSelected: node.id === tree.currentNodeId,
          truncateLength: preferences.node_text_truncate,
          onEdit: handleEditNode,
          onGenerate: handleGenerateFromNode,
          onDetailClick: handleNodeDetailClick,
          onAddChild: handleAddChild,
          onReconnect: node.parentId ? handleReconnect : undefined, // Only allow reconnecting nodes with parents
        },
      });
    });

    // Add loading skeleton nodes as temporary children
    loadingNodes.forEach((count, parentId) => {
      const parent = tree.nodes[parentId];
      if (parent && positions[parentId]) {
        const parentPos = positions[parentId];

        for (let i = 0; i < count; i++) {
          const tempId = `loading-${parentId}-${i}`;
          allNodes.push({
            id: tempId,
            type: 'editable',
            position: {
              x: parentPos.x + horizontalSpacing,
              y: parentPos.y + (i - (count - 1) / 2) * verticalSpacing,
            },
            data: {
              text: '',
              bookmark: false,
              isSelected: false,
              isLoading: true,
              truncateLength: preferences.node_text_truncate,
              onEdit: () => {},
              onGenerate: () => {},
              onDetailClick: () => {},
              onAddChild: () => {},
            },
          });
        }
      }
    });

    const edges: Edge[] = [];

    // Add edges for existing nodes
    Object.values(tree.nodes).forEach((node) => {
      node.children.forEach((childId) => {
        edges.push({
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
        });
      });
    });

    // Add edges for loading nodes with pulsating animation
    loadingNodes.forEach((count, parentId) => {
      for (let i = 0; i < count; i++) {
        const tempId = `loading-${parentId}-${i}`;
        edges.push({
          id: `${parentId}-${tempId}`,
          source: parentId,
          target: tempId,
          type: 'smoothstep',
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#3b82f6',
          },
          style: {
            stroke: '#3b82f6',
            strokeWidth: 2,
          },
          className: 'animate-pulse',
        });
      }
    });

    return { nodes: allNodes, edges };
  }, [tree, calculateLayout, handleEditNode, handleGenerateFromNode, handleNodeDetailClick, handleAddChild, handleReconnect, generatingNodes, loadingNodes, preferences.node_text_truncate]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Sync nodes and edges when flowNodes/flowEdges change
  useEffect(() => {
    setNodes(flowNodes);
  }, [flowNodes, setNodes]);

  useEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id.startsWith('loading-')) return;

      // If in reconnecting mode, set this node as the new parent
      if (reconnectingNodeId && reconnectingNodeId !== node.id) {
        reparentNode(treeId, reconnectingNodeId, node.id);
        toast.success('Node reconnected! Generate new continuations?');
        setReconnectingNodeId(null);
        setCurrentNode(treeId, reconnectingNodeId);
      } else {
        setCurrentNode(treeId, node.id);
      }
    },
    [treeId, setCurrentNode, reconnectingNodeId, reparentNode]
  );

  if (!tree) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No tree loaded
      </div>
    );
  }

  return (
    <>
      <div className="w-full h-full bg-background">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          defaultViewport={{ x: 0, y: 0, zoom: 1.2 }}
          attributionPosition="bottom-left"
          minZoom={0.1}
          maxZoom={2}
        >
          <Background />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              if (node.id === tree.currentNodeId) return '#3b82f6';
              if (node.id.startsWith('loading-')) return '#f59e0b';
              return '#1f2937';
            }}
          />
        </ReactFlow>
      </div>

      {selectedNodeForDetail && (
        <NodeDetailModal
          treeId={treeId}
          nodeId={selectedNodeForDetail}
          onClose={() => setSelectedNodeForDetail(null)}
          onEdit={handleEditNode}
        />
      )}
    </>
  );
};
