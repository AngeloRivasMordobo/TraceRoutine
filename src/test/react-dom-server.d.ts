// react-dom ships without types and @types/react-dom is not a dependency; the screen tests
// (src/release/iosScreens.test.ts) only use this one function.
declare module 'react-dom/server' {
  import type { ReactNode } from 'react';
  export function renderToStaticMarkup(element: ReactNode): string;
}
