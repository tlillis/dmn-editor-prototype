# DMN Editor Prototype

A browser-based visual editor for creating and executing Decision Model and Notation (DMN) models. Build decision logic using FEEL expressions, visualize decision graphs, and test your models with multiple execution engines.

## What is DMN?

[Decision Model and Notation (DMN)](https://www.omg.org/dmn/) is an industry standard for modeling business decisions. It provides:

- **Decision Requirements Diagrams (DRD)** - Visual graphs showing how decisions depend on inputs and other decisions
- **FEEL (Friendly Enough Expression Language)** - A simple expression language for defining decision logic
- **Portability** - Models can be exported and executed on any DMN-compliant engine

## Features

- **Visual Graph Editor** - Drag-and-drop interface for building decision requirement diagrams
- **FEEL Expression Editor** - Syntax-highlighted editor for writing decision logic
- **Multiple Execution Engines** - Run your models locally or via external services
- **Test Cases** - Define expected inputs/outputs and validate your model
- **Constants** - Define named values that can be referenced across expressions
- **Business Knowledge Models (BKM)** - Create reusable functions
- **Import/Export** - Save as JSON or export to standard DMN XML

## Execution Engines

The editor supports multiple DMN execution engines:

| Engine                    | Type                 | DMN TCK Compliance | Notes                                    |
| ------------------------- | -------------------- | ------------------ | ---------------------------------------- |
| **Feelin**                | Browser (in-process) | Not measured       | Lightweight, no setup required           |
| **KIE Extended Services** | Server (Docker)      | 99.4%              | Full DMN support, requires local service |

### Feelin (Default)

Runs entirely in the browser using the [feelin](https://github.com/nikku/feelin) library. Great for quick prototyping but has limited FEEL support.

### KIE Extended Services

Full DMN engine from the [Apache KIE](https://kie.apache.org/) project. Run locally via Docker:

```bash
docker run -p 21345:21345 apache/incubator-kie-kogito-base-builder:main
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/           # Shared UI components (shadcn/ui)
├── features/
│   └── editor/
│       ├── components/   # Editor-specific components
│       │   ├── graph-view.tsx        # Decision graph visualization
│       │   ├── properties-panel.tsx  # Element property editor
│       │   ├── model-explorer.tsx    # Tree view of model elements
│       │   ├── constants-editor.tsx  # Constants management
│       │   ├── execution-panel.tsx   # Run model with inputs
│       │   └── test-cases-panel.tsx  # Test case management
│       ├── utils/        # DMN import/export utilities
│       └── data/         # Sample models
├── lib/
│   └── engines/          # DMN execution engine implementations
│       ├── feelin-engine.ts          # Browser-based FEEL evaluator
│       └── extended-services-engine.ts # KIE Extended Services client
├── store/                # Zustand state management
└── types/
    └── dmn.ts            # TypeScript types for DMN elements
```

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Zustand** - State management
- **React Flow** - Graph visualization
- **CodeMirror** - FEEL expression editor
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI component library

## DMN Concepts

### Input Data

External data fed into the decision model (e.g., customer age, loan amount).

### Decision

A node that produces an output based on inputs and FEEL logic. Decisions can depend on inputs or other decisions.

### Business Knowledge Model (BKM)

Reusable logic that can be invoked from decisions. Similar to functions - they have parameters and return a value.

### Constants

Named values that can be referenced in any expression. Useful for thresholds, rates, and configuration values.

## Available Scripts

| Command           | Description                      |
| ----------------- | -------------------------------- |
| `npm run dev`     | Start development server         |
| `npm run build`   | Build for production             |
| `npm run preview` | Preview production build         |
| `npm run lint`    | Run ESLint and TypeScript checks |
| `npm run format`  | Format code with Prettier        |

## Related Resources

- [DMN Specification (OMG)](https://www.omg.org/dmn/)
- [DMN TCK Compliance Results](https://dmn-tck.github.io/tck/)
- [FEEL Specification](https://www.omg.org/spec/DMN/1.4/PDF)
