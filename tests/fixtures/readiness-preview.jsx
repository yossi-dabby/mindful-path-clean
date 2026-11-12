import React from 'react';
import { createRoot } from 'react-dom/client';
import AIContentReportsPanel from '../../src/components/admin/AIContentReportsPanel';
import RetentionCleanupPanel from '../../src/components/settings/RetentionCleanupPanel';
export function renderReadinessFixture(kind) {
  document.querySelector('#root').style.display = 'none';
  const host = document.createElement('div'); host.id = 'readiness-fixture';
  host.className = 'bg-background text-foreground p-4'; host.style.cssText = 'position:fixed;inset:0;overflow:auto'; document.body.append(host);
  createRoot(host).render(kind === 'admin' ? <AIContentReportsPanel /> : <RetentionCleanupPanel />);
}
