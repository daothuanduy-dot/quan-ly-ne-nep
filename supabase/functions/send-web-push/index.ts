import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-push-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response(JSON.stringify({error:'POST required'}), {status:405,headers:{...corsHeaders,'Content-Type':'application/json'}});
  const expected = Deno.env.get('QLNN_PUSH_SECRET') || '';
  if (!expected || req.headers.get('x-push-secret') !== expected) return new Response(JSON.stringify({error:'Unauthorized'}), {status:401,headers:{...corsHeaders,'Content-Type':'application/json'}});
  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY') || '';
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY') || '';
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com';
  if (![url,serviceKey,vapidPublic,vapidPrivate].every(Boolean)) return new Response(JSON.stringify({error:'Missing server secrets'}), {status:500,headers:{...corsHeaders,'Content-Type':'application/json'}});
  let body: {title?:string; message?:string; url?:string; account_ids?:string[]; roles?:string[]; tag?:string};
  try { body = await req.json(); } catch { return new Response(JSON.stringify({error:'Invalid JSON'}), {status:400,headers:{...corsHeaders,'Content-Type':'application/json'}}); }
  const supabase = createClient(url, serviceKey, {auth:{persistSession:false}});
  let query = supabase.from('qlnn_push_subscriptions').select('id,account_id,role,subscription');
  if (Array.isArray(body.account_ids) && body.account_ids.length) query = query.in('account_id', body.account_ids);
  if (Array.isArray(body.roles) && body.roles.length) query = query.in('role', body.roles);
  const {data:subs,error} = await query;
  if (error) return new Response(JSON.stringify({error:error.message}), {status:500,headers:{...corsHeaders,'Content-Type':'application/json'}});
  webpush.setVapidDetails(vapidSubject,vapidPublic,vapidPrivate);
  const payload = JSON.stringify({title:body.title || 'THPT Lê Hồng Phong',body:body.message || 'Bạn có thông báo mới.',url:body.url || '/quan-ly-ne-nep/',tag:body.tag});
  let sent=0, failed=0;
  for (const sub of (subs || [])) {
    try {
      await webpush.sendNotification(sub.subscription, payload);
      sent++;
      await supabase.from('qlnn_push_subscriptions').update({last_success_at:new Date().toISOString(),last_error:null}).eq('id',sub.id);
    } catch (e) {
      failed++;
      const status = (e as {statusCode?:number})?.statusCode;
      await supabase.from('qlnn_push_subscriptions').update({last_error:String((e as Error)?.message || e).slice(0,500)}).eq('id',sub.id);
      if (status === 404 || status === 410) await supabase.from('qlnn_push_subscriptions').delete().eq('id',sub.id);
    }
  }
  return new Response(JSON.stringify({ok:true,total:(subs||[]).length,sent,failed}), {status:200,headers:{...corsHeaders,'Content-Type':'application/json'}});
});
