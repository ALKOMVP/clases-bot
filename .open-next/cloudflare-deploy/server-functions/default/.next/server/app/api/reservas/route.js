"use strict";(()=>{var a={};a.id=961,a.ids=[961],a.modules={261:a=>{a.exports=require("next/dist/shared/lib/router/utils/app-paths")},846:a=>{a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},3033:a=>{a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},3295:a=>{a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},4870:a=>{a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},4898:(a,b,c)=>{c.r(b),c.d(b,{handler:()=>F,patchFetch:()=>E,routeModule:()=>A,serverHooks:()=>D,workAsyncStorage:()=>B,workUnitAsyncStorage:()=>C});var d={};c.r(d),c.d(d,{DELETE:()=>z,GET:()=>x,POST:()=>y});var e=c(6559),f=c(8088),g=c(7719),h=c(6191),i=c(1289),j=c(261),k=c(2603),l=c(9893),m=c(4823),n=c(7220),o=c(6946),p=c(7912),q=c(9786),r=c(6143),s=c(6439),t=c(3365),u=c(2190),v=c(9949),w=c(857);async function x(a){console.log("[GET /api/reservas] Starting request",{environment:(0,w.cR)().environment});try{let b=null,c=globalThis[Symbol.for("__cloudflare-context__")];if(c?.env?.DB&&(b=c.env.DB,console.log("[GET /api/reservas] DB obtained from Cloudflare context (OpenNext)")),!b&&"undefined"!=typeof process&&process.env.DB&&(b=process.env.DB,console.log("[GET /api/reservas] DB obtained from process.env.DB (OpenNext fallback)")),b||(b=(0,v.O)(),console.log("[GET /api/reservas] Using mock DB as fallback")),!b)return u.NextResponse.json({error:"Base de datos no disponible"},{status:503});let{searchParams:d}=new URL(a.url),e=d.get("usuario_id"),f=d.get("clase_id"),g=d.get("fecha_clase"),h="true"===d.get("include_reasignaciones"),i=`
      SELECT r.*, u.nombre, u.apellido, u.telefono, c.dia, c.hora, c.nombre as clase_nombre
      FROM reserva r
      JOIN usuario u ON r.usuario_id = u.id
      JOIN clase c ON r.clase_id = c.id
      WHERE u.activo = 1
    `,j=[],k=[];e&&(j.push("r.usuario_id = ?"),k.push(e)),f&&(j.push("r.clase_id = ?"),k.push(f)),g?(j.push("(r.fecha_clase IS NULL OR r.fecha_clase = 'null' OR r.fecha_clase = '' OR r.fecha_clase = ?)"),k.push(g),j.push(`NOT EXISTS (
        SELECT 1 FROM cancelacion c
        WHERE c.usuario_id = r.usuario_id 
          AND c.clase_id = r.clase_id 
          AND c.fecha_clase = ?
          AND (r.fecha_clase IS NULL OR r.fecha_clase = 'null' OR r.fecha_clase = '')
          AND (r.es_reasignacion IS NULL OR r.es_reasignacion = 0 OR r.es_reasignacion = '0')
      )`),k.push(g)):h||j.push("(r.fecha_clase IS NULL OR r.fecha_clase = 'null' OR r.fecha_clase = '' OR r.es_reasignacion = 0 OR r.es_reasignacion IS NULL)"),j.length>0&&(i+=" AND "+j.join(" AND "));let l={Lun:1,Mar:2,Jue:3,Sab:4};i+=" ORDER BY c.dia, c.hora, u.apellido, u.nombre";let m=[];try{let a=b.prepare(i);m=(k.length>0?await a.bind(...k).all():await a.all()).results||[]}catch(a){console.error("[GET /api/reservas] Error ejecutando query:",a),m=[]}return m.sort((a,b)=>{let c=l[a.dia]||99,d=l[b.dia]||99;return c!==d?c-d:a.hora.localeCompare(b.hora)}),console.log("[GET /api/reservas] Success",{count:m.length}),u.NextResponse.json(m)}catch(a){return(0,w.WX)(a,"Error al obtener reservas",{route:"/api/reservas",method:"GET",operation:"fetch_reservas"})}}async function y(a){console.log("[POST /api/reservas] Starting request",{environment:(0,w.cR)().environment});try{let b=null,c=globalThis[Symbol.for("__cloudflare-context__")];if(c?.env?.DB&&(b=c.env.DB,console.log("[POST /api/reservas] DB obtained from Cloudflare context (OpenNext)")),!b)return console.error("[POST /api/reservas] DB not available in production"),u.NextResponse.json({error:"Base de datos no disponible",details:"El binding de D1 no est\xe1 configurado correctamente"},{status:503});if(!b)return u.NextResponse.json({error:"Base de datos no disponible"},{status:503});let{usuario_id:d,clase_id:e}=await a.json();if(!d||!e)return u.NextResponse.json({error:"Faltan campos requeridos"},{status:400});let f=await b.prepare("SELECT id, activo FROM usuario WHERE id = ?").bind(d).first();if(!f)return u.NextResponse.json({error:"El alumno no existe",code:"USUARIO_NO_EXISTE"},{status:400});if(!f.activo||0===f.activo)return u.NextResponse.json({error:"No se pueden inscribir alumnos desactivados a clases",code:"USUARIO_DESACTIVADO"},{status:400});if(await b.prepare("SELECT * FROM reserva WHERE usuario_id = ? AND clase_id = ?").bind(d,e).first())return u.NextResponse.json({error:"El alumno ya est\xe1 inscrito en esta clase",code:"ALREADY_ENROLLED"},{status:400});return await b.prepare("INSERT INTO reserva (usuario_id, clase_id) VALUES (?, ?)").bind(d,e).run(),console.log("[POST /api/reservas] Success",{usuario_id:d,clase_id:e}),u.NextResponse.json({success:!0})}catch(a){return(0,w.WX)(a,"Error al crear reserva",{route:"/api/reservas",method:"POST",operation:"create_reserva"})}}async function z(a){console.log("[DELETE /api/reservas] Starting request",{environment:(0,w.cR)().environment});try{let b=null,c=globalThis[Symbol.for("__cloudflare-context__")];if(c?.env?.DB&&(b=c.env.DB,console.log("[DELETE /api/reservas] DB obtained from Cloudflare context (OpenNext)")),!b&&"undefined"!=typeof process&&process.env.DB&&(b=process.env.DB,console.log("[DELETE /api/reservas] DB obtained from process.env.DB (OpenNext fallback)")),b||(b=(0,v.O)(),console.log("[DELETE /api/reservas] Using mock DB as fallback")),!b)return u.NextResponse.json({error:"Base de datos no disponible"},{status:503});let{searchParams:d}=new URL(a.url),e=d.get("usuario_id"),f=d.get("clase_id"),g=d.get("fecha_clase");if(!e||!f)return u.NextResponse.json({error:"Usuario ID y Clase ID requeridos"},{status:400});let h="string"==typeof f?parseInt(f,10):f,i=g;if(g){if(await b.prepare(`
        SELECT * FROM reserva 
        WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
      `).bind(e,f,g).first()){let a=await b.prepare(`
          DELETE FROM reserva 
          WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
        `).bind(e,f,g).run();console.log("[DELETE /api/reservas] Reserva temporal eliminada",{usuario_id:e,clase_id:f,fecha_clase:g,changes:a?.meta?.changes||0})}else if(await b.prepare(`
          SELECT * FROM reserva 
          WHERE usuario_id = ? AND clase_id = ? 
            AND (fecha_clase IS NULL OR fecha_clase = 'null' OR fecha_clase = '')
            AND (es_reasignacion IS NULL OR es_reasignacion = 0)
        `).bind(e,f).first()){console.log("[DELETE /api/reservas] \uD83D\uDD0D Reserva fija existe, creando cancelaci\xf3n para fecha espec\xedfica:",{usuario_id:e,tipo_usuario_id:typeof e,clase_id:f,tipo_clase_id:typeof f,fecha_clase:g});try{let a=Number(e),c=Number(f);try{await b.prepare("SELECT 1 FROM cancelacion LIMIT 1").first()}catch(a){a.message&&a.message.includes("no such table")&&(console.log("[DELETE /api/reservas] Tabla cancelacion no existe, cre\xe1ndola..."),await b.prepare(`
                  CREATE TABLE IF NOT EXISTS cancelacion (
                    usuario_id INTEGER NOT NULL,
                    clase_id INTEGER NOT NULL,
                    fecha_clase TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    PRIMARY KEY (usuario_id, clase_id, fecha_clase),
                    FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
                    FOREIGN KEY (clase_id) REFERENCES clase(id) ON DELETE CASCADE
                  )
                `).run(),console.log("[DELETE /api/reservas] ✅ Tabla cancelacion creada"))}let d=await b.prepare(`
              SELECT * FROM cancelacion
              WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
            `).bind(a,c,g).first();if(d)console.log("[DELETE /api/reservas] ⚠️ Cancelaci\xf3n ya existe para esta combinaci\xf3n:",d);else{let d=await b.prepare(`
                INSERT INTO cancelacion (usuario_id, clase_id, fecha_clase, created_at)
                VALUES (?, ?, ?, datetime('now'))
              `).bind(a,c,g).run();console.log("[DELETE /api/reservas] ✅ Cancelaci\xf3n creada exitosamente para reserva fija",{usuario_id:a,clase_id:c,fecha_clase:g,changes:d?.meta?.changes||0,lastRowId:d?.meta?.last_row_id});let e=await b.prepare(`
                SELECT * FROM cancelacion
                WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
              `).bind(a,c,g).first();e?console.log("[DELETE /api/reservas] ✅ Verificaci\xf3n: Cancelaci\xf3n existe en BD",e):console.error("[DELETE /api/reservas] ❌ ERROR: Cancelaci\xf3n NO se encontr\xf3 despu\xe9s de crearla")}}catch(a){console.error("[DELETE /api/reservas] ❌ ERROR al crear cancelaci\xf3n:",{message:a.message,stack:a.stack,usuario_id:e,clase_id:f,fecha_clase:g})}console.log("[DELETE /api/reservas] Cancelaci\xf3n creada, verificando lista de espera para esta fecha")}else console.log("[DELETE /api/reservas] No se encontr\xf3 reserva temporal ni fija para eliminar");i=g}else await b.prepare(`
        DELETE FROM reserva 
        WHERE usuario_id = ? AND clase_id = ? 
          AND (fecha_clase IS NULL OR fecha_clase = 'null' OR fecha_clase = '')
          AND (es_reasignacion IS NULL OR es_reasignacion = 0)
      `).bind(e,f).run(),i=null;if(console.log("[DELETE /api/reservas] Reserva eliminada",{usuario_id:e,clase_id:f,fecha_clase:g}),i)try{let a=await b.prepare(`
          SELECT COUNT(DISTINCT r.usuario_id) as count
          FROM reserva r
          WHERE r.clase_id = ? 
            AND (r.fecha_clase IS NULL OR r.fecha_clase = 'null' OR r.fecha_clase = '')
            AND (r.es_reasignacion IS NULL OR r.es_reasignacion = 0)
            AND NOT EXISTS (
              SELECT 1 FROM cancelacion c
              WHERE c.usuario_id = r.usuario_id 
                AND c.clase_id = r.clase_id 
                AND c.fecha_clase = ?
            )
        `).bind(h,i).first(),c=a?.count||0,d=await b.prepare(`
          SELECT COUNT(DISTINCT usuario_id) as count
          FROM reserva
          WHERE clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
        `).bind(h,i).first(),e=d?.count||0,g=c+e,j=35-g;if(console.log("[DELETE /api/reservas] Cupo despu\xe9s de eliminaci\xf3n",{countFijas:c,countTemporales:e,totalConfirmados:g,cupoDisponible:j,cupoMaximo:35}),j>0){console.log("[DELETE /api/reservas] ✅ Hay cupo disponible, buscando primer usuario en lista de espera..."),console.log("[DELETE /api/reservas] Par\xe1metros de b\xfasqueda:",{claseIdNum:h,tipo_claseIdNum:typeof h,fechaClaseParaLista:i,tipo_fechaClase:typeof i});let a=await b.prepare(`
            SELECT * FROM lista_espera
            WHERE clase_id = ? AND fecha_clase = ?
            ORDER BY numero ASC
            LIMIT 1
          `).bind(h,i).first();if(a||(console.log("[DELETE /api/reservas] No encontrado con n\xfamero, intentando con string..."),a=await b.prepare(`
              SELECT * FROM lista_espera
              WHERE clase_id = ? AND fecha_clase = ?
              ORDER BY numero ASC
              LIMIT 1
            `).bind(f,i).first()),console.log("[DELETE /api/reservas] Resultado de b\xfasqueda en lista_espera:",a?"ENCONTRADO":"NO ENCONTRADO",a),a){let c=a.usuario_id,d=a.numero;console.log("[DELETE /api/reservas] ✅ Usuario encontrado en lista de espera",{usuario_id:c,tipo_usuario_id:typeof c,clase_id:h,tipo_clase_id:typeof h,fecha_clase:i,numero_en_lista:d,cupo_disponible:j});let e=await b.prepare(`
              SELECT * FROM reserva 
              WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
            `).bind(c,h,i).first();if(console.log("[DELETE /api/reservas] Verificando si usuario ya tiene reserva:",e?"S\xcd tiene reserva":"NO tiene reserva"),e){console.log("[DELETE /api/reservas] ⚠️ El usuario en lista de espera ya tiene reserva, eliminando de lista de espera"),await b.prepare(`
                DELETE FROM lista_espera
                WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
              `).bind(c,h,i).run();let a=(await b.prepare(`
                SELECT * FROM lista_espera
                WHERE clase_id = ? AND fecha_clase = ?
                ORDER BY numero ASC
              `).bind(h,i).all()).results||[];for(let c=0;c<a.length;c++)await b.prepare(`
                  UPDATE lista_espera
                  SET numero = ?
                  WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
                `).bind(c+1,a[c].usuario_id,h,i).run()}else{console.log("[DELETE /api/reservas] \uD83C\uDFAF Creando reserva temporal para usuario promovido..."),console.log("[DELETE /api/reservas] Valores para INSERT:",{usuario_id:c,tipo_usuario_id:typeof c,clase_id:h,tipo_clase_id:typeof h,fecha_clase:i,tipo_fecha_clase:typeof i});try{let a=await b.prepare(`
                  INSERT INTO reserva (usuario_id, clase_id, fecha_clase, es_reasignacion, created_at)
                  VALUES (?, ?, ?, 1, datetime('now'))
                `).bind(c,h,i).run();console.log("[DELETE /api/reservas] ✅ Reserva temporal creada exitosamente",{usuario_id:c,clase_id:h,fecha_clase:i,insertChanges:a?.meta?.changes||0,lastRowId:a?.meta?.last_row_id}),await b.prepare(`
                  SELECT * FROM reserva 
                  WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
                `).bind(c,h,i).first()?console.log("[DELETE /api/reservas] ✅ Verificaci\xf3n: Reserva temporal existe en BD"):console.error("[DELETE /api/reservas] ❌ ERROR: Reserva temporal NO se cre\xf3 correctamente");let d=await b.prepare(`
                  DELETE FROM lista_espera
                  WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
                `).bind(c,h,i).run();console.log("[DELETE /api/reservas] ✅ Eliminado de lista de espera",{deleteChanges:d?.meta?.changes||0}),await b.prepare(`
                  SELECT * FROM lista_espera
                  WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
                `).bind(c,h,i).first()?console.error("[DELETE /api/reservas] ❌ ERROR: Usuario todav\xeda est\xe1 en lista_espera"):console.log("[DELETE /api/reservas] ✅ Verificaci\xf3n: Usuario eliminado correctamente de lista_espera");let e=(await b.prepare(`
                  SELECT * FROM lista_espera
                  WHERE clase_id = ? AND fecha_clase = ?
                  ORDER BY numero ASC
                `).bind(h,i).all()).results||[];console.log("[DELETE /api/reservas] Reordenando",e.length,"usuarios restantes en lista de espera...");for(let a=0;a<e.length;a++)await b.prepare(`
                    UPDATE lista_espera
                    SET numero = ?
                    WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
                  `).bind(a+1,e[a].usuario_id,h,i).run();console.log("[DELETE /api/reservas] ✅ Usuario promovido exitosamente de lista de espera a temporal confirmado",{usuario_id:c,usuarios_restantes_en_lista:e.length,cupo_disponible_antes:j,cupo_disponible_despues:j-1})}catch(a){throw console.error("[DELETE /api/reservas] ❌ ERROR al crear reserva temporal:",a.message),console.error("[DELETE /api/reservas] Stack:",a.stack),a}}}else console.log("[DELETE /api/reservas] ℹ️ No hay nadie en lista de espera para esta clase y fecha")}else console.log("[DELETE /api/reservas] ⚠️ No hay cupo disponible despu\xe9s de eliminar (total:",g,">=",35,"), no se puede promover")}catch(a){console.error("[DELETE /api/reservas] Error al procesar lista de espera despu\xe9s de eliminar reserva:",a.message)}let j={success:!0};if(i)try{let a=await b.prepare(`
          SELECT COUNT(DISTINCT usuario_id) as count
          FROM reserva
          WHERE clase_id = ? AND (fecha_clase IS NULL OR fecha_clase = 'null' OR fecha_clase = '')
            AND (es_reasignacion IS NULL OR es_reasignacion = 0)
        `).bind(h).first(),c=await b.prepare(`
          SELECT COUNT(DISTINCT usuario_id) as count
          FROM reserva
          WHERE clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
        `).bind(h,i).first(),d=await b.prepare(`
          SELECT COUNT(*) as count
          FROM lista_espera
          WHERE clase_id = ? AND fecha_clase = ?
        `).bind(h,i).first().catch(()=>({count:0}));j.cupoFinal={fijas:a?.count||0,temporales:c?.count||0,enListaEspera:d?.count||0,totalConfirmados:(a?.count||0)+(c?.count||0)}}catch(a){console.error("[DELETE /api/reservas] Error obteniendo estado final:",a)}return console.log("[DELETE /api/reservas] Success",{usuario_id:e,clase_id:f,fecha_clase:g,respuesta:j}),u.NextResponse.json(j)}catch(a){return(0,w.WX)(a,"Error al eliminar reserva",{route:"/api/reservas",method:"DELETE",operation:"delete_reserva"})}}let A=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/reservas/route",pathname:"/api/reservas",filename:"route",bundlePath:"app/api/reservas/route"},distDir:".next",projectDir:"",resolvedPagePath:"/Users/alko/clases-bot/app/api/reservas/route.ts",nextConfigOutput:"standalone",userland:d}),{workAsyncStorage:B,workUnitAsyncStorage:C,serverHooks:D}=A;function E(){return(0,g.patchFetch)({workAsyncStorage:B,workUnitAsyncStorage:C})}async function F(a,b,c){var d;let e="/api/reservas/route";"/index"===e&&(e="/");let g=await A.prepare(a,b,{srcPage:e,multiZoneDraftMode:"false"});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:u,params:v,nextConfig:w,isDraftMode:x,prerenderManifest:y,routerServerContext:z,isOnDemandRevalidate:B,revalidateOnlyGenerated:C,resolvedPathname:D}=g,E=(0,j.normalizeAppPath)(e),F=!!(y.dynamicRoutes[E]||y.routes[D]);if(F&&!x){let a=!!y.routes[D],b=y.dynamicRoutes[E];if(b&&!1===b.fallback&&!a)throw new s.NoFallbackError}let G=null;!F||A.isDev||x||(G="/index"===(G=D)?"/":G);let H=!0===A.isDev||!F,I=F&&!H,J=a.method||"GET",K=(0,i.getTracer)(),L=K.getActiveScopeSpan(),M={params:v,prerenderManifest:y,renderOpts:{experimental:{dynamicIO:!!w.experimental.dynamicIO,authInterrupts:!!w.experimental.authInterrupts},supportsDynamicResponse:H,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=w.experimental)?void 0:d.cacheLife,isRevalidate:I,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>A.onRequestError(a,b,d,z)},sharedContext:{buildId:u}},N=new k.NodeNextRequest(a),O=new k.NodeNextResponse(b),P=l.NextRequestAdapter.fromNodeNextRequest(N,(0,l.signalFromNodeResponse)(b));try{let d=async c=>A.handle(P,M).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=K.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${J} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${J} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&B&&C&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=M.renderOpts.fetchMetrics;let i=M.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=M.renderOpts.collectedTags;if(!F)return await (0,o.I)(N,O,e,M.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,d=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:t.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await A.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:B})},z),b}},l=await A.handleResponse({req:a,nextConfig:w,cacheKey:G,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:y,isRoutePPREnabled:!1,isOnDemandRevalidate:B,revalidateOnlyGenerated:C,responseGenerator:k,waitUntil:c.waitUntil});if(!F)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==t.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",B?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),x&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&F||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(N,O,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};L?await g(L):await K.withPropagatedContext(a.headers,()=>K.trace(m.BaseServerSpan.handleRequest,{spanName:`${J} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":J,"http.target":a.url}},g))}catch(b){if(L||b instanceof s.NoFallbackError||await A.onRequestError(a,b,{routerKind:"App Router",routePath:E,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:B})}),F)throw b;return await (0,o.I)(N,O,new Response(null,{status:500})),null}}},6439:a=>{a.exports=require("next/dist/shared/lib/no-fallback-error.external")},9294:a=>{a.exports=require("next/dist/server/app-render/work-async-storage.external.js")}};var b=require("../../../webpack-runtime.js");b.C(a);var c=b.X(0,[431,55,305],()=>b(b.s=4898));module.exports=c})();