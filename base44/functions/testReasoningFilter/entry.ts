import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Test harness for reasoning filter.
 * Simulates agent messages with THOUGHT/ANALYSIS and verifies filtering.
 */

const TEST_CASES = [
  {
    name: "Hebrew message with THOUGHT prefix",
    input: "THOUGHT: The user identified that they consult an AI software for the project.\n\nI should ask the user how they interact with the AI.\n\nMy goal is to help define a small step.\n\nמעולה! הבנתי שאתה נעזר בתוכנת AI ייעודית לפרויקט.",
    expectedOutput: "מעולה! הבנתי שאתה נעזר בתוכנת AI ייעודית לפרויקט.",
    shouldBlock: true
  },
  {
    name: "Multiple reasoning lines",
    input: "THOUGHT: Need to validate emotion.\nANALYSIS: User seems anxious.\nPLAN: 1. Ask situation\nSTEP 1: Gather context\nI should check the gate.\nFirst I'll ask about feelings.\n\nWhat's happening right now?",
    expectedOutput: "What's happening right now?",
    shouldBlock: true
  },
  {
    name: "Clean message (no reasoning)",
    input: "Hi. How are you feeling today?\nWhat would you like to work on?",
    expectedOutput: "Hi. How are you feeling today?\nWhat would you like to work on?",
    shouldBlock: false
  },
  {
    name: "Hebrew with meta-commentary",
    input: "THOUGHT: User needs grounding.\nI should offer a breathing exercise.\nעכשיו בוא/י ננסה תרגיל נשימה:\n1. נשום עמוק\n2. עצור ל-4 שניות\n3. נשוף לאט",
    expectedOutput: "עכשיו בוא/י ננסה תרגיל נשימה:\n1. נשום עמוק\n2. עצור ל-4 שניות\n3. נשוף לאט",
    shouldBlock: true
  },
  {
    name: "Bracketed internal notes",
    input: "[checking constraint]\n[internal validation]\nWhat's your anxiety level from 0-10?",
    expectedOutput: "What's your anxiety level from 0-10?",
    shouldBlock: true
  }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    console.log('Running reasoning filter tests...\n');

    const results = [];
    let passed = 0;
    let failed = 0;

    for (const testCase of TEST_CASES) {
      console.log(`\n[TEST] ${testCase.name}`);
      console.log(`Input (${testCase.input.length} chars):\n${testCase.input.substring(0, 100)}...`);

      // Simulate the filtering that happens in validateAgentOutput.jsx
      const lines = testCase.input.split('\n');
      const FORBIDDEN_PATTERNS = [
        /^THOUGHT:/mi, /^THINKING:/mi, /^ANALYSIS:/mi, /^REASONING:/mi,
        /^INTERNAL:/mi, /^SYSTEM:/mi, /^DEVELOPER:/mi, /^PLAN:/mi,
        /^CHECKLIST:/mi, /^STEP\s+\d+:/mi, /^CONFIDENCE:/mi,
        /^I should\b/mi, /^I need to\b/mi, /^I will\b/mi, /^Let me\b/mi,
        /^First I'll\b/mi, /^Then I'll\b/mi, /^My goal is\b/mi,
        /\[checking/i, /\[internal/i, /\[validation/i, /\[constraint/i
      ];

      const cleanedLines = lines.filter(line => {
        const trimmed = line.trim();
        if (!trimmed) return true;
        return !FORBIDDEN_PATTERNS.some(pattern => pattern.test(line));
      });

      const output = cleanedLines.join('\n').trim();
      const wasBlocked = output !== testCase.input;

      console.log(`Output (${output.length} chars):\n${output.substring(0, 100)}...`);
      console.log(`Blocked: ${wasBlocked}, Expected: ${testCase.shouldBlock}`);

      const testPassed = 
        (testCase.shouldBlock && wasBlocked) || 
        (!testCase.shouldBlock && !wasBlocked);

      if (testPassed) {
        console.log('✅ PASS');
        passed++;
      } else {
        console.log('❌ FAIL');
        failed++;
      }

      results.push({
        name: testCase.name,
        passed: testPassed,
        wasBlocked,
        expectedBlock: testCase.shouldBlock,
        inputLength: testCase.input.length,
        outputLength: output.length,
        output: output.substring(0, 200)
      });
    }

    console.log(`\n\n=== FINAL RESULTS ===`);
    console.log(`Passed: ${passed}/${TEST_CASES.length}`);
    console.log(`Failed: ${failed}/${TEST_CASES.length}`);
    console.log(`Success Rate: ${((passed / TEST_CASES.length) * 100).toFixed(1)}%`);

    return Response.json({
      success: failed === 0,
      summary: {
        total: TEST_CASES.length,
        passed,
        failed,
        successRate: ((passed / TEST_CASES.length) * 100).toFixed(1) + '%'
      },
      results
    });

  } catch (error) {
    console.error('Test error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});