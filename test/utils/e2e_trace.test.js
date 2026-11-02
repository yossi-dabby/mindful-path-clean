import { describe, it, expect } from 'vitest';
import { sanitizeConversationMessagesAligned } from '../../src/components/utils/validateAgentOutput.jsx';

const HE_FORM_URL = '/forms/module-01/adolescents_cbt_specialized_he_01_04.pdf';
const HE_FORM_ID = 'adolescents-cbt-specialized-he-01-04';

describe('E2E mock trace', () => {
  it('plain user message + assistant with generated_files should preserve cards', () => {
    const userMessage = 'אני צריך טופס אחד בעברית ללחץ לפני מבחן';
    const generatedFile = {
      type: 'pdf',
      url: HE_FORM_URL,
      name: 'adolescents_cbt_specialized_he_01_04.pdf',
      title: 'לחץ לפני מבחן',
      description: 'Category: adolescents_cbt_specialized | Clinical: anxiety',
      source: 'therapeutic_forms_library',
      form_id: HE_FORM_ID,
      language: 'he',
      category: 'adolescents_cbt_specialized',
      isCombinedPdf: false,
    };
    
    const messages = [
      { role: 'user', content: userMessage },
      {
        role: 'assistant',
        content: 'הנה טופס אחד בעברית לבקשה שלך.',
        metadata: { generated_files: [generatedFile] },
      },
    ];
    
    const result = sanitizeConversationMessagesAligned(messages, 'he');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    const assistantMsg = result.find(m => m.role === 'assistant');
    console.log('Assistant metadata:', JSON.stringify(assistantMsg?.metadata, null, 2));
    
    expect(assistantMsg).toBeTruthy();
    expect(assistantMsg?.metadata?.generated_files).toBeDefined();
    expect(assistantMsg?.metadata?.generated_files?.length).toBe(1);
  });
  
  it('singular generated_file mock should be preserved', () => {
    const userMessage = 'בקשה לטופס';
    const generatedFile = {
      type: 'pdf',
      url: HE_FORM_URL,
      name: 'adolescents_cbt_specialized_he_01_04.pdf',
      title: 'לחץ לפני מבחן',
      description: 'טופס טיפולי לחרדת מבחנים',
      source: 'therapeutic_forms_library',
      form_id: HE_FORM_ID,
      language: 'he',
      category: 'adolescents_cbt_specialized',
      isCombinedPdf: false,
    };
    
    const messages = [
      { role: 'user', content: userMessage },
      {
        role: 'assistant',
        content: 'הנה טופס מתאים.',
        metadata: { generated_file: generatedFile },
      },
    ];
    
    const result = sanitizeConversationMessagesAligned(messages, 'he');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    const assistantMsg = result.find(m => m.role === 'assistant');
    expect(assistantMsg?.metadata?.generated_file).toBeDefined();
  });
});
