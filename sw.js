/* Estoque integrado: funciona 100% offline depois da primeira abertura com internet */
const V='estoque-v14-offline';
const CORE=['./','./index.html','./manifest.json','./icon-96.png','./icon-192.png','./icon-512.png'];
const EXTRA=['./planilha-base.xlsx'];

self.addEventListener('install',e=>{
  e.waitUntil((async()=>{
    const c=await caches.open(V);
    await c.addAll(CORE);
    await Promise.all(EXTRA.map(u=>c.add(u).catch(()=>{})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    const ks=await caches.keys();
    await Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

/* abre do cache na hora (sem esperar rede) e atualiza em segundo plano quando houver internet */
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  e.respondWith((async()=>{
    const c=await caches.open(V);
    const alvo=req.mode==='navigate'?'./index.html':req;
    const em=await c.match(alvo,{ignoreSearch:true});
    const rede=fetch(req).then(r=>{if(r&&r.ok&&r.type==='basic')c.put(alvo,r.clone());return r}).catch(()=>null);
    if(em){e.waitUntil(rede);return em}
    const r=await rede;
    if(r)return r;
    return (await c.match('./index.html'))||new Response('Sem conexão',{status:503});
  })());
});

/* alertas de validade: ao tocar na notificação, abre o app */
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window'}).then(l=>l.length?l[0].focus():clients.openWindow('./')))});
