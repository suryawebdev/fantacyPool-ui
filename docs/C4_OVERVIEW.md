# C4 Model – System Design Overview

This folder describes the **Cricket Pool** (Fantasy Pool) application using the **C4 model** for software architecture: from high-level context down to components.

**For a single document that explains the full system (product, architecture, security, flows, API, config), see [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md).**

## C4 Model Levels (high → low)

| Level | Document | Description |
|-------|----------|-------------|
| **1 – Context** | [C4_01_Context.md](./C4_01_Context.md) | System boundary, users, and external systems. "What does the system do and who uses it?" |
| **2 – Containers** | [C4_02_Containers.md](./C4_02_Containers.md) | Major runnable/deployable parts of the system. "What are the main applications and services?" |
| **3 – Components** | [C4_03_Components.md](./C4_03_Components.md) | Building blocks inside each container. "How is the frontend structured (routes, services)?" |

*(Level 4 – Code – is omitted; it would describe classes and functions inside components.)*

## Scope of This Repo

- **Repository:** `fantacyPool-ui` – Angular SPA (frontend only).
- **Backend:** External; documented via [BACKEND_CONTRACT.md](./BACKEND_CONTRACT.md) and related API docs.
- **C4 focus:** The "system" in Context is the **Cricket Pool product**; Containers split **Web Application** (this repo) vs **Backend API**; Components zoom into the **Angular app** structure.

## How to Read the Diagrams

- **Mermaid** diagrams are used; they render on GitHub and in many Markdown viewers.
- **Arrows** indicate direction of data/control (e.g. "User uses Web App", "Web App calls Backend API").
- **Boxes** are systems, containers, or components depending on the level.

## Document Index

1. [C4_01_Context.md](./C4_01_Context.md) – System Context (Level 1)
2. [C4_02_Containers.md](./C4_02_Containers.md) – Containers (Level 2)
3. [C4_03_Components.md](./C4_03_Components.md) – Components (Level 3)
