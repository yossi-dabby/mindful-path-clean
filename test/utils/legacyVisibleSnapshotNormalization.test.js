import { describe, it, expect } from 'vitest';
import {
  applyLegacyVisibleAssistantNormalizationGate,
  getAssistantIdentityKey,
  normalizeLegacyVisibleAssistantBlocks,
  selectLatestAssistantResponse,
} from '../../src/lib/chatRuntimeLifecycle.js';

const FINAL_STATUSES = new Set(['done', 'completed', 'complete', 'final', 'finished']);

const isExplicitlyFinalAssistantMessage = (assistantMsg) => {
  const status = typeof assistantMsg?.status === 'string' ? assistantMsg.status.toLowerCase() : '';
  const metadataStatus = typeof assistantMsg?.metadata?.status === 'string'
    ? assistantMsg.metadata.status.toLowerCase()
    : '';
  return (
    FINAL_STATUSES.has(status) ||
    FINAL_STATUSES.has(metadataStatus) ||
    assistantMsg?.metadata?.is_final === true ||
    assistantMsg?.metadata?.final === true ||
    assistantMsg?.metadata?.completed === true
  );
};

const evaluateAssistantSnapshotFinality = (msgs, source) => {
  const latest = selectLatestAssistantResponse(msgs);
  if (!latest) return { isFinal: true, reason: 'no_assistant_in_snapshot' };
  if (isExplicitlyFinalAssistantMessage(latest.msg)) {
    return { isFinal: true, reason: 'explicit_final_status' };
  }
  return { isFinal: false, reason: `non_final_${String(source || 'unknown').toLowerCase()}_snapshot` };
};

const buildAssistantContentMapByIdentity = (msgs) => {
  const map = new Map();
  (Array.isArray(msgs) ? msgs : []).forEach((msg, index) => {
    if (!msg || msg.role !== 'assistant') return;
    const key = getAssistantIdentityKey(msg, index);
    if (!key) return;
    map.set(key, typeof msg.content === 'string' ? msg.content : '');
  });
  return map;
};

const hasAssistantSnapshotContentChange = (prevMessages, nextMessages) => {
  const prevMap = buildAssistantContentMapByIdentity(prevMessages);
  const nextMap = buildAssistantContentMapByIdentity(nextMessages);
  if (prevMap.size !== nextMap.size) return true;
  for (const [key, content] of prevMap.entries()) {
    if (!nextMap.has(key)) return true;
    if (nextMap.get(key) !== content) return true;
  }
  return false;
};

const hasVisibleAssistantMutation = (prevMessages, nextMessages) => {
  const prevMap = buildAssistantContentMapByIdentity(prevMessages);
  if (prevMap.size === 0) return false;
  const nextMap = buildAssistantContentMapByIdentity(nextMessages);
  for (const [key, prevContent] of prevMap.entries()) {
    if (!nextMap.has(key)) continue;
    if (nextMap.get(key) !== prevContent) return true;
  }
  return false;
};

const applyAssistantFeedbackFinalityMetadata = (msgs, decisionIsFinal) => (
  (Array.isArray(msgs) ? msgs : []).map((msg) => {
    if (!msg || msg.role !== 'assistant') return msg;
    return {
      ...msg,
      metadata: {
        ...(msg.metadata || {}),
        feedback_finality_verified: decisionIsFinal === true,
      },
    };
  })
);

function createSafeUpdateHydrationGate(chatOrchestratorV2Enabled = false) {
  let lastConfirmed = [];
  let visible = [];

  const commit = (rawSnapshot, source) => {
    const normalized = applyLegacyVisibleAssistantNormalizationGate(
      rawSnapshot,
      chatOrchestratorV2Enabled
    );
    const finalityDecision = evaluateAssistantSnapshotFinality(normalized, source);
    const assistantChanged = hasAssistantSnapshotContentChange(lastConfirmed, normalized);

    if (hasVisibleAssistantMutation(lastConfirmed, normalized)) {
      return { accepted: false, reason: 'rejected_visible_assistant_immutable', finalityDecision };
    }

    const hadVisibleAssistant = lastConfirmed.some((msg) => msg?.role === 'assistant');
    const allowNonFinalPopulation =
      (source === 'LoadConversation' || source === 'CurrentConversationHydrate') && !hadVisibleAssistant;

    if (assistantChanged && finalityDecision.isFinal !== true && !allowNonFinalPopulation) {
      return { accepted: false, reason: 'rejected_non_final_hydration_snapshot', finalityDecision };
    }

    visible = applyAssistantFeedbackFinalityMetadata(normalized, finalityDecision.isFinal === true);
    lastConfirmed = visible;
    return { accepted: true, reason: 'accepted', finalityDecision };
  };

  return {
    commit,
    getVisible: () => visible,
  };
}

describe('legacy visible snapshot normalization for hydration/load', () => {
  const user1 = { role: 'user', id: 'u1', content: 'first question' };
  const progress1 = { role: 'assistant', id: 'a1p', __rawIndex: 1, content: 'draft 1' };
  const final1 = { role: 'assistant', id: 'a1f', __rawIndex: 2, content: 'final 1', metadata: { status: 'completed' } };
  const user2 = { role: 'user', id: 'u2', content: 'second question' };
  const progress2 = { role: 'assistant', id: 'a2p', __rawIndex: 4, content: 'draft 2' };
  const final2NoMarker = { role: 'assistant', id: 'a2f', __rawIndex: 5, content: 'final 2' };

  const rawWithTwoPairs = [user1, progress1, final1, user2, progress2, final2NoMarker];

  it('hydrates to user1→final1→user2→final2 even when latest final has no explicit final markers', () => {
    const gate = createSafeUpdateHydrationGate(false);
    const result = gate.commit(rawWithTwoPairs, 'CurrentConversationHydrate');

    expect(result.accepted).toBe(true);
    expect(result.finalityDecision.isFinal).toBe(false);
    expect(gate.getVisible().map((m) => m.id)).toEqual(['u1', 'a1f', 'u2', 'a2f']);
  });

  it('load-conversation path yields the same collapsed legacy snapshot under no-explicit-final condition', () => {
    const gate = createSafeUpdateHydrationGate(false);
    const result = gate.commit(rawWithTwoPairs, 'LoadConversation');

    expect(result.accepted).toBe(true);
    expect(result.finalityDecision.isFinal).toBe(false);
    expect(gate.getVisible().map((m) => m.id)).toEqual(['u1', 'a1f', 'u2', 'a2f']);
  });

  it('single latest assistant (user2→progress2) stays structurally intact and is not feedback-final', () => {
    const gate = createSafeUpdateHydrationGate(false);
    const rawSingleLatestAssistant = [user1, final1, user2, progress2];
    const result = gate.commit(rawSingleLatestAssistant, 'CurrentConversationHydrate');

    expect(result.accepted).toBe(true);
    expect(result.finalityDecision.isFinal).toBe(false);
    const visible = gate.getVisible();
    expect(visible.map((m) => m.id)).toEqual(['u1', 'a1f', 'u2', 'a2p']);
    expect(visible[3].__rawIndex).toBe(4);
    expect(visible[3].metadata?.feedback_finality_verified).toBe(false);
  });

  it('when latest turn has progress2→final2, only final2 remains visible with original raw index', () => {
    const gate = createSafeUpdateHydrationGate(false);
    const raw = [user1, final1, user2, progress2, final2NoMarker];
    const result = gate.commit(raw, 'CurrentConversationHydrate');

    expect(result.accepted).toBe(true);
    const visible = gate.getVisible();
    expect(visible.map((m) => m.id)).toEqual(['u1', 'a1f', 'u2', 'a2f']);
    expect(visible[3].__rawIndex).toBe(5);
    // Exact content — must equal final2NoMarker.content, not a concatenation
    expect(visible[3].content).toBe(final2NoMarker.content);
    expect(visible[3].content).not.toContain(progress2.content);
  });

  it('keeps the substantive reply when a later Hebrew clinical-record acknowledgement is present', () => {
    const substantive = {
      role: 'assistant',
      id: 'a-substantive-he',
      __rawIndex: 1,
      content: 'המנגנון שמתחזק כאן הוא הימנעות שמקטינה את החרדה רגעית אבל מחזקת את החשש. התערבות מתאימה אחת היא לנסח מראש מסר קצר ולתרגל אותו לפני השיחה.',
      metadata: { status: 'completed' },
    };
    const acknowledgement = {
      role: 'assistant',
      id: 'a-admin-he',
      __rawIndex: 3,
      content: 'הרישום הקליני עודכן. אם תרצה לשתף איך זה הלך בפעם הבאה שתשיב לחבר — אני כאן.',
      metadata: { status: 'completed' },
    };

    const gate = createSafeUpdateHydrationGate(false);
    const result = gate.commit([user1, substantive, acknowledgement], 'CurrentConversationHydrate');

    expect(result.accepted).toBe(true);
    const visible = gate.getVisible();
    expect(visible.map((m) => m.id)).toEqual(['u1', 'a-substantive-he']);
    expect(visible[1].content).toBe(substantive.content);
    expect(visible[1].metadata?.feedback_finality_verified).toBe(true);
  });

  it('keeps the substantive reply when a later English administrative acknowledgement is present', () => {
    const substantive = {
      role: 'assistant',
      id: 'a-substantive-en',
      __rawIndex: 1,
      content: 'The maintaining mechanism here looks like reassurance-seeking that reduces the tension briefly but keeps the fear active. One matching intervention is to pause, write one balanced sentence, and send that version once.',
      metadata: { status: 'completed' },
    };
    const acknowledgement = {
      role: 'assistant',
      id: 'a-admin-en',
      __rawIndex: 3,
      content: 'The clinical record has been updated. If you want to share how it went next time, I am here.',
      metadata: { status: 'completed' },
    };

    const gate = createSafeUpdateHydrationGate(false);
    const result = gate.commit([user1, substantive, acknowledgement], 'CurrentConversationHydrate');

    expect(result.accepted).toBe(true);
    const visible = gate.getVisible();
    expect(visible.map((m) => m.id)).toEqual(['u1', 'a-substantive-en']);
    expect(visible[1].content).toBe(substantive.content);
    expect(visible[1].metadata?.feedback_finality_verified).toBe(true);
  });

  it('merges split substantive assistant parts across a hidden tool boundary into one canonical reply', () => {
    const splitPart1 = {
      role: 'assistant',
      id: 'a-split-1',
      __rawIndex: 1,
      content: 'המנגנון שמתחזק כאן הוא בדיקה חוזרת שמרגיעה לרגע ואז מחזירה את הספק.',
    };
    const splitPart2 = {
      role: 'assistant',
      id: 'a-split-2',
      __rawIndex: 3,
      content: 'צעד אחד שמתאים למנגנון הזה הוא לעצור אחרי בדיקה אחת, לנשום, ולתת לעצמך שתי דקות לפני בדיקה נוספת.',
      metadata: { status: 'completed' },
    };

    const normalized = normalizeLegacyVisibleAssistantBlocks([user1, splitPart1, splitPart2]);
    expect(normalized).toHaveLength(2);
    expect(normalized[1].id).toBe('a-split-2');
    expect(normalized[1].content).toBe(
      `${splitPart1.content}\n\n${splitPart2.content}`
    );

    const gate = createSafeUpdateHydrationGate(false);
    const result = gate.commit([user1, splitPart1, splitPart2], 'CurrentConversationHydrate');

    expect(result.accepted).toBe(true);
    const visible = gate.getVisible();
    expect(visible.map((m) => m.id)).toEqual(['u1', 'a-split-2']);
    expect(visible[1].content).toBe(`${splitPart1.content}\n\n${splitPart2.content}`);
    expect(visible[1].metadata?.feedback_finality_verified).toBe(true);
  });

  it('does not remove legitimate therapeutic content that discusses a clinical record', () => {
    const therapeuticReference = {
      role: 'assistant',
      id: 'a-clinical-reference',
      __rawIndex: 1,
      content: 'We can talk about what your clinical record means for your follow-up plan, and we can keep the focus on the pattern you noticed today.',
      metadata: { status: 'completed' },
    };

    const gate = createSafeUpdateHydrationGate(false);
    const result = gate.commit([user1, therapeuticReference], 'CurrentConversationHydrate');

    expect(result.accepted).toBe(true);
    const visible = gate.getVisible();
    expect(visible.map((m) => m.id)).toEqual(['u1', 'a-clinical-reference']);
    expect(visible[1].content).toBe(therapeuticReference.content);
    expect(visible[1].metadata?.feedback_finality_verified).toBe(true);
  });

  it('repeated hydration/refetch/subscription/reload snapshots stay idempotent', () => {
    const gate = createSafeUpdateHydrationGate(false);
    const baseline = gate.commit(rawWithTwoPairs, 'CurrentConversationHydrate');
    expect(baseline.accepted).toBe(true);
    const expected = gate.getVisible().map((m) => `${m.id}:${m.__rawIndex ?? 'na'}`);

    const sources = ['CurrentConversationHydrate', 'Refetch', 'Subscription', 'LoadConversation'];
    sources.forEach((source) => {
      const result = gate.commit(rawWithTwoPairs, source);
      expect(result.accepted).toBe(true);
      expect(gate.getVisible().map((m) => `${m.id}:${m.__rawIndex ?? 'na'}`)).toEqual(expected);
    });
  });

  it('normalizes visible assistant blocks in both V2 and legacy paths', () => {
    const v2Snapshot = applyLegacyVisibleAssistantNormalizationGate(rawWithTwoPairs, true);
    const legacySnapshot = applyLegacyVisibleAssistantNormalizationGate(rawWithTwoPairs, false);

    expect(v2Snapshot.map((m) => m.id)).toEqual(['u1', 'a1f', 'u2', 'a2f']);
    expect(legacySnapshot.map((m) => m.id)).toEqual(['u1', 'a1f', 'u2', 'a2f']);
  });

  it('merges multiple completed assistant records into one visible answer', () => {
    const first = {
      role: 'assistant',
      id: 'completed-1',
      __rawIndex: 1,
      content: 'אפשרות אחת היא שהימנעות נותנת הקלה מיידית.',
      metadata: { status: 'completed' },
    };
    const second = {
      role: 'assistant',
      id: 'completed-2',
      __rawIndex: 2,
      content: 'כדאי לבדוק יחד גם הסברים חלופיים.',
      metadata: { status: 'completed' },
    };

    const normalized = applyLegacyVisibleAssistantNormalizationGate([user1, first, second], true);
    expect(normalized).toHaveLength(2);
    expect(normalized[1].content).toContain(first.content);
    expect(normalized[1].content).toContain(second.content);
  });

  it('contiguous progress+final within one block: selects final, never concatenates their content', () => {
    const progressMsg = { role: 'assistant', id: 'prog', __rawIndex: 1, content: 'thinking…' };
    const finalMsg = {
      role: 'assistant',
      id: 'fin',
      __rawIndex: 2,
      content: 'Here is the complete answer.',
      metadata: { status: 'completed' },
    };
    const normalized = normalizeLegacyVisibleAssistantBlocks([user1, progressMsg, finalMsg]);
    expect(normalized).toHaveLength(2);
    expect(normalized[1].id).toBe('fin');
    expect(normalized[1].content).toBe('Here is the complete answer.');
    expect(normalized[1].content).not.toContain('thinking');
  });

  it('merges a contiguous therapeutic reply and its post-memory-write continuation', () => {
    const actionableReply = {
      role: 'assistant',
      id: 'action-before-memory-write',
      __rawIndex: 6,
      content: 'בחר משימה אחת שאורכת עד חמש דקות והתחל בה עכשיו. כשהטיימר מצלצל — עצור, גם אם אתה באמצע משפט. ההצלחה כאן היא שהתחלת, לא שסיימת.',
      tool_calls: [
        {
          name: 'writeTherapistMemory',
          status: 'success',
          results: '{"success":true}',
        },
      ],
    };
    const therapeuticContinuation = {
      role: 'assistant',
      id: 'rationale-after-memory-write',
      __rawIndex: 7,
      content: 'הצעד הזה מכוון בדיוק למעגל שהסברנו — לא מחכים למוטיבציה, אלא נותנים לפעולה קטנה להתחיל להזין את תחושת היכולת.',
    };

    const normalized = normalizeLegacyVisibleAssistantBlocks([
      user1,
      actionableReply,
      therapeuticContinuation,
    ]);

    expect(normalized).toHaveLength(2);
    expect(normalized[1].id).toBe('rationale-after-memory-write');
    expect(normalized[1].content).toBe(
      `${actionableReply.content}\n\n${therapeuticContinuation.content}`
    );
    expect(normalized[1].content).toContain('בחר משימה אחת');
    expect(normalized[1].content).toContain('הצעד הזה מכוון');

    const normalizedAgain = normalizeLegacyVisibleAssistantBlocks(normalized);
    expect(normalizedAgain[1].content).toBe(normalized[1].content);
  });

  it('does not merge a retrieval progress record with a following final response', () => {
    const retrievalProgress = {
      role: 'assistant',
      id: 'retrieval-progress',
      __rawIndex: 1,
      content: 'I am checking the earlier records before I answer.',
      tool_calls: [
        {
          name: 'retrieveTherapistMemory',
          status: 'success',
          results: '{"success":true}',
        },
      ],
    };
    const finalWithoutMarker = {
      role: 'assistant',
      id: 'final-after-retrieval',
      __rawIndex: 2,
      content: 'Here is the complete therapeutic answer.',
    };

    const normalized = normalizeLegacyVisibleAssistantBlocks([
      user1,
      retrievalProgress,
      finalWithoutMarker,
    ]);

    expect(normalized).toHaveLength(2);
    expect(normalized[1].id).toBe('final-after-retrieval');
    expect(normalized[1].content).toBe(finalWithoutMarker.content);
    expect(normalized[1].content).not.toContain(retrievalProgress.content);
  });

  it('prefers an explicitly final response over an earlier memory-write record', () => {
    const preFinalReply = {
      role: 'assistant',
      id: 'pre-final-memory-write',
      __rawIndex: 1,
      content: 'An earlier answer fragment that must not be duplicated.',
      tool_calls: [
        {
          name: 'writeTherapistMemory',
          status: 'success',
          results: '{"success":true}',
        },
      ],
    };
    const explicitFinal = {
      role: 'assistant',
      id: 'explicit-final-after-memory-write',
      __rawIndex: 2,
      content: 'Here is the complete answer.',
      metadata: { status: 'completed' },
    };

    const normalized = normalizeLegacyVisibleAssistantBlocks([user1, preFinalReply, explicitFinal]);

    expect(normalized).toHaveLength(2);
    expect(normalized[1].id).toBe('explicit-final-after-memory-write');
    expect(normalized[1].content).toBe(explicitFinal.content);
    expect(normalized[1].content).not.toContain(preFinalReply.content);
  });

  it('keeps the substantive reply when a later Spanish administrative acknowledgement is present', () => {
    const substantive = {
      role: 'assistant',
      id: 'a-substantive-es',
      __rawIndex: 1,
      content: 'El mecanismo que se mantiene aquí es la evitación que reduce la ansiedad momentáneamente pero refuerza el miedo.',
      metadata: { status: 'completed' },
    };
    const acknowledgement = {
      role: 'assistant',
      id: 'a-admin-es',
      __rawIndex: 3,
      content: 'El registro clínico ha sido actualizado. Si deseas compartir cómo fue la próxima vez, estoy aquí.',
    };

    const gate = createSafeUpdateHydrationGate(false);
    const result = gate.commit([user1, substantive, acknowledgement], 'CurrentConversationHydrate');

    expect(result.accepted).toBe(true);
    const visible = gate.getVisible();
    expect(visible.map((m) => m.id)).toEqual(['u1', 'a-substantive-es']);
    expect(visible[1].content).toBe(substantive.content);
  });

  it('keeps the substantive reply when a later French administrative acknowledgement is present', () => {
    const substantive = {
      role: 'assistant',
      id: 'a-substantive-fr',
      __rawIndex: 1,
      content: "Le mécanisme ici est l'évitement qui réduit l'anxiété momentanément mais renforce la peur.",
      metadata: { status: 'completed' },
    };
    const acknowledgement = {
      role: 'assistant',
      id: 'a-admin-fr',
      __rawIndex: 3,
      content: 'Le dossier clinique a été mis à jour. Si vous souhaitez partager comment ça s\'est passé, je suis là.',
    };

    const gate = createSafeUpdateHydrationGate(false);
    const result = gate.commit([user1, substantive, acknowledgement], 'CurrentConversationHydrate');

    expect(result.accepted).toBe(true);
    const visible = gate.getVisible();
    expect(visible.map((m) => m.id)).toEqual(['u1', 'a-substantive-fr']);
    expect(visible[1].content).toBe(substantive.content);
  });

  it('keeps the substantive reply when a later German administrative acknowledgement is present', () => {
    const substantive = {
      role: 'assistant',
      id: 'a-substantive-de',
      __rawIndex: 1,
      content: 'Der aufrechterhaltende Mechanismus ist hier Vermeidung, die die Angst kurzfristig reduziert, aber die Befürchtung stärkt.',
      metadata: { status: 'completed' },
    };
    const acknowledgement = {
      role: 'assistant',
      id: 'a-admin-de',
      __rawIndex: 3,
      content: 'Die klinische Akte wurde aktualisiert. Wenn Sie teilen möchten, wie es gelaufen ist, bin ich hier.',
    };

    const gate = createSafeUpdateHydrationGate(false);
    const result = gate.commit([user1, substantive, acknowledgement], 'CurrentConversationHydrate');

    expect(result.accepted).toBe(true);
    const visible = gate.getVisible();
    expect(visible.map((m) => m.id)).toEqual(['u1', 'a-substantive-de']);
    expect(visible[1].content).toBe(substantive.content);
  });

  it('keeps the substantive reply when a later Italian administrative acknowledgement is present', () => {
    const substantive = {
      role: 'assistant',
      id: 'a-substantive-it',
      __rawIndex: 1,
      content: "Il meccanismo che si mantiene qui è l'evitamento che riduce l'ansia momentaneamente ma rafforza la paura.",
      metadata: { status: 'completed' },
    };
    const acknowledgement = {
      role: 'assistant',
      id: 'a-admin-it',
      __rawIndex: 3,
      content: 'Il registro clinico è stato aggiornato. Se vuoi condividere come è andata, sono qui.',
    };

    const gate = createSafeUpdateHydrationGate(false);
    const result = gate.commit([user1, substantive, acknowledgement], 'CurrentConversationHydrate');

    expect(result.accepted).toBe(true);
    const visible = gate.getVisible();
    expect(visible.map((m) => m.id)).toEqual(['u1', 'a-substantive-it']);
    expect(visible[1].content).toBe(substantive.content);
  });

  it('keeps the substantive reply when a later Portuguese administrative acknowledgement is present', () => {
    const substantive = {
      role: 'assistant',
      id: 'a-substantive-pt',
      __rawIndex: 1,
      content: 'O mecanismo que se mantém aqui é a evitação que reduz a ansiedade momentaneamente mas reforça o medo.',
      metadata: { status: 'completed' },
    };
    const acknowledgement = {
      role: 'assistant',
      id: 'a-admin-pt',
      __rawIndex: 3,
      content: 'O registro clínico foi atualizado. Se quiser compartilhar como foi, estou aqui.',
    };

    const gate = createSafeUpdateHydrationGate(false);
    const result = gate.commit([user1, substantive, acknowledgement], 'CurrentConversationHydrate');

    expect(result.accepted).toBe(true);
    const visible = gate.getVisible();
    expect(visible.map((m) => m.id)).toEqual(['u1', 'a-substantive-pt']);
    expect(visible[1].content).toBe(substantive.content);
  });

  it('does not classify a long message starting with an ack pattern as administrative', () => {
    // A substantive reply that happens to start with a phrase >320 chars should not be filtered
    const longSubstantive = {
      role: 'assistant',
      id: 'a-long-start',
      __rawIndex: 1,
      content: 'The clinical record has been updated. ' + 'x'.repeat(300),
      metadata: { status: 'completed' },
    };

    const gate = createSafeUpdateHydrationGate(false);
    const result = gate.commit([user1, longSubstantive], 'CurrentConversationHydrate');

    expect(result.accepted).toBe(true);
    const visible = gate.getVisible();
    expect(visible.map((m) => m.id)).toEqual(['u1', 'a-long-start']);
    expect(visible[1].content).toBe(longSubstantive.content);
  });
});
