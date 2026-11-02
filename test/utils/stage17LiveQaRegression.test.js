import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  buildStage12TurnSupplement,
  classifyStage12Turn,
} from '../../src/lib/chatQualityStage12.js';
import {
  applyFinalOutputGovernor,
  applyLocaleQualityCorrections,
} from '../../src/components/utils/finalOutputGovernor.jsx';

const CHAT_SOURCE = readFileSync('src/pages/Chat.jsx', 'utf8');
const BUBBLE_SOURCE = readFileSync('src/components/chat/MessageBubble.jsx', 'utf8');
const VALIDATOR_SOURCE = readFileSync('src/components/utils/validateAgentOutput.jsx', 'utf8');

describe('Stage 17 live-QA regression fixes', () => {
  it('reserves a rapid-send turn before asynchronous Layer-2 crisis detection', () => {
    const sendStart = CHAT_SOURCE.indexOf('const handleSendMessage = async');
    const sendEnd = CHAT_SOURCE.indexOf('// Phase 7.1 — Explicit safety layer precedence', sendStart);
    const sendSource = CHAT_SOURCE.slice(sendStart, sendEnd);
    const registrationIndex = sendSource.indexOf('chatCoordinatorV2Ref.current.registerSend');
    const layer2Index = sendSource.indexOf('base44.functions.invoke(\'enhancedCrisisDetector\'');

    expect(registrationIndex).toBeGreaterThan(-1);
    expect(layer2Index).toBeGreaterThan(registrationIndex);
    expect(sendSource).toContain('conversationId: currentConversationIdRef.current');
    expect(sendSource).toContain('lastConfirmedMessagesRef.current.length');
    expect(sendSource).toContain('inputMessageRef.current');
    expect(CHAT_SOURCE).toContain('inputMessageRef.current = e.target.value');
    expect(CHAT_SOURCE).toContain('const legacyRapidQueueRef = useRef([])');
    expect(sendSource).toContain('legacyRapidQueueRef.current.push');
    expect(CHAT_SOURCE).toContain('const nextQueuedSend = legacyRapidQueueRef.current.shift()');
    expect(sendSource).not.toContain("console.log('[Send] ⚠️ A reply is already in progress')");
  });

  it('forces readable theme foreground inside the primary user bubble', () => {
    expect(BUBBLE_SOURCE).toContain('[overflow-wrap:anywhere] !text-primary-foreground');
  });

  it('shows a localized opening preview instead of a blank new session', () => {
    expect(CHAT_SOURCE).toContain("(isLoading && currentConversationId) || (isConversationInitializing && messages.length === 0)");
    expect(CHAT_SOURCE).toContain("messages.length === 0");
    expect(CHAT_SOURCE).toContain("t('chat_stage.opening_preview')");
  });

  it.each([
    ['I would like a short guided exercise now. Please guide me step by step.', 'en'],
    ['אני רוצה עכשיו תרגיל מודרך קצר. הנחה אותי צעד אחר צעד.', 'he'],
    ['Quiero hacer un ejercicio breve de respiración. Guíame paso a paso.', 'es'],
    ['Je souhaite un court exercice guidé. Guidez-moi étape par étape.', 'fr'],
    ['Ich möchte eine kurze geführte Übung. Bitte Schritt für Schritt.', 'de'],
    ['Vorrei un breve esercizio guidato. Guidami passo dopo passo.', 'it'],
    ['Quero um exercício guiado curto. Oriente-me passo a passo.', 'pt'],
  ])('classifies an explicit guided-exercise request in %s', (message, language) => {
    expect(classifyStage12Turn(message)).toBe('guided_exercise');
    const supplement = buildStage12TurnSupplement(message, language);
    expect(supplement).toContain('GUIDED EXERCISE');
    expect(supplement).toContain('immediately start');
    expect(supplement).toContain('Do not delay');
  });

  it('corrects the verified German typo without changing other content', () => {
    expect(applyLocaleQualityCorrections('Bitte beschreiben Sie es in wenigen Wörgen.', 'de'))
      .toBe('Bitte beschreiben Sie es in wenigen Worten.');
    expect(applyFinalOutputGovernor('Ich höre zu. Beschreiben Sie es bitte in wenigen Wörgen.', { lang: 'de' }))
      .toContain('wenigen Worten');
  });

  it('records an expected safety fallback as a warning rather than an application error', () => {
    expect(VALIDATOR_SOURCE).toContain(
      "console.warn('[Reasoning Filter] Message empty after filtering; safe failsafe applied')"
    );
    expect(VALIDATOR_SOURCE).not.toContain(
      "console.error('[Reasoning Filter] Message empty after filtering, using failsafe')"
    );
  });
});
