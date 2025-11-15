# 🎯 Como Usar o Loom React

## ⚡ Início Rápido

### 1. Instalar e Configurar

```bash
# Instalar dependências
npm install

# Configurar API key
cp .env.example .env
# Edite .env e adicione: VITE_OPENAI_API_KEY=sk-sua-chave-aqui

# Iniciar
npm run dev
```

## 🎨 Interface Principal

### Visualização de Árvore (Padrão)

A interface principal mostra uma **visualização de árvore interativa** onde você pode:

- **Ver todos os nós** da sua história conectados
- **Clicar nos nós** para selecioná-los
- **Arrastar** para mover a visualização
- **Scroll** para zoom in/out
- **Minimapa** no canto para navegação rápida

### Barra Superior

| Ícone | Função |
|-------|--------|
| **+** | Nova árvore (nova aba) |
| **📂** | Abrir árvore (JSON) |
| **💾** | Salvar árvore |
| **🌳/📄** | Alternar entre TreeView e ReadView |
| **⚡** | Gerar continuações (diálogo) |
| **🌙/☀️** | Tema dark/light |
| **⚙️** | Configurações |

## ✏️ Editando Nós

### Método 1: Duplo Clique

1. **Duplo clique** em qualquer nó
2. Um campo de texto aparece
3. **Digite ou edite** o texto
4. **Enter** → Salva e gera automaticamente novas ramificações! 🎉
5. **Shift+Enter** → Adiciona quebra de linha (sem gerar)
6. **Escape** → Cancela edição

### Método 2: Botão de Raio

1. **Clique uma vez** para selecionar um nó (fica azul)
2. Um **ícone de raio ⚡** aparece no canto do nó
3. **Clique no raio** para gerar continuações

## 🤖 Gerando com IA

### Geração Rápida (Recomendado)

1. **Duplo clique** no nó
2. **Digite** seu texto
3. **Enter** → Gera automaticamente!

**Exemplo:**
```
Nó vazio → Duplo clique → Digite "Era uma vez" → Enter
→ O sistema gera 4 continuações automaticamente!
```

### Geração Manual

1. **Selecione** um nó (clique simples)
2. Clique no **ícone de raio ⚡** que aparece no nó
   OU
   Clique no **raio da barra superior** para abrir o diálogo

### Durante a Geração

- **Edges animadas** (linhas conectoras ficam azuis e animadas)
- **Toast de progresso** mostra o status
- **Aguarde** alguns segundos
- **Novas caixas** aparecem automaticamente conectadas!

## ⚙️ Configurações

Clique no **ícone de engrenagem (⚙️)** no topo direito.

### Aba: Configurações de Geração

Configure os parâmetros padrão:

| Parâmetro | O que faz | Valores |
|-----------|-----------|---------|
| **Modelo Padrão** | Qual modelo usar | gpt-4o, gpt-4-turbo, etc |
| **Continuações** | Quantas opções gerar | 1-10 (padrão: 4) |
| **Tokens** | Tamanho do texto gerado | 10-4000 (padrão: 150) |
| **Temperature** | Criatividade | 0=conservador, 2=criativo |
| **Top P** | Diversidade | 0-1 (padrão: 1) |
| **Logprobs** | Dados de probabilidade | 0-20 |

### Aba: Configurações de Modelos

**Modelos Pré-configurados:**
- gpt-4o (Recomendado - rápido e eficiente)
- gpt-4o-mini
- gpt-4-turbo
- gpt-3.5-turbo

**Adicionar Modelo Customizado:**

1. Role até "Adicionar Novo Modelo"
2. Preencha:
   - **Nome:** `meu-modelo`
   - **Tipo:** Escolha entre OpenAI, Together AI, Llama.cpp, etc
   - **API Base URL:** (opcional) URL customizada
   - **API Key:** (opcional) Chave específica

3. Clique em **Salvar Modelo**

**Editar Modelo Existente:**

1. Encontre o modelo na lista
2. Clique em **Editar**
3. Modifique os campos
4. As mudanças são salvas automaticamente

**Deletar Modelo:**

1. Clique no **ícone de lixeira 🗑️**
2. Confirme a exclusão

### Exemplos de Configuração

**OpenAI Padrão:**
```
Nome: gpt-4o
Tipo: OpenAI Chat
Base URL: (vazio - usa padrão)
API Key: (vazio - usa .env)
```

**Together AI:**
```
Nome: mixtral-8x7b
Tipo: Together
Base URL: https://api.together.xyz/v1
API Key: sua-chave-together
```

**Llama.cpp Local:**
```
Nome: llama-local
Tipo: Llama.cpp
Base URL: http://localhost:8080/v1
API Key: (vazio)
```

## 🎨 Dicas de Uso

### Workflow Recomendado

1. **Comece pequeno:** Digite uma frase inicial
2. **Enter:** Gera 4 continuações
3. **Escolha a melhor:** Clique na caixinha que você gostou
4. **Continue:** Duplo clique nela e adicione mais texto
5. **Repita:** Enter para gerar mais ramificações

### Navegação Eficiente

- **Clique no minimapa** para pular rapidamente
- Use **Ctrl+Scroll** para zoom preciso
- **Arraste com mouse** para mover
- **Selecione nós** para ver o caminho destacado

### Organizando sua História

- **⭐ Bookmark:** Marque nós importantes
  - Nós com bookmark ficam com borda dourada
  - Use para marcar cenas importantes

- **Múltiplas Abas:** Trabalhe em várias histórias
  - Clique **+** para nova aba
  - Clique **X** na aba para fechar

### Salvando e Compartilhando

**Salvar:**
1. Clique no ícone **💾**
2. Arquivo JSON é baixado
3. Guarde em local seguro

**Abrir:**
1. Clique no ícone **📂**
2. Selecione o arquivo JSON
3. Abre em nova aba

**Compatibilidade:**
- ✅ Arquivos são compatíveis com o Loom Python original
- ✅ Salvos automaticamente no navegador (localStorage)
- ✅ Exporte regularmente para backup

## 🎯 Casos de Uso

### Escrita Criativa

```
1. Digite: "Em uma floresta sombria,"
2. Enter → Gera 4 continuações
3. Escolha: "vivia uma bruxa misteriosa"
4. Duplo clique → Continue: "que guardava um segredo"
5. Enter → Explore diferentes caminhos!
```

### Brainstorming

```
1. Nó raiz: "Ideias para produto"
2. Enter → 4 ideias diferentes
3. Clique em cada uma
4. Enter em cada → Sub-ideias
5. Visualize toda a árvore de possibilidades
```

### RPG / Histórias Interativas

```
Nó: "Você encontra uma porta trancada"
→ Enter gera:
  - "Arromba a porta"
  - "Procura a chave"
  - "Chama por ajuda"
  - "Dá a volta"

Clique em cada opção e gere mais ramificações!
```

## ⚠️ Resolução de Problemas

### "API key not found"
- Verifique o arquivo `.env`
- Confirme: `VITE_OPENAI_API_KEY=sk-...`
- **Reinicie** o servidor (`npm run dev`)

### "Generation failed"
- Verifique sua **API key**
- Confirme que tem **créditos** na OpenAI
- Tente reduzir o número de **tokens**
- Verifique a **base_url** se usar modelo custom

### Nó não edita
- Tente **duplo clique** novamente
- Recarregue a página (F5)
- Verifique o console (F12) para erros

### Geração não acontece ao apertar Enter
- Certifique que **não** está pressionando Shift
- Verifique se há texto no nó
- Aguarde se outra geração estiver em andamento

## 🔥 Atalhos de Teclado

| Tecla | Ação |
|-------|------|
| **Duplo clique** | Editar nó |
| **Enter** | Salvar + Gerar |
| **Shift+Enter** | Nova linha |
| **Escape** | Cancelar edição |
| **Scroll** | Zoom |
| **Arrastar** | Mover visualização |

## 💡 Truques Pro

1. **Temperature Criativa:** Use 1.2-1.5 para histórias criativas
2. **Mais Continuações:** Aumente para 6-8 para mais opções
3. **Tokens Grandes:** Use 300-500 para parágrafos completos
4. **Salve Frequentemente:** Exporte JSONs importantes
5. **Use Bookmarks:** Marque pontos de decisão importantes

## 🎓 Aprenda Mais

- **README-REACT.md** - Documentação técnica completa
- **INICIO-RAPIDO.md** - Instalação detalhada
- Código está em **src/** - Explore e customize!

---

**Divirta-se criando histórias incríveis! ✨📖**
