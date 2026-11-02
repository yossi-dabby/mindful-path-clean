/**
 * Data Retention & User Control E2E Test Suite Documentation
 * + Eval-Driven Prompt Testing Strategy
 * 
 * This suite uses GOLDEN_SCENARIOS (functions/goldenScenarios.js) for validating:
 * - Hard refusals (medical, crisis language)
 * - Therapy mode activation (thought_work, goal_work)
 * - Safety boundaries (non-blocking UI, crisis detection)
 * - Behavior consistency across all 3 AI surfaces
 * 
 * Covers:
 * - Data & Privacy settings page accessibility
 * - Retention selection and persistence
 * - Export data functionality
 * - Delete data with two-step confirmation
 * - No blocking overlays/modals
 * - Responsive mobile design
 * 
 * Related to Prompt Testing:
 * - Imports GOLDEN_SCENARIOS from functions/goldenScenarios.js
 * - Uses validateScenario() to check behavior without exact text matching
 * - Validates across: therapist_chat, ai_companion, coach_chat
 * 
 * Test IDs added:
 * - data-testid="data-privacy-card" - Main settings card
 * - data-testid="retention-select" - Retention days dropdown
 * - data-testid="export-data-btn" - Export button
 * - data-testid="delete-data-btn" - Delete button (initial state)
 * - data-testid="delete-confirm-panel" - Confirmation panel (inline)
 * - data-testid="delete-confirm-btn" - Confirm delete button
 * - data-testid="delete-cancel-btn" - Cancel delete button
 * - data-testid="data-privacy-message" - Status message (success/error)
 * 
 * Key Test Scenarios:
 * 1. Page loads without blocking (all inputs accessible)
 * 2. Retention setting can be changed (shows inline message)
 * 3. Export button is clickable and enabled
 * 4. Delete requires two-step confirmation (first click shows panel, second confirms)
 * 5. Confirmation panel is inline and non-blocking
 * 6. Status messages appear and disappear automatically (non-blocking)
 * 7. No overlays or modals cover buttons/inputs
 * 8. Mobile responsive (buttons accessible on small screens)
 * 9. Privacy notice displays and mentions no HIPAA claims
 * 10. Settings persist across page reloads
 * 
 * Data Affected:
 * - MoodEntry (older than retention period deleted)
 * - ThoughtJournal (older than retention period deleted)
 * - Conversation archives (via UserDeletedConversations soft delete)
 * - User preferences (retention_days setting)
 * 
 * Retention Cleanup Flow:
 * 1. On Settings page load or Chat initialization
 * 2. Check last cleanup timestamp (localStorage)
 * 3. If > 24 hours ago, invoke retentionCleanup function
 * 4. Function queries user's retention_days preference
 * 5. Deletes/archives records older than cutoff
 * 6. Returns results (non-blocking, logged but doesn't interrupt UX)
 * 
 * Safeguards:
 * - Soft delete for conversations (UserDeletedConversations records)
 * - Two-step confirmation for hard delete
 * - Inline feedback (no modals)
 * - Cleanup runs in background (non-blocking)
 * - Cleanup has error handling (continues on individual failures)
 * - Privacy notice displayed (no HIPAA claims)
 */

export const testSuiteDocumentation = {
  name: "Data Retention & User Control E2E Tests",
  surfaces: ["Settings", "Chat"],
  dataAffected: [
    "MoodEntry (deleted if > retention_days old)",
    "ThoughtJournal (deleted if > retention_days old)",
    "Conversation archives (soft deleted via UserDeletedConversations)",
    "User preferences (data_retention_days)"
  ],
  retentionCleanupTriggers: [
    "Chat page initialization (if last cleanup > 24h ago)",
    "Manual invoke from Settings page",
    "Background cron (if configured)"
  ],
  nonBlockingElements: [
    "Status messages (auto-dismiss after 3s)",
    "Confirmation panel (inline, not modal)",
    "Retention cleanup (background task)",
    "Export process (shows loading state)"
  ],
  testCoverage: [
    "Settings page loads without blocking",
    "Retention dropdown accessible and changeable",
    "Export button clickable",
    "Delete button triggers two-step confirmation",
    "Confirmation panel inline and dismissible",
    "Status messages non-blocking and auto-dismiss",
    "No overlays covering inputs",
    "Mobile responsive design",
    "Privacy notice visible and accurate",
    "Settings persist across reloads"
  ]
};

export default testSuiteDocumentation;