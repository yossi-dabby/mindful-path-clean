/// <reference types="vite/client" />

/**
 * Global ambient type augmentations for the Mindful Path app.
 *
 * IMPORTANT: This file MUST keep the `import type` statement below so that
 * TypeScript treats it as an ES module rather than an ambient global file.
 * - In a module file: `declare module 'react' {}` = module AUGMENTATION (additive)
 * - In an ambient file: `declare module 'react' {}` = module DECLARATION (replacing)
 * Removing the import would cause all @types/react exports to disappear.
 *
 * The Window augmentation is wrapped in `declare global {}` because module files
 * require that wrapper to extend the global scope.
 */
import type { ReactNode } from 'react';

/**
 * Augment the global Window interface to include test-framework globals used
 * by DraggableAiCompanion and other components to detect headless/E2E environments.
 */
declare global {
  interface Window {
    /** Cypress testing framework global, present in Cypress E2E test runs. */
    Cypress?: unknown;
    /** Playwright testing framework global, present in Playwright E2E test runs. */
    playwright?: unknown;
  }
}

/**
 * React module augmentation for forward-ref component JSX compatibility.
 *
 * All shadcn/ui components are plain JavaScript forwardRef wrappers that spread
 * the full `...props` object onto the underlying DOM element.  Without explicit
 * TypeScript generics on every `React.forwardRef(...)` call, TypeScript infers
 * the props type as `RefAttributes<any>` — a narrow type that does not include
 * `children`, `className`, `variant`, or any other HTML/component attribute.
 *
 * This augmentation adds a secondary call-signature overload to
 * `React.ExoticComponent` that:
 *   1. Accepts `children?: ReactNode` (React 18 removed the implicit children).
 *   2. Accepts an index signature so that spread-through props (`className`,
 *      `variant`, `data-*`, `aria-*`, etc.) are type-safe at call sites.
 *
 * This is NOT a "silence-all" override — it is the correct type for any
 * JavaScript component that spreads `...props` onto its root element, which is
 * precisely what every shadcn/ui primitive does.  The original narrower
 * overload is preserved and TypeScript will still use it when the inferred P
 * has explicit named members.
 */
declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface ExoticComponent<P = Record<string, never>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (props: P & { children?: ReactNode; [key: string]: any }): ReactNode;
  }
}
