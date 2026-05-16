# Administrative Muse: Project Design System

This document serves as a permanent reference for the UI/UX principles, component behaviors, and visual tokens used throughout the JazzLab Connect platform.

> [!NOTE]
> AI ASSISTANTS: Always reference this document when creating new pages or components for this project to maintain the "Administrative Muse" aesthetic.

---

## 1. Core Principles

### Ultra-Minimalism
*   **Zero Noise**: Remove all selection checkboxes and indeterminate states. Sequential numbering (#) should be used for record tracking instead.
*   **Focused Intent**: The data grid is the "Command Center." Every pixel should serve a functional purpose for data manipulation or viewing.

### Unified Architecture
*   **Integrated Controls**: Search, Filter, and Action controls must be integrated into the main component container.
*   **Cinema-Mode Expansion**: Layouts should expand generously to fill high-resolution screens (e.g., `max-w-[1800px]`).

---

## 2. Grid Interaction Model

### The "Grid Box" Focus
*   **Global Cell Focus**: Hovering or clicking a cell highlights the **entire grid box** area.
*   **Inset Highlights**: Use `ring-inset` for interaction borders to ensure alignment with grid lines.

| State | Token | Visual Description |
| :--- | :--- | :--- |
| **Hover** | `ring-2 ring-inset ring-sky-400/40` | Subtle light blue border and faint blue tint. |
| **Focus** | `ring-2 ring-inset ring-sky-400` | Solid, vibrant light blue border and deeper tint. |

---

## 3. Component Tokens (Tailwind)

| Component | Tailwind Classes |
| :--- | :--- |
| **Main Container** | `rounded-[2.5rem] border shadow-2xl transition-all duration-1000` |
| **Table Header** | `bg-white/[0.04] px-6 py-4 uppercase font-black text-[12px] tracking-[0.2em]` |
| **Search Field** | `border-2 solid` (Resting) / `hover:bg-sky-50/50` (Flat Active Sync) |
| **Data Cells** | `p-0 border-r last:border-r-0 relative transition-all duration-150` |
| **Inputs** | `h-12 px-6 font-bold text-sm border-none focus:ring-0 bg-transparent` |
| **Add Row** | `mx-6 my-4 h-16 rounded-[1.25rem] border-2 border-dashed` |

---

## 4. Visual Palette

*   **Dark Mode**: Deep Navy/Slate (`#020617`), `border-white/5`.
*   **Light Mode**: Pure White, `border-slate-100`.
*   **Accent**: Sky Blue (`sky-400`) for all interactive highlights.
*   **Typography**: All-caps headers, wide tracking, heavy weights.
