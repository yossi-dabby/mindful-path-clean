import {prepareTools,inspect} from '../../stage5/helpers/toolsStage5';
export {inspect};
export async function prepareShared(page,language='en',theme='light',role='user') {
 const state=await prepareTools(page,language,theme,true,true);
 const user={id:'test-user-123',email:'test@example.com',full_name:language==='he'?'משתמש דוגמה בלבד ABC 123':'Synthetic QA user אבג 123',role,onboarding_completed:true,preferences:{language,theme:'default',notifications:{dailyReminders:false},emailNotifications:{emailCritical:true},data_retention_days:365,dashboardLayout:'default',keep:'preserve-synthetic-preference'}};
 const profileWrites=[];const calls=[];
 await page.route(/\/entities\/User\/(?:me|test-user-123)(?:\?|$)/,async route=>{
  if(route.request().method()!=='GET'){const body=route.request().postDataJSON();profileWrites.push(body);Object.assign(user,body);}
  return route.fulfill({json:user});
 });
 Object.assign(state.db,{Subscription:[{id:'qa-sub',created_by:user.email,plan_type:'free',status:'trial'}],UserPoints:[{id:'qa-points',total_points:0}],TrustedCBTChunk:[{id:'qa-chunk',title:'Synthetic QA chunk אבג 123',content:'Synthetic QA shared content only.',topic:'qa',language,is_active:true,priority_score:1,tags:['QA']}],CrisisAlert:[]});
 await page.route(/\/functions\/(exportMyData|deleteMyAccount|adminFeatureFlags)(?:\?|$)/,async route=>{
  const name=new URL(route.request().url()).pathname.split('/').at(-1);calls.push({name,body:route.request().postDataJSON()});
  return route.fulfill({json:name==='exportMyData'?{exported_at:'2026-10-29',profile:{id:user.id,preferences:user.preferences},records:[]}:name==='adminFeatureFlags'?{flags:{THERAPIST_UPGRADE_ENABLED:false,THERAPIST_UPGRADE_MEMORY_ENABLED:false,THERAPIST_UPGRADE_WORKFLOW_ENABLED:false}}:{success:true}});
 });
 return {...state,user,profileWrites,calls};
}
export const routes=['Settings','login','register','forgot-password','reset-password','reset-password?token=qa-synthetic-token','about','privacy','terms','contact','account-deletion','data-deletion','stage6-missing-ABC-123','pdf-viewer','KnowledgeStudio','AdminFeatureFlags','TherapistTraining'];
export const pageRoot=(page,route='')=>route==='pdf-viewer'?page.locator('#root > div.fixed.flex-col'):page.locator('#root');
