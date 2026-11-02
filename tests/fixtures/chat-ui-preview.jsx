// Test-only fixtures. These are not routes or production app modules.
import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import MessageBubble from '../../src/components/chat/MessageBubble';
import SessionSummary from '../../src/components/chat/SessionSummary';
import InlineConsentBanner from '../../src/components/chat/InlineConsentBanner';
import TherapyStateMachine from '../../src/components/chat/TherapyStateMachine';
import ThoughtWorkSaveHandler from '../../src/components/chat/ThoughtWorkSaveHandler';
import ConversationsList from '../../src/components/chat/ConversationsList';
let previousRoot;
export function renderChatFixture(kind='message') {
 previousRoot?.unmount();document.querySelector('#synthetic-message-fixture')?.remove();
 const host=document.createElement('div');host.id='synthetic-message-fixture';host.className='bg-card text-foreground';host.style.cssText='position:fixed;inset:0;z-index:200;overflow:auto;padding:16px';document.body.append(host);
 const noop=()=>{};
 const content={
  message:<><MessageBubble message={{role:'user',content:'I would like to plan one small step.'}}/><MessageBubble conversationId="synthetic-only" messageIndex={0} showFeedback message={{id:'synthetic-assistant',role:'assistant',content:'A small practice for today.',metadata:{feedback_finality_verified:true,generated_file:{type:'pdf',url:'/forms/sample.pdf',name:'sample.pdf',title:'A short reflection worksheet',description:'Sample worksheet for visual review only.'}}}}/></>,
  summary:<SessionSummary conversation={{session_summary:'We chose one small, achievable step for today.',suggested_exercises:[]}}/>,
  consent:<InlineConsentBanner onAccept={noop}/>,
  flow:<TherapyStateMachine onComplete={noop}/>,
  save:<ThoughtWorkSaveHandler conversationId="synthetic-only" conversationMessages={[]} onCancel={noop} onSaveComplete={noop}/>,
  sidebar:<div style={{height:'calc(100dvh - 32px)',maxWidth:320}}><ConversationsList conversations={[{id:'synthetic-only',metadata:{name:'One small step for today'},created_date:'2026-10-27T08:00:00Z'},{id:'synthetic-two',metadata:{name:'Another sample session'},created_date:'2026-10-26T08:00:00Z'}]} currentConversationId="synthetic-only" onSelectConversation={noop} onNewConversation={noop} onDeleteConversation={noop} onClose={noop}/></div>
 }[kind];
 // Portals must appear above this test overlay, just as they do above the app.
 previousRoot=createRoot(host);previousRoot.render(<BrowserRouter><QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><style>{'[data-radix-popper-content-wrapper] { z-index: 210 !important; }'}</style>{content}</QueryClientProvider></BrowserRouter>);
}
