# CloneCAD - Web Modular CAD Engine (AutoCAD Classic Dark UI)

Aplicação Web CAD modular de alta performance inspirada no **AutoCAD (Classic Dark UI)**, construída com **React 18**, **TypeScript**, **Three.js (Orthographic 2D WebGL)** e **Tailwind CSS**.

---

## 🏛️ 1. Arquitetura de Software e Padrões de Projeto

A aplicação foi estruturada do zero em torno de um **Engine Core desacoplado**, utilizando padrões de projeto maduros:

### 1.1 Microkernel / Plugin Pattern
- O `CADCore` atua como micronúcleo estrito: gerencia apenas o ciclo de vida da cena, transformação de coordenadas bidirecionais (World <-> Screen), pilha de histórico (Undo/Redo), camadas (Layers) e eventos de renderização Three.js.
- **Nenhuma ferramenta concreta de desenho ou edição está acoplada ao Core**.
- Todas as ferramentas (Line, Polyline, Circle, Arc, Rectangle, Text, Move, Copy, Rotate, Erase, Measure) são **Plugins** desacoplados que implementam o contrato:

```typescript
export interface CADPlugin {
  id: string;
  name: string;
  version: string;
  icon?: string;
  category: 'draw' | 'modify' | 'annotation' | 'utility';
  init(core: CADCoreAPI): void;
  destroy?(): void;
}
```

### 1.2 Command Pattern (Undo / Redo Engine)
- Toda e qualquer mutação na cena gráfica é encapsulada em um objeto comando com suporte nativo a `execute()`, `undo()` e `redo()`:

```typescript
export interface CADCommand {
  id: string;
  name?: string;
  execute(): void;
  undo(): void;
}
```

- Comandos concretos implementados:
  - `AddEntityCommand`: Adição atômica de primitivas geométricas.
  - `DeleteEntityCommand`: Remoção com restauração integral no undo.
  - `TransformEntityCommand`: Translações (Move), Rotações (Rotate) e Escalonamentos.
  - `ModifyEntityCommand`: Edição de propriedades em tempo real (cor, layer, raio, dimensões).
  - `CompositeCommand`: Agrupamento de múltiplos comandos em uma transação atômica (e.g. Copy múltiplo, Array, Limpeza).

### 1.3 Registry / Factory Pattern
- `PluginRegistry`: Registro dinâmico de plugins em runtime.
- `ToolRegistry`: Registro e lookup de ferramentas ativas.
- `LayerManager`: Gerenciamento dinâmico de camadas CAD padrão e personalizadas.

### 1.4 Strategy / State Pattern
- Modos de interação do usuário encapsulados sob o contrato `CADTool`:
  - `SelectTool`: Modo padrão com pickbox central, Window Selection (azul, esq. p/ dir.) e Crossing Selection (verde, dir. p/ esq.).
  - `PanTool`: Navegação contínua na viewport.
  - Ferramentas de desenho (`LineTool`, `CircleTool`, etc.): com pré-visualização em tempo real (rubber-band) e bloqueio ortogonal (`ORTHO`).

---

## 📐 2. Core & Motor Gráfico (Three.js 2D Orthographic)

- **Renderização WebGL de Alta Performance**: Utiliza `THREE.OrthographicCamera` e renderização sob demanda orientada a eventos para economizar ciclos de CPU e GPU.
- **Conversão Bidirecional de Coordenadas**:
  - `screenToWorld(screenX, screenY)`: Mapeia pixels HTML da viewport para o espaço métrico contínuo do CAD (+Y para cima).
  - `worldToScreen(worldX, worldY)`: Mapeia coordenadas mundiais para pixels na tela.
- **Zoom Suave Centrado no Cursor**: Algoritmo que calcula o ponto mundial invariante sob a mira do mouse durante o scroll da roda.
- **Pan Contínuo**: Pan suave acionado pelo botão do meio do mouse (roda pressionada) ou ferramenta Pan.
- **Grid Infinito Paramétrico**: Malha adaptativa com subdivisão dinâmica de linhas menores e maiores dependendo do nível de zoom, com realce nos eixos X (vermelho) e Y (verde).
- **Indicador UCS (User Coordinate System)**: Ícone clássico do AutoCAD posicionado na viewport exibindo vetores orientados X (vermelho) e Y (verde).
- **Cursor Crosshair & Pickbox**: Mira em cruz de tela cheia com caixa de seleção central e glifos do OSNAP (quadrado para endpoint, triângulo para midpoint, círculo para center).
- **OSNAP (Object Snapping Engine)**: Detecção magnética em tempo real de `Endpoint`, `Midpoint`, `Center`, `Nearest` e `Grid Snap`.

---

## 💻 3. Interface AutoCAD Classic Dark UI

1. **Top Menu Bar**: Menus File, Edit, View, Draw, Modify, Tools e modal de documentação de arquitetura.
2. **Ribbon Toolbar**: Painéis temáticos (Navigate, Draw, Modify, Utility, Layers, History).
3. **Canvas Viewport**: Canvas WebGL com mira crosshair, pickbox e tooltip de coordenadas dinâmicas (`DYN`).
4. **Dockable Properties Palette**: Painel lateral para inspeção e edição de propriedades geométricas e camadas em tempo real (com suporte total a Undo/Redo).
5. **AutoCAD Command Line Console**: Console inferior que suporta atalhos clássicos do AutoCAD (`L`, `PL`, `C`, `REC`, `A`, `T`, `M`, `CO`, `RO`, `E`, `DI`, `U`, `REDO`, `ZOOM EXTENTS`, e inserção direta de coordenadas no formato `X,Y`).
6. **Status Bar**: Indicador numérico de coordenadas X, Y, Z e toggles rápidos para SNAP, GRID, ORTHO (F8), OSNAP (F3) e DYN (F12).

---

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ ou 20+

### Instalação e Execução
```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Gerar build de produção
npm run build
```

O servidor local iniciará em `http://localhost:3000`.
