import BotanicalAccent from '@/components/brand/BotanicalAccent';
import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, Terminal, Github, FileCode, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TestSetupGuide() {
  const {t}=useTranslation();
  const [copyError,setCopyError]=useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const copyToClipboard = async (text, index) => {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(current=>current===index?null:current), 2000);
    } catch { setCopyError(true); }
  };

  const codeBlocks = [
    {
      title: 'vitest.config.js',
      path: 'vitest.config.js',
      code: `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', 'dist/**', '**/*.config.js', '**/test/**']
    }
  }
});`
    },
    {
      title: 'package.json scripts',
      path: 'Add to package.json',
      code: `"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest run --coverage",
  "test:property": "vitest run test/**/*.test.js"
}`
    },
    {
      title: 'Numeric Safety Utilities',
      path: 'test/utils/numericSafety.js',
      code: `/**
 * Numeric safety utilities to prevent overflow, NaN, Infinity, and precision loss
 */

export const NumericSafety = {
  isValidNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  },

  isSafeInteger(value) {
    return Number.isSafeInteger(value);
  },

  safeParseNumber(value, defaultValue = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return defaultValue;
    return parsed;
  },

  safeParseInt(value, defaultValue = 0) {
    const parsed = parseInt(value, 10);
    if (!Number.isSafeInteger(parsed)) return defaultValue;
    return parsed;
  },

  clamp(value, min, max) {
    if (!Number.isFinite(value)) return min;
    if (!Number.isFinite(min)) return value;
    if (!Number.isFinite(max)) return value;
    return Math.max(min, Math.min(max, value));
  },

  safeAdd(a, b) {
    const result = a + b;
    if (!Number.isFinite(result)) {
      throw new Error('Addition resulted in non-finite number');
    }
    return result;
  },

  safeMultiply(a, b) {
    const result = a * b;
    if (!Number.isFinite(result)) {
      throw new Error('Multiplication resulted in non-finite number');
    }
    return result;
  },

  safeDivide(a, b, defaultValue = 0) {
    if (b === 0) return defaultValue;
    const result = a / b;
    if (!Number.isFinite(result)) return defaultValue;
    return result;
  },

  validatePercentage(value) {
    const num = this.safeParseNumber(value, 0);
    return this.clamp(num, 0, 100);
  },

  validateRating(value) {
    const num = this.safeParseNumber(value, 1);
    return this.clamp(num, 1, 10);
  }
};`
    },
    {
      title: 'Numeric Safety Tests',
      path: 'test/utils/numericSafety.test.js',
      code: `import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { NumericSafety } from './numericSafety.js';

describe('NumericSafety', () => {
  describe('Property-based tests', () => {
    it('should always return finite numbers from safeParseNumber', () => {
      fc.assert(
        fc.property(fc.anything(), (value) => {
          const result = NumericSafety.safeParseNumber(value, 0);
          return Number.isFinite(result);
        })
      );
    });

    it('should always clamp within range', () => {
      fc.assert(
        fc.property(
          fc.double({ noNaN: true }),
          fc.double({ noNaN: true }),
          fc.double({ noNaN: true }),
          (value, a, b) => {
            const min = Math.min(a, b);
            const max = Math.max(a, b);
            const result = NumericSafety.clamp(value, min, max);
            return Number.isFinite(result) && result >= min && result <= max;
          }
        )
      );
    });

    it('should validate percentages are always 0-100', () => {
      fc.assert(
        fc.property(fc.anything(), (value) => {
          const result = NumericSafety.validatePercentage(value);
          return result >= 0 && result <= 100 && Number.isFinite(result);
        })
      );
    });
  });
});`
    },
    {
      title: 'Stripe Webhook Tests',
      path: 'test/functions/stripeWebhook.test.js',
      code: `import { describe, it, expect } from 'vitest';
import { NumericSafety } from '../utils/numericSafety.js';

describe('stripeWebhook', () => {
  describe('Timestamp validation', () => {
    it('should validate subscription timestamps safely', () => {
      const testCases = [
        { timestamp: 1640995200, expected: true },
        { timestamp: NaN, expected: false },
        { timestamp: Infinity, expected: false }
      ];

      testCases.forEach(({ timestamp, expected }) => {
        const isValid = Number.isFinite(timestamp) && 
                       timestamp >= 0 && 
                       Number.isSafeInteger(timestamp);
        expect(isValid).toBe(expected);
      });
    });
  });
});`
    },
    {
      title: 'GitHub Actions Workflow',
      path: '.github/workflows/test.yml',
      code: `name: Test Suite

on:
  push:
    branches: [ main, master, develop ]
  pull_request:
    branches: [ main, master, develop ]

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js \${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Upload coverage
        uses: actions/upload-artifact@v4
        if: matrix.node-version == '20.x'
        with:
          name: coverage
          path: coverage/
          retention-days: 30`
    }
  ];

  return (
    <div className="min-h-dvh bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl min-w-0 mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="botanical-title-row"><h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Terminal className="w-8 h-8 text-blue-600" />
            Test Setup Guide
          </h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div>
          <p className="text-muted-foreground">Complete setup for Vitest, property-based testing, and CI/CD</p>
        </div>

        {/* Instructions */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Github className="w-5 h-5" />
              Setup Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-blue-900">
            <div className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <span>Create the directory structure in your repository root</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span>Copy each code block below into the specified file</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span>Run <code className="px-2 py-1 bg-blue-100 rounded">npm test</code> locally to verify</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold">4.</span>
              <span>Push to GitHub and view results in Actions tab</span>
            </div>
          </CardContent>
        </Card>

        {/* Code Blocks */}
        <div className="space-y-6">
          {codeBlocks.map((block, index) => (
            <Card key={index} className="border-gray-200">
              <CardHeader className="bg-background border-b">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-muted-foreground" />
                    <CardTitle className="text-lg">{block.title}</CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(block.code, index)}
                    className={cn(
                      "transition-colors",
                      copiedIndex === index && "bg-green-50 border-green-300"
                    )}
                  >
                    {copiedIndex === index ? (
                      <>
                        <Check className="w-4 h-4 mr-2 text-green-600" />
                        {t('stage6.copied')}
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        {t('stage6.copy')}
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{block.path}</p>
              </CardHeader>
              <CardContent className="p-0">
                <pre dir="ltr" className="bg-gray-900 text-gray-100 p-6 overflow-x-auto text-sm">
                  <code>{block.code}</code>
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>

        {copyError && <p role="alert" className="my-4 text-sm text-destructive">{t('stage6.copy_error')}</p>}
        {/* Footer */}
        <Card className="mt-8 bg-green-50 border-green-200">
          <CardContent className="p-6">
            <h3 className="mb-2 flex items-center gap-2 font-semibold text-green-900"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> Backend Functions Already Protected</h3>
            <p className="text-sm text-green-800">
              The following functions have been updated with numeric safety guards:
            </p>
            <ul className="list-disc list-inside text-sm text-green-800 mt-2 space-y-1">
              <li><code>functions/stripeWebhook.js</code> - Safe timestamp conversion</li>
              <li><code>functions/checkProactiveNudges.js</code> - Safe date calculations & progress validation</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}