import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import MessageBubble from '../../src/components/chat/MessageBubble';
import AgeGateModal from '../../src/components/utils/AgeGateModal';
import ThoughtWorkSaveHandler from '../../src/components/chat/ThoughtWorkSaveHandler';
import AgeRestrictedMessage from '../../src/components/utils/AgeRestrictedMessage';
import InlineConsentBanner from '../../src/components/chat/InlineConsentBanner';

export function renderStage2Fixture(kind) {
 document.querySelector('#root').style.display='none';
 const host=document.createElement('div');host.id='stage2-fixture';host.className='bg-background text-foreground';host.style.cssText='position:fixed;inset:0;z-index:1;overflow:auto;padding:12px';document.body.append(host);
 const noop=()=>{};
 const content={
  attachment:<MessageBubble conversationId="qa-only" messageIndex={0} message={{role:'user',content:'QA attachment',metadata:{attachment:{url:'https://example.invalid/qa.pdf',name:'QA-file-with-an-extremely-long-name-for-small-screens.pdf',type:'pdf',mime_type:'pdf'}}}}/>,
  restricted:<AgeRestrictedMessage/>,
  generic:<MessageBubble conversationId="qa-only" messageIndex={0} message={{role:'user',content:'QA text attachment',metadata:{attachment:{url:'https://example.invalid/qa.txt',name:'QA-notes.txt',type:'file'}}}}/>,
  age:<AgeGateModal onConfirm={noop} onDecline={noop}/>,
  save:<ThoughtWorkSaveHandler conversationId="qa-only" conversationMessages={[{role:'user',content:'Synthetic thought for UI testing only.'}]} onCancel={noop} onSaveComplete={noop}/>,
  consent:<InlineConsentBanner onAccept={noop}/>,
 }[kind];
 createRoot(host).render(<BrowserRouter><QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>{content}</QueryClientProvider></BrowserRouter>);
}
