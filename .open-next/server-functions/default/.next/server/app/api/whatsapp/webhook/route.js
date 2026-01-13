(()=>{var a={};a.id=274,a.ids=[274],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},3033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},4870:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},6439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")},6487:()=>{},6640:(a,b,c)=>{"use strict";c.r(b),c.d(b,{handler:()=>Y,patchFetch:()=>X,routeModule:()=>T,serverHooks:()=>W,workAsyncStorage:()=>U,workUnitAsyncStorage:()=>V});var d={};c.r(d),c.d(d,{GET:()=>R,POST:()=>S});var e=c(6559),f=c(8088),g=c(7719),h=c(6191),i=c(1289),j=c(261),k=c(2603),l=c(9893),m=c(4823),n=c(7220),o=c(6946),p=c(7912),q=c(9786),r=c(6143),s=c(6439),t=c(3365),u=c(2190);let v=process.env.WHATSAPP_TOKEN||"",w=process.env.PHONE_NUMBER_ID||"",x=process.env.VERIFY_TOKEN||"";function y(a,b){try{let[c,d,e]=a.split("-").map(a=>parseInt(a,10)),[f,g]=b.split(":").map(a=>parseInt(a,10));if(!c||!d||!e||Number.isNaN(f)||Number.isNaN(g))return null;return Date.UTC(c,d-1,e,f+3,g,0,0)}catch{return null}}function z(a,b){let c=y(a,b);return!!c&&Date.now()<c-36e5}async function A(a){if(!v||!w)return!1;let b=function(){let a=(process.env.WHATSAPP_CONFIRMAR_RESERVA_TEMPLATE||process.env.WHATSAPP_TEMPLATE_NAME||"").trim();return a&&"hello_world"!==a?a:"confirmar_reserva"}();for(let c of function(){let a=[(process.env.WHATSAPP_TEMPLATE_LANG||"").trim(),"es_AR","es","es_ES"].filter(Boolean),b=new Set;return a.filter(a=>!b.has(a)&&(b.add(a),!0))}())try{let d=await fetch(`https://graph.facebook.com/v18.0/${w}/messages`,{method:"POST",headers:{Authorization:`Bearer ${v}`,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",to:a,type:"template",template:{name:b,language:{code:c}}})});if(d.ok)return!0;let e=await d.text();console.error("[enviarTemplateConfirmarReserva] Error",{status:d.status,to:a,templateName:b,lang:c,body:e})}catch(a){console.error("[enviarTemplateConfirmarReserva] Exception",a?.message||a)}return!1}async function B(a,b,c){let d=null;try{d=await a.prepare(`
      SELECT * FROM lista_espera
      WHERE clase_id = ? AND fecha_clase = ?
      ORDER BY numero ASC
      LIMIT 1
    `).bind(b,c).first()}catch{return}if(!d)return;let e=await a.prepare(`
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
  `).bind(b,c).first(),f=Number(e?.count||0),g=await a.prepare(`
    SELECT COUNT(DISTINCT usuario_id) as count
    FROM reserva
    WHERE clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
  `).bind(b,c).first();if(f+Number(g?.count||0)>=35)return;let h=Number(d.usuario_id),i=await a.prepare(`
    SELECT * FROM reserva
    WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
  `).bind(h,b,c).first();await a.prepare("DELETE FROM lista_espera WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?").bind(h,b,c).run(),i||await a.prepare(`
      INSERT INTO reserva (usuario_id, clase_id, fecha_clase, es_reasignacion, created_at)
      VALUES (?, ?, ?, 1, datetime('now'))
    `).bind(h,b,c).run();let j=(await a.prepare(`
    SELECT * FROM lista_espera
    WHERE clase_id = ? AND fecha_clase = ?
    ORDER BY numero ASC
  `).bind(b,c).all().catch(()=>({results:[]}))).results||[];for(let d=0;d<j.length;d++)await a.prepare(`
      UPDATE lista_espera SET numero = ?
      WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
    `).bind(d+1,j[d].usuario_id,b,c).run();let k=await a.prepare("SELECT telefono FROM usuario WHERE id = ?").bind(h).first(),l=function(a){let b=C(a);if(!b)return"";let c=b;return c.startsWith("0")&&(c=c.slice(1)),c.startsWith("54")&&!c.startsWith("549")&&(c="549"+c.slice(2)),c.startsWith("54")||10!==c.length&&11!==c.length||(c="549"+c),c}(k?.telefono?String(k.telefono):"");l&&await A(l)}function C(a){return a.replace(/\D/g,"")}function D(a,b=8){let c=C(a);return c.length<b?c:c.slice(-b)}async function E(a,b){try{let c=D(b,8);console.log("[getUsuarioPorTelefono] Buscando usuario con \xfaltimos 8 d\xedgitos:",c,"del tel\xe9fono:",b);let d=await a.prepare("SELECT * FROM usuario WHERE activo = 1").all();for(let a of d?.results||[])if(a.telefono&&D(a.telefono,8)===c)return console.log("[getUsuarioPorTelefono] Usuario encontrado:",a.id,a.nombre,a.apellido),a;return console.log("[getUsuarioPorTelefono] No se encontr\xf3 usuario con \xfaltimos 8 d\xedgitos:",c),null}catch(a){return console.error("[getUsuarioPorTelefono] Error:",a),null}}async function F(a,b){try{let c=await a.prepare(`
      SELECT r.*, c.dia, c.hora, c.nombre
      FROM reserva r
      JOIN clase c ON r.clase_id = c.id
      WHERE r.usuario_id = ? 
        AND (r.fecha_clase IS NULL OR r.fecha_clase = '' OR r.fecha_clase = 'null')
        AND (r.es_reasignacion IS NULL OR r.es_reasignacion = 0)
      ORDER BY c.dia, c.hora
    `).bind(b).all(),d=c?.results||[],e=new Date;e.setHours(0,0,0,0);let f=[],g={Lun:1,Mar:2,Jue:4,Sab:6};for(let c of d){let d=g[c.dia];if(!d)continue;let h=new Date(e),i=h.getDay(),j=d-i;if(0===j){let a=String(c.hora||"");if(a){let b=h.toISOString().split("T")[0],c=y(b,a);c&&c<Date.now()&&(j=7)}else j=7}else j<0&&(j+=7);for(let d=0;d<3;d++){let e=new Date(h);e.setDate(h.getDate()+j+7*d),await a.prepare(`
          SELECT * FROM cancelacion
          WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
        `).bind(b,c.clase_id,e.toISOString().split("T")[0]).first()||f.push({fecha:e,clase:c,reserva:c})}}return f.sort((a,b)=>a.fecha.getTime()-b.fecha.getTime()),f}catch(a){return console.error("[getProximasClases] Error:",a),[]}}async function G(a,b){let c=[],d=await a.prepare(`
    SELECT r.*, c.dia, c.hora, c.nombre
    FROM reserva r
    JOIN clase c ON r.clase_id = c.id
    WHERE r.usuario_id = ?
      AND r.es_reasignacion = 1
      AND r.fecha_clase IS NOT NULL AND r.fecha_clase != '' AND r.fecha_clase != 'null'
      AND date(r.fecha_clase) >= date('now')
    ORDER BY r.fecha_clase ASC, c.hora ASC
  `).bind(b).all();for(let a of d?.results||[]){let b=String(a.fecha_clase||""),d=String(a.hora||"");b&&d&&z(b,d)&&c.push({fecha:new Date(b),clase:a,reserva:a,esTemporal:!0})}for(let d of(await F(a,b)))z(d.fecha.toISOString().split("T")[0],d.clase?.hora||"")&&c.push({fecha:d.fecha,clase:d.clase,reserva:d.reserva,esTemporal:!1});c.sort((a,b)=>{let c=a.fecha.getTime()-b.fecha.getTime();return 0!==c?c:String(a.clase?.hora||"").localeCompare(String(b.clase?.hora||""))});let e=new Set,f=[];for(let a of c){let b=Number(a.reserva?.clase_id??a.clase?.clase_id??a.clase?.id),c=a.fecha.toISOString().split("T")[0],d=`${b}_${c}`;if(!e.has(d)&&(e.add(d),f.push(a),f.length>=3))break}return f}function H(a,b){let c=["Domingo","Lunes","Martes","Mi\xe9rcoles","Jueves","Viernes","S\xe1bado"][a.getDay()],d=a.getDate(),e=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"][a.getMonth()];return`${c} ${b} - ${d} de ${e}`}async function I(a,b,c,d){try{let e=await fetch(`https://graph.facebook.com/v18.0/${a}/messages`,{method:"POST",headers:{Authorization:`Bearer ${b}`,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",to:c,type:"text",text:{body:d}})});if(!e.ok){let a=await e.text();return console.error("[enviarMensajeTexto] Error:",a),!1}return!0}catch(a){return console.error("[enviarMensajeTexto] Error:",a),!1}}async function J(a,b,c,d,e){try{let f=await fetch(`https://graph.facebook.com/v18.0/${a}/messages`,{method:"POST",headers:{Authorization:`Bearer ${b}`,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",to:c,type:"interactive",interactive:{type:"button",body:{text:d},action:{buttons:e.map(a=>({type:"reply",reply:{id:a.id,title:a.title}}))}}})});if(!f.ok){let a=await f.text();return console.error("[enviarMensajeConBotones] Error:",a),!1}return!0}catch(a){return console.error("[enviarMensajeConBotones] Error:",a),!1}}async function K(a,b,c,d,e,f){try{let g=await fetch(`https://graph.facebook.com/v18.0/${a}/messages`,{method:"POST",headers:{Authorization:`Bearer ${b}`,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",to:c,type:"interactive",interactive:{type:"list",body:{text:d},action:{button:e,sections:f}}})});if(!g.ok){let a=await g.text();return console.error("[enviarMensajeConLista] Error:",a),!1}return!0}catch(a){return console.error("[enviarMensajeConLista] Error:",a),!1}}async function L(a,b){try{let c=await a.prepare(`
      SELECT COUNT(*) as total
      FROM clase_recuperar
      WHERE usuario_id = ? AND usado = 0 AND fecha_vencimiento >= date('now')
    `).bind(b).first();return Number(c?.total||0)}catch(a){if(a?.message?.includes("no such table"))return 0;return console.error("[getClasesRecuperarDisponibles] Error:",a),0}}async function M(a,b,c){let d=await a.prepare(`
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
  `).bind(b,c).first(),e=Number(d?.count||0),f=await a.prepare(`
    SELECT COUNT(DISTINCT usuario_id) as count
    FROM reserva
    WHERE clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
  `).bind(b,c).first();return e+Number(f?.count||0)>=35}async function N(a,b,c){let d=await F(a,b);if(0===d.length)return void await I(w,v,c,"\uD83D\uDCC5 No tienes clases programadas en este momento.");let e="\uD83D\uDCC5 *Tus pr\xf3ximas clases:*\n\n",f=d.slice(0,3);for(let a=0;a<f.length;a++){let b=f[a],c=b.clase?.hora||"",d=H(b.fecha,c);e+=`${a+1}. ${d}
`}await I(w,v,c,e)}async function O(a,b,c,d=0){let e=await a.prepare("SELECT * FROM clase ORDER BY dia, hora").all(),f=e?.results||[];if(0===f.length)return void await I(w,v,c,"❌ No hay clases disponibles en este momento.");let g=await L(a,b),h=function(a,b){let c=new Date;c.setHours(0,0,0,0);let d=new Date(c);d.setDate(d.getDate()+30);let e={Lun:1,Mar:2,Jue:4,Sab:6},f=[];for(let b of a){let a=e[b.dia];if(!a)continue;let g=a-c.getDay();g<0&&(g+=7);let h=new Date(c);h.setDate(h.getDate()+g);for(let a=new Date(h);a<=d;a.setDate(a.getDate()+7))f.push({fecha:new Date(a),clase:b})}return f.sort((a,b)=>{let c=a.fecha.getTime()-b.fecha.getTime();return 0!==c?c:String(a.clase.hora||"").localeCompare(String(b.clase.hora||""))}),f}(f,0),i=h.slice(d,d+9),j=[];for(let b of i){let c=b.fecha.toISOString().split("T")[0],d=Number(b.clase.id),e=await M(a,d,c),f=`${e?"\uD83D\uDFE1 ":""}${function(a,b){let c=["Dom","Lun","Mar","Mi\xe9","Jue","Vie","S\xe1b"][a.getDay()],d=a.getDate(),e=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"][a.getMonth()];return`${c} ${b} ${d} ${e}`}(b.fecha,b.clase.hora)}`;j.push({id:`reservar_${d}_${c}`,title:f,description:e?"Cupo completo: lista de espera":b.clase.nombre||"Yoga"})}h.length>d+9&&j.push({id:`ver_mas_clases_${d+9}`,title:"➡️ Ver m\xe1s clases",description:"Mostrar m\xe1s opciones"});let k=`📚 *Clases disponibles*

Tienes ${g} clase${1===g?"":"s"} a recuperar.

🟡 = cupo completo (si eleg\xeds esa opci\xf3n, qued\xe1s en lista de espera)

Selecciona una clase:`;await K(w,v,c,k,"Ver clases",[{title:"Clases",rows:j}])}async function P(a,b,c){let d=await G(a,b);if(0===d.length)return void await I(w,v,c,"\uD83D\uDCC5 No tienes clases cancelables en este momento.\n\n⚠️ Record\xe1: pod\xe9s cancelar hasta 1 hora antes del inicio de la clase.");let e=d.slice(0,3),f="❌ Selecciona la clase que quieres cancelar:\n\n",g=[];for(let a=0;a<e.length;a++){let b=e[a],c=H(b.fecha,b.clase.hora),d=function(a,b){let c=["Dom","Lun","Mar","Mi\xe9","Jue","Vie","Sab"][a.getDay()],d=a.getDate(),e=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"][a.getMonth()];return`${c} ${b} ${d} ${e}`}(b.fecha,b.clase.hora);f+=`${a+1}. ${c}
`,g.push({id:`cancelar_${b.reserva?.clase_id??b.clase?.clase_id??b.clase?.id}_${b.fecha.toISOString().split("T")[0]}`,title:d.length>20?d.substring(0,20):d})}g.length>0?await J(w,v,c,f,g):await I(w,v,c,f)}async function Q(a,b,c,d){try{console.log("[procesarCancelacion] Buscando reserva:",{usuarioId:b,claseId:c,fechaClase:d});let e=await a.prepare(`
      SELECT * FROM reserva
      WHERE usuario_id = ? AND clase_id = ? 
        AND (fecha_clase IS NULL OR fecha_clase = '' OR fecha_clase = 'null')
        AND (es_reasignacion IS NULL OR es_reasignacion = 0)
    `).bind(b,c).first();console.log("[procesarCancelacion] Reserva encontrada:",e);let f=await a.prepare(`
      SELECT * FROM reserva
      WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
    `).bind(b,c,d).first();if(!e&&!f)return console.log("[procesarCancelacion] No se encontr\xf3 reserva fija ni temporal"),{success:!1,message:"No se encontr\xf3 la reserva"};let g=!!f;if(!g&&await a.prepare(`
        SELECT * FROM cancelacion
        WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
      `).bind(b,c,d).first())return{success:!1,message:"Ya existe una cancelaci\xf3n para esta clase"};let h=await a.prepare("SELECT * FROM clase WHERE id = ?").bind(c).first();if(!h)return{success:!1,message:"No se encontr\xf3 la clase"};let i=h?.hora?String(h.hora):"";if(!z(d,i))return{success:!1,message:"Solo pod\xe9s cancelar hasta 1 hora antes del inicio de la clase."};g?(await a.prepare(`
        DELETE FROM reserva
        WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
      `).bind(b,c,d).run(),await B(a,c,d)):await a.prepare(`
        INSERT INTO cancelacion (usuario_id, clase_id, fecha_clase, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `).bind(b,c,d).run();let j=new Date().toISOString().split("T")[0],k=new Date;k.setDate(k.getDate()+30);let l=k.toISOString().split("T")[0];try{await a.prepare(`
        INSERT INTO clase_recuperar (usuario_id, fecha_creacion, fecha_vencimiento, clase_id, fecha_clase_cancelada, usado)
        VALUES (?, ?, ?, ?, ?, 0)
      `).bind(b,j,l,c,d).run()}catch(e){if(e.message?.includes("no such table"))await a.prepare(`
          CREATE TABLE IF NOT EXISTS clase_recuperar (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            fecha_creacion TEXT NOT NULL,
            fecha_vencimiento TEXT NOT NULL,
            clase_id INTEGER,
            fecha_clase_cancelada TEXT,
            usado INTEGER DEFAULT 0,
            fecha_uso TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (usuario_id) REFERENCES usuario(id),
            FOREIGN KEY (clase_id) REFERENCES clase(id)
          )
        `).run(),await a.prepare(`
          INSERT INTO clase_recuperar (usuario_id, fecha_creacion, fecha_vencimiento, clase_id, fecha_clase_cancelada, usado)
          VALUES (?, ?, ?, ?, ?, 0)
        `).bind(b,j,l,c,d).run();else throw e}let m=await a.prepare(`
      SELECT COUNT(*) as total FROM clase_recuperar
      WHERE usuario_id = ? AND usado = 0 AND fecha_vencimiento >= date('now')
    `).bind(b).first(),n=m?.total||0,o=new Date(d),p=H(o,h.hora);return{success:!0,message:"Cancelaci\xf3n registrada exitosamente",fechaFormateada:p,totalClasesRecuperar:n}}catch(a){return console.error("[procesarCancelacion] Error:",a),{success:!1,message:a.message||"Error al procesar cancelaci\xf3n"}}}async function R(a){let b=a.nextUrl.searchParams,c=b.get("hub.mode"),d=b.get("hub.verify_token"),e=b.get("hub.challenge");return"subscribe"===c&&d===x?(console.log("[GET /api/whatsapp/webhook] Webhook verificado"),new u.NextResponse(e,{status:200})):new u.NextResponse("Forbidden",{status:403})}async function S(a){try{let b=null;try{let a=globalThis[Symbol.for("__cloudflare-context__")];a?.env?.DB&&(b=a.env.DB)}catch(a){}if(b||(b=function(a){if("undefined"!=typeof process&&process.env.DB)return process.env.DB;try{let a=globalThis[Symbol.for("__cloudflare-context__")];if(a?.env?.DB)return a.env.DB}catch(a){}return null}()),!b)return console.error("[POST /api/whatsapp/webhook] DB not available"),u.NextResponse.json({error:"Database not available"},{status:503});let c=await a.json();console.log("[POST /api/whatsapp/webhook] Received:",JSON.stringify(c,null,2));let d=c.entry?.[0],e=d?.changes?.[0],f=e?.value;if(!f)return u.NextResponse.json({received:!0});for(let a of f.messages||[]){let c=a.from,d=a.type,e=a.id;console.log("[POST /api/whatsapp/webhook] Processing message:",{from:c,messageType:d,messageId:e});let f=await E(b,c);if(!f){await I(w,v,c,"❌ No est\xe1s registrado en el sistema. Por favor, contacta a la administraci\xf3n.");continue}if("text"===d){let d=a.text?.body?.toLowerCase().trim()||"";d.includes("ver")&&(d.includes("clase")||d.includes("clases"))?await N(b,f.id,c):d.includes("agendar")||d.includes("inscribir")||d.includes("reservar")?await O(b,f.id,c):d.includes("cancelar")||d.includes("cancel")?await P(b,f.id,c):await J(w,v,c,`\xa1Hola ${f.nombre}! 👋

\xbfEn qu\xe9 te puedo ayudar?`,[{id:"cancelar",title:"❌ Cancelar clase"},{id:"reservar",title:"✅ Reservar clase"},{id:"ver_clases",title:"\uD83D\uDCC5 Ver mis clases"}])}else if("interactive"===d){let d=a.interactive,e=d?.button_reply?.id||d?.list_reply?.id;if("ver_clases"===e)await N(b,f.id,c);else if("cancelar"===e)await P(b,f.id,c);else if("reservar"===e)await O(b,f.id,c);else if(e?.startsWith("ver_mas_clases_")){let a=parseInt(e.split("_").pop()||"0",10)||0;await O(b,f.id,c,a)}else if(e?.startsWith("reservar_")){let a=e.split("_");if(3===a.length){let d=parseInt(a[1],10),e=a[2];if(await L(b,f.id)<=0){await I(w,v,c,"❌ No tienes clases a recuperar disponibles.");continue}try{if(await b.prepare(`
                SELECT * FROM reserva
                WHERE usuario_id = ? AND clase_id = ?
                  AND (fecha_clase IS NULL OR fecha_clase = 'null' OR fecha_clase = '' OR fecha_clase = ?)
              `).bind(f.id,d,e).first()){await I(w,v,c,"⚠️ Ya est\xe1s inscripto en esa clase.");continue}let a=await b.prepare(`
                SELECT COUNT(DISTINCT usuario_id) as count
                FROM reserva
                WHERE clase_id = ?
                  AND (fecha_clase IS NULL OR fecha_clase = 'null' OR fecha_clase = '')
                  AND (es_reasignacion IS NULL OR es_reasignacion = 0)
              `).bind(d).first(),g=await b.prepare(`
                SELECT COUNT(DISTINCT usuario_id) as count
                FROM reserva
                WHERE clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
              `).bind(d,e).first();if(Number(a?.count||0)+Number(g?.count||0)>=35){try{let a=await b.prepare(`
                    SELECT COALESCE(MAX(numero), 0) as max_num
                    FROM lista_espera
                    WHERE clase_id = ? AND fecha_clase = ?
                  `).bind(d,e).first(),g=Number(a?.max_num||0)+1;await b.prepare(`
                    INSERT INTO lista_espera (usuario_id, clase_id, fecha_clase, numero, created_at)
                    VALUES (?, ?, ?, ?, datetime('now'))
                  `).bind(f.id,d,e,g).run(),await I(w,v,c,`⏳ Cupo completo. Te agregu\xe9 a la lista de espera (posici\xf3n ${g}).

📩 Te voy a avisar por WhatsApp cuando se confirme un cupo.`)}catch{await I(w,v,c,"⏳ Cupo completo. Contact\xe1 a la administraci\xf3n para lista de espera.\n\n\uD83D\uDCE9 Cuando se libere un cupo, te avisaremos por WhatsApp.")}continue}await b.prepare(`
                INSERT INTO reserva (usuario_id, clase_id, fecha_clase, es_reasignacion, created_at)
                VALUES (?, ?, ?, 1, datetime('now'))
              `).bind(f.id,d,e).run();let h=await b.prepare(`
                SELECT id FROM clase_recuperar
                WHERE usuario_id = ? AND usado = 0 AND fecha_vencimiento >= date('now')
                ORDER BY fecha_vencimiento ASC, id ASC
                LIMIT 1
              `).bind(f.id).first();h?.id&&await b.prepare(`
                  UPDATE clase_recuperar
                  SET usado = 1, fecha_uso = date('now')
                  WHERE id = ?
                `).bind(h.id).run(),await I(w,v,c,"✅ Reserva realizada exitosamente. Respond\xe9 cualquier mensaje para volver al men\xfa.")}catch(a){console.error("[reservar_clase] Error:",a),await I(w,v,c,`❌ Error al reservar: ${a?.message||"Error desconocido"}`)}}}else if(e?.startsWith("cancelar_")){let a=e.split("_");if(3===a.length){let d=parseInt(a[1]),e=a[2],g=await Q(b,f.id,d,e);if(g.success){let a="✅ Clase cancelada exitosamente\n";a+=`Clase cancelada: ${g.fechaFormateada}
Se te ha asignado ${g.totalClasesRecuperar} clase${g.totalClasesRecuperar>1?"s":""} a recuperar que puedes usar en los pr\xf3ximos 30 d\xedas.
Responde cualquier mensaje para volver al men\xfa.`,await I(w,v,c,a)}else await I(w,v,c,`❌ ${g.message}`)}}}}return u.NextResponse.json({received:!0})}catch(a){return console.error("[POST /api/whatsapp/webhook] Error:",a),u.NextResponse.json({error:a.message||"Internal server error"},{status:500})}}process.env.WHATSAPP_TEMPLATE_NAME;let T=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/whatsapp/webhook/route",pathname:"/api/whatsapp/webhook",filename:"route",bundlePath:"app/api/whatsapp/webhook/route"},distDir:".next",projectDir:"",resolvedPagePath:"/Users/alko/clases-bot/app/api/whatsapp/webhook/route.ts",nextConfigOutput:"standalone",userland:d}),{workAsyncStorage:U,workUnitAsyncStorage:V,serverHooks:W}=T;function X(){return(0,g.patchFetch)({workAsyncStorage:U,workUnitAsyncStorage:V})}async function Y(a,b,c){var d;let e="/api/whatsapp/webhook/route";"/index"===e&&(e="/");let g=await T.prepare(a,b,{srcPage:e,multiZoneDraftMode:"false"});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:u,params:v,nextConfig:w,isDraftMode:x,prerenderManifest:y,routerServerContext:z,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,resolvedPathname:C}=g,D=(0,j.normalizeAppPath)(e),E=!!(y.dynamicRoutes[D]||y.routes[C]);if(E&&!x){let a=!!y.routes[C],b=y.dynamicRoutes[D];if(b&&!1===b.fallback&&!a)throw new s.NoFallbackError}let F=null;!E||T.isDev||x||(F="/index"===(F=C)?"/":F);let G=!0===T.isDev||!E,H=E&&!G,I=a.method||"GET",J=(0,i.getTracer)(),K=J.getActiveScopeSpan(),L={params:v,prerenderManifest:y,renderOpts:{experimental:{dynamicIO:!!w.experimental.dynamicIO,authInterrupts:!!w.experimental.authInterrupts},supportsDynamicResponse:G,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=w.experimental)?void 0:d.cacheLife,isRevalidate:H,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>T.onRequestError(a,b,d,z)},sharedContext:{buildId:u}},M=new k.NodeNextRequest(a),N=new k.NodeNextResponse(b),O=l.NextRequestAdapter.fromNodeNextRequest(M,(0,l.signalFromNodeResponse)(b));try{let d=async c=>T.handle(O,L).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=J.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${I} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${I} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&A&&B&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=L.renderOpts.fetchMetrics;let i=L.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=L.renderOpts.collectedTags;if(!E)return await (0,o.I)(M,N,e,L.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==L.renderOpts.collectedRevalidate&&!(L.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&L.renderOpts.collectedRevalidate,d=void 0===L.renderOpts.collectedExpire||L.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:L.renderOpts.collectedExpire;return{value:{kind:t.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await T.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:H,isOnDemandRevalidate:A})},z),b}},l=await T.handleResponse({req:a,nextConfig:w,cacheKey:F,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:y,isRoutePPREnabled:!1,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,responseGenerator:k,waitUntil:c.waitUntil});if(!E)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==t.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",A?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),x&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&E||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(M,N,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};K?await g(K):await J.withPropagatedContext(a.headers,()=>J.trace(m.BaseServerSpan.handleRequest,{spanName:`${I} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":I,"http.target":a.url}},g))}catch(b){if(K||b instanceof s.NoFallbackError||await T.onRequestError(a,b,{routerKind:"App Router",routePath:D,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:H,isOnDemandRevalidate:A})}),E)throw b;return await (0,o.I)(M,N,new Response(null,{status:500})),null}}},8335:()=>{},9294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")}};var b=require("../../../../webpack-runtime.js");b.C(a);var c=b.X(0,[431,55],()=>b(b.s=6640));module.exports=c})();