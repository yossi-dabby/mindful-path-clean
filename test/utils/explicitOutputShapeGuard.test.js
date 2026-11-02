import { describe, expect, it } from 'vitest';
import {
  applyAtomicActionGuardToConversationMessages,
  enforceAtomicActionOutput,
  evaluateAtomicActionOutput,
} from '../../src/lib/explicitOutputShapeGuard.js';

function runTurn(userContent, assistantContent, locale = 'en', metadata = {}) {
  const messages = [
    { role: 'user', content: userContent },
    { role: 'assistant', content: assistantContent, metadata, __rawIndex: 1 },
  ];
  return applyAtomicActionGuardToConversationMessages(messages, messages, { locale })[1];
}

describe('final explicit output-shape guard', () => {
  it('collapses an English chained command after all other response text exists', () => {
    const result = runTurn(
      'Give me exactly one physical action and one rationale sentence.',
      'Stand up, walk to the nearest window, and open it for one minute. This creates a small observable completion.',
    );

    expect(result.content).toBe(
      'Open it for one minute. This creates a small observable completion.',
    );
    expect(result.metadata.explicit_output_shape_guard).toMatchObject({
      active: true,
      action_clause_count: 3,
      violation_detected: true,
      replacement_applied: true,
    });
  });

  it('collapses the exact production-observed Hebrew chained command', () => {
    const result = runTurn(
      'תן לי פעולה פיזית אחת בלבד, במשפט אחד, בלי הסבר ובלי שאלה.',
      'קום עכשיו ממקומך, הולך לחלון הקרוב ביותר ופתח אותו לדקה אחת.',
      'he',
    );

    expect(result.content).toBe('פתח אותו לדקה אחת.');
    expect(result.metadata.explicit_output_shape_guard).toMatchObject({
      active: true,
      action_clause_count: 3,
      violation_detected: true,
      replacement_applied: true,
    });
  });

  it.each([
    [
      'es-MX',
      'Propón exactamente una sola acción práctica.',
      'Ponte de pie, camina hasta la ventana y abre la ventana durante un minuto.',
      'Abre la ventana durante un minuto.',
    ],
    [
      'fr-FR',
      'Proposez exactement une seule action pratique.',
      'Levez-vous, marchez jusqu’à la fenêtre et ouvrez-la pendant une minute.',
      'Ouvrez-la pendant une minute.',
    ],
    [
      'de-DE',
      'Nennen Sie genau eine einzige Handlung.',
      'Stehen Sie auf, gehen Sie zum Fenster und öffnen Sie es für eine Minute.',
      'Öffnen Sie es für eine Minute.',
    ],
    [
      'it-IT',
      'Suggerisci esattamente una sola azione pratica.',
      'Alzati, cammina fino alla finestra e apri la finestra per un minuto.',
      'Apri la finestra per un minuto.',
    ],
    [
      'pt-BR',
      'Sugira exatamente uma única ação prática.',
      'Levante-se, caminhe até a janela e abra a janela por um minuto.',
      'Abra a janela por um minuto.',
    ],
  ])('collapses a chained command in %s without changing Hebrew or English behavior', (
    locale,
    userContent,
    assistantContent,
    expectedContent,
  ) => {
    const result = runTurn(userContent, assistantContent, locale);
    expect(result.content).toBe(expectedContent);
    expect(result.metadata.explicit_output_shape_guard).toMatchObject({
      active: true,
      action_clause_count: 3,
      violation_detected: true,
      replacement_applied: true,
    });
  });

  it('recounts after a later correction command and leaves only the last action', () => {
    const result = runTurn(
      'Reply with exactly one action and one rationale sentence.',
      'Write one line on the report. This fits because it creates visible progress. Open the report now.',
    );

    expect(result.content).toBe(
      'Open the report now. This fits because it creates visible progress.',
    );
    expect(evaluateAtomicActionOutput({
      userContent: 'Reply with exactly one action and one rationale sentence.',
      assistantContent: result.content,
    }).actionClauseCount).toBe(1);
  });

  it('does not activate when the constraint exists only in a previous turn', () => {
    const messages = [
      { role: 'user', content: 'Give me exactly one action.' },
      { role: 'assistant', content: 'Open the window.' },
      { role: 'user', content: 'That did not help; help me understand why.' },
      {
        role: 'assistant',
        content: 'Choose one possibility and write it down.',
        metadata: { continuity_summary: 'The user previously requested exactly one action.' },
        __rawIndex: 3,
      },
    ];

    const result = applyAtomicActionGuardToConversationMessages(messages, messages, { locale: 'en' });
    expect(result[3].content).toBe('Choose one possibility and write it down.');
    expect(result[3].metadata.explicit_output_shape_guard).toBeUndefined();
  });

  it.each([
    ['That step was too hard.', 'Choose a smaller task and write its first line.'],
    ['That step was too easy.', 'Open the next task and complete its first section.'],
  ])('preserves ordinary outcome behavior without a current constraint: %s', (user, assistant) => {
    const result = runTurn(user, assistant);
    expect(result.content).toBe(assistant);
    expect(result.metadata.explicit_output_shape_guard).toBeUndefined();
  });

  it('preserves crisis and safety output even with an explicit shape request', () => {
    const assistant = 'Call emergency services now. Contact a trusted person and stay with them.';
    const result = runTurn(
      'I am thinking about suicide right now. Give me exactly one action.',
      assistant,
    );

    expect(result.content).toBe(assistant);
    expect(evaluateAtomicActionOutput({
      userContent: 'I am thinking about suicide right now. Give me exactly one action.',
      assistantContent: assistant,
    })).toMatchObject({
      active: false,
      safetyPrecedence: true,
      violation: false,
    });
  });

  it('does not create an intervention when readiness rules produced explanation only', () => {
    const explanation = 'Let us stay with understanding the pattern before deciding what to do.';
    const result = enforceAtomicActionOutput({
      userContent: 'I am not ready for an exercise. If you answer, use exactly one action only.',
      assistantContent: explanation,
    });

    expect(result.content).toBe(explanation);
    expect(result.diagnostics).toMatchObject({
      active: true,
      action_clause_count: 0,
      violation_detected: false,
      replacement_applied: false,
    });
  });
});
