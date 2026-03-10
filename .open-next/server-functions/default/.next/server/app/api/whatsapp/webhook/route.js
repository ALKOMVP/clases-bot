(()=>{var a={};a.id=274,a.ids=[274],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},3033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},4870:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},6439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")},6487:()=>{},6640:(a,b,c)=>{"use strict";c.r(b),c.d(b,{handler:()=>Z,patchFetch:()=>Y,routeModule:()=>U,serverHooks:()=>X,workAsyncStorage:()=>V,workUnitAsyncStorage:()=>W});var d={};c.r(d),c.d(d,{GET:()=>S,POST:()=>T});var e=c(6559),f=c(8088),g=c(7719),h=c(6191),i=c(1289),j=c(261),k=c(2603),l=c(9893),m=c(4823),n=c(7220),o=c(6946),p=c(7912),q=c(9786),r=c(6143),s=c(6439),t=c(3365),u=c(2190);let v=process.env.WHATSAPP_TOKEN||"",w=process.env.PHONE_NUMBER_ID||"",x=process.env.VERIFY_TOKEN||"";function y(a,b){try{let[c,d,e]=a.split("-").map(a=>parseInt(a,10)),[f,g]=b.split(":").map(a=>parseInt(a,10));if(!c||!d||!e||Number.isNaN(f)||Number.isNaN(g))return null;return Date.UTC(c,d-1,e,f+3,g,0,0)}catch{return null}}function z(a,b){let c=y(a,b);return!!c&&Date.now()<c-36e5}async function A(a){if(!v||!w)return!1;let b=function(){let a=(process.env.WHATSAPP_CONFIRMAR_RESERVA_TEMPLATE||process.env.WHATSAPP_TEMPLATE_NAME||"").trim();return a&&"hello_world"!==a?a:"confirmar_reserva"}();for(let c of function(){let a=[(process.env.WHATSAPP_TEMPLATE_LANG||"").trim(),"es_AR","es","es_ES"].filter(Boolean),b=new Set;return a.filter(a=>!b.has(a)&&(b.add(a),!0))}())try{let d=await fetch(`https://graph.facebook.com/v18.0/${w}/messages`,{method:"POST",headers:{Authorization:`Bearer ${v}`,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",to:a,type:"template",template:{name:b,language:{code:c}}})});if(d.ok)return!0;let e=await d.text();console.error("[enviarTemplateConfirmarReserva] Error",{status:d.status,to:a,templateName:b,lang:c,body:e})}catch(a){console.error("[enviarTemplateConfirmarReserva] Exception",a?.message||a)}return!1}async function B(a,b,c){console.log(`[promoverDeListaEsperaSimple] 🚀 Iniciando promoci\xf3n para clase ${b}, fecha ${c}`);let d=null;try{d=await a.prepare(`
      SELECT * FROM lista_espera
      WHERE clase_id = ? AND fecha_clase = ?
      ORDER BY numero ASC
      LIMIT 1
    `).bind(b,c).first(),console.log("[promoverDeListaEsperaSimple] Consulta lista_espera ejecutada. Resultado:",d?`Usuario ${d.usuario_id} encontrado`:"Ninguno")}catch(a){throw console.error(`[promoverDeListaEsperaSimple] ❌ Error accediendo a lista_espera:`,a?.message||a),a}if(!d)return void console.log(`[promoverDeListaEsperaSimple] ℹ️ No hay nadie en lista de espera para clase ${b}, fecha ${c}`);let e=0,f=0;try{let d=await a.prepare(`
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
    `).bind(b,c).first();e=Number(d?.count||0),console.log(`[promoverDeListaEsperaSimple] Reservas fijas (sin cancelaciones): ${e}`)}catch(a){throw console.error(`[promoverDeListaEsperaSimple] ❌ Error contando reservas fijas:`,a?.message||a),a}try{let d=await a.prepare(`
      SELECT COUNT(DISTINCT r.usuario_id) as count
      FROM reserva r
      WHERE r.clase_id = ? AND r.fecha_clase = ? AND r.es_reasignacion = 1
        AND NOT EXISTS (
          SELECT 1 FROM cancelacion c
          WHERE c.usuario_id = r.usuario_id
            AND c.clase_id = r.clase_id
            AND c.fecha_clase = r.fecha_clase
        )
    `).bind(b,c).first();f=Number(d?.count||0),console.log(`[promoverDeListaEsperaSimple] Reservas temporales (sin cancelaciones): ${f}`)}catch(a){throw console.error(`[promoverDeListaEsperaSimple] ❌ Error contando reservas temporales:`,a?.message||a),a}let g=e+f;if(console.log(`[promoverDeListaEsperaSimple] 📊 Cupo actual: ${g}/35 (fijas: ${e}, temporales: ${f})`),g>=35)return void console.log(`[promoverDeListaEsperaSimple] ⚠️ Cupo completo (${g}/35), no se puede promover`);console.log(`[promoverDeListaEsperaSimple] ✅ Hay cupo disponible (${g}/35), procediendo con promoci\xf3n...`);let h=Number(d.usuario_id);console.log(`[promoverDeListaEsperaSimple] 👤 Promoviendo usuario ${h} de lista de espera`);let i=null;try{i=await a.prepare(`
      SELECT * FROM reserva
      WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
    `).bind(h,b,c).first(),console.log(`[promoverDeListaEsperaSimple] Verificaci\xf3n de duplicado: ${i?"Ya existe reserva temporal":"No existe, se crear\xe1 nueva"}`)}catch(a){throw console.error(`[promoverDeListaEsperaSimple] ❌ Error verificando duplicado:`,a?.message||a),a}try{await a.prepare("DELETE FROM lista_espera WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?").bind(h,b,c).run(),console.log(`[promoverDeListaEsperaSimple] ✅ Usuario ${h} eliminado de lista de espera`)}catch(a){throw console.error(`[promoverDeListaEsperaSimple] ❌ Error eliminando de lista de espera:`,a?.message||a),a}if(i)console.log(`[promoverDeListaEsperaSimple] ⚠️ Usuario ${h} ya ten\xeda reserva temporal, solo eliminado de lista`);else{try{await a.prepare(`
        INSERT INTO reserva (usuario_id, clase_id, fecha_clase, es_reasignacion, created_at)
        VALUES (?, ?, ?, 1, datetime('now'))
      `).bind(h,b,c).run(),console.log(`[promoverDeListaEsperaSimple] ✅ Reserva temporal creada para usuario ${h}`)}catch(a){throw console.error(`[promoverDeListaEsperaSimple] ❌ Error creando reserva temporal:`,a?.message||a),a}try{let b=await a.prepare(`
        SELECT id FROM clase_recuperar
        WHERE usuario_id = ? AND usado = 0 AND fecha_vencimiento >= date('now')
        ORDER BY fecha_vencimiento ASC, id ASC
        LIMIT 1
      `).bind(h).first();b?.id?(await a.prepare(`
          UPDATE clase_recuperar
          SET usado = 1, fecha_uso = date('now')
          WHERE id = ?
        `).bind(b.id).run(),console.log(`[promoverDeListaEsperaSimple] ✅ Clase para recuperar consumida para usuario ${h}`,{clase_recuperar_id:b.id})):console.log(`[promoverDeListaEsperaSimple] ℹ️ Usuario ${h} no tiene clases para recuperar disponibles`)}catch(a){a?.message?.includes("no such table")||console.warn("[promoverDeListaEsperaSimple] Error consumiendo clase para recuperar (no cr\xedtico):",a.message||a)}}let j=(await a.prepare(`
    SELECT * FROM lista_espera
    WHERE clase_id = ? AND fecha_clase = ?
    ORDER BY numero ASC
  `).bind(b,c).all().catch(()=>({results:[]}))).results||[];for(let d=0;d<j.length;d++)await a.prepare(`
      UPDATE lista_espera SET numero = ?
      WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
    `).bind(d+1,j[d].usuario_id,b,c).run();try{let b=await a.prepare("SELECT telefono FROM usuario WHERE id = ?").bind(h).first(),c=b?.telefono?String(b.telefono):"",d=function(a){let b=C(a);if(!b)return"";let c=b;return c.startsWith("0")&&(c=c.slice(1)),c.startsWith("54")&&!c.startsWith("549")&&(c="549"+c.slice(2)),c.startsWith("54")||10!==c.length&&11!==c.length||(c="549"+c),c}(c);if(d){let a=await A(d);console.log(`[promoverDeListaEsperaSimple] ${a?"✅":"❌"} Template de confirmaci\xf3n ${a?"enviado":"fall\xf3"} a usuario ${h} (tel: ${d})`)}else console.log(`[promoverDeListaEsperaSimple] ⚠️ No se pudo enviar template: tel\xe9fono vac\xedo para usuario ${h}`)}catch(a){console.warn(`[promoverDeListaEsperaSimple] ⚠️ Error enviando template (no cr\xedtico):`,a?.message||a)}console.log(`[promoverDeListaEsperaSimple] ✅✅✅ Promoci\xf3n COMPLETADA exitosamente para usuario ${h}`)}function C(a){return a.replace(/\D/g,"")}function D(a,b=8){let c=C(a);return c.length<b?c:c.slice(-b)}async function E(a,b){try{let c=D(b,8);console.log("[getUsuarioPorTelefono] Buscando usuario con \xfaltimos 8 d\xedgitos:",c,"del tel\xe9fono:",b);let d=await a.prepare("SELECT * FROM usuario WHERE activo = 1").all();for(let a of d?.results||[])if(a.telefono&&D(a.telefono,8)===c)return console.log("[getUsuarioPorTelefono] Usuario encontrado:",a.id,a.nombre,a.apellido),a;return console.log("[getUsuarioPorTelefono] No se encontr\xf3 usuario con \xfaltimos 8 d\xedgitos:",c),null}catch(a){return console.error("[getUsuarioPorTelefono] Error:",a),null}}async function F(a){let b=new Set;try{let c=await a.prepare("SELECT clase_id, fecha_clase FROM clase_desactivada").all();(c?.results||[]).forEach(a=>b.add(`${a.clase_id}-${a.fecha_clase}`))}catch{}return b}async function G(a,b){try{let c;try{c=await a.prepare(`
        SELECT r.*, c.dia, c.hora, c.nombre
        FROM reserva r
        JOIN clase c ON r.clase_id = c.id
        WHERE r.usuario_id = ? 
          AND (r.fecha_clase IS NULL OR r.fecha_clase = '' OR r.fecha_clase = 'null')
          AND (r.es_reasignacion IS NULL OR r.es_reasignacion = 0)
          AND (c.activa IS NULL OR c.activa = 1)
        ORDER BY c.dia, c.hora
      `).bind(b).all()}catch(d){if(d?.message?.includes("no such column")&&d?.message?.includes("activa"))c=await a.prepare(`
          SELECT r.*, c.dia, c.hora, c.nombre
          FROM reserva r
          JOIN clase c ON r.clase_id = c.id
          WHERE r.usuario_id = ? 
            AND (r.fecha_clase IS NULL OR r.fecha_clase = '' OR r.fecha_clase = 'null')
            AND (r.es_reasignacion IS NULL OR r.es_reasignacion = 0)
          ORDER BY c.dia, c.hora
        `).bind(b).all();else throw d}let d=c?.results||[],e=new Date;e.setHours(0,0,0,0);let f=[],g={Lun:1,Mar:2,Jue:4,Sab:6};for(let c of d){let d=g[c.dia];if(!d)continue;let h=new Date(e),i=h.getDay(),j=d-i;if(0===j){let a=String(c.hora||"");if(a){let b=h.toISOString().split("T")[0],c=y(b,a);c&&c<Date.now()&&(j=7)}else j=7}else j<0&&(j+=7);for(let d=0;d<3;d++){let e=new Date(h);e.setDate(h.getDate()+j+7*d),await a.prepare(`
          SELECT * FROM cancelacion
          WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
        `).bind(b,c.clase_id,e.toISOString().split("T")[0]).first()||f.push({fecha:e,clase:c,reserva:c})}}let h=await F(a),i=f.filter(a=>{let b=a.fecha.toISOString().split("T")[0];return!h.has(`${a.reserva.clase_id}-${b}`)});return i.sort((a,b)=>a.fecha.getTime()-b.fecha.getTime()),i}catch(a){return console.error("[getProximasClases] Error:",a),[]}}async function H(a,b,c=!0){let d,e=[];try{d=await a.prepare(`
      SELECT r.*, c.dia, c.hora, c.nombre
      FROM reserva r
      JOIN clase c ON r.clase_id = c.id
      WHERE r.usuario_id = ?
        AND r.es_reasignacion = 1
        AND r.fecha_clase IS NOT NULL AND r.fecha_clase != '' AND r.fecha_clase != 'null'
        AND date(r.fecha_clase) >= date('now')
        AND (c.activa IS NULL OR c.activa = 1)
        AND NOT EXISTS (
          SELECT 1 FROM cancelacion c2
          WHERE c2.usuario_id = r.usuario_id 
            AND c2.clase_id = r.clase_id 
            AND c2.fecha_clase = r.fecha_clase
        )
        AND NOT EXISTS (
          SELECT 1 FROM clase_desactivada d
          WHERE d.clase_id = r.clase_id AND d.fecha_clase = r.fecha_clase
        )
      ORDER BY r.fecha_clase ASC, c.hora ASC
    `).bind(b).all()}catch(e){let c=String(e?.message||"");if(c.includes("no such column")&&c.includes("activa"))d=await a.prepare(`
        SELECT r.*, c.dia, c.hora, c.nombre
        FROM reserva r
        JOIN clase c ON r.clase_id = c.id
        WHERE r.usuario_id = ?
          AND r.es_reasignacion = 1
          AND r.fecha_clase IS NOT NULL AND r.fecha_clase != '' AND r.fecha_clase != 'null'
          AND date(r.fecha_clase) >= date('now')
          AND NOT EXISTS (
            SELECT 1 FROM cancelacion c2
            WHERE c2.usuario_id = r.usuario_id 
              AND c2.clase_id = r.clase_id 
              AND c2.fecha_clase = r.fecha_clase
          )
        ORDER BY r.fecha_clase ASC, c.hora ASC
      `).bind(b).all();else if(c.includes("clase_desactivada")||c.includes("no such table"))try{d=await a.prepare(`
          SELECT r.*, c.dia, c.hora, c.nombre
          FROM reserva r
          JOIN clase c ON r.clase_id = c.id
          WHERE r.usuario_id = ?
            AND r.es_reasignacion = 1
            AND r.fecha_clase IS NOT NULL AND r.fecha_clase != '' AND r.fecha_clase != 'null'
            AND date(r.fecha_clase) >= date('now')
            AND (c.activa IS NULL OR c.activa = 1)
            AND NOT EXISTS (
              SELECT 1 FROM cancelacion c2
              WHERE c2.usuario_id = r.usuario_id 
                AND c2.clase_id = r.clase_id 
                AND c2.fecha_clase = r.fecha_clase
            )
          ORDER BY r.fecha_clase ASC, c.hora ASC
        `).bind(b).all()}catch(c){if(String(c?.message||"").includes("no such column")&&String(c?.message||"").includes("activa"))d=await a.prepare(`
            SELECT r.*, c.dia, c.hora, c.nombre
            FROM reserva r
            JOIN clase c ON r.clase_id = c.id
            WHERE r.usuario_id = ?
              AND r.es_reasignacion = 1
              AND r.fecha_clase IS NOT NULL AND r.fecha_clase != '' AND r.fecha_clase != 'null'
              AND date(r.fecha_clase) >= date('now')
              AND NOT EXISTS (
                SELECT 1 FROM cancelacion c2
                WHERE c2.usuario_id = r.usuario_id 
                  AND c2.clase_id = r.clase_id 
                  AND c2.fecha_clase = r.fecha_clase
              )
            ORDER BY r.fecha_clase ASC, c.hora ASC
          `).bind(b).all();else throw c}else throw e}for(let a of d?.results||[]){let b=String(a.fecha_clase||""),d=String(a.hora||"");if(!b||!d)continue;let f=new Date(b),g=new Date;g.setHours(0,0,0,0),!(f<g)&&(!c||z(b,d))&&e.push({fecha:f,clase:a,reserva:a,esTemporal:!0})}for(let d of(await G(a,b))){let a=d.fecha.toISOString().split("T")[0],b=d.clase?.hora||"";(!c||z(a,b))&&e.push({fecha:d.fecha,clase:d.clase,reserva:d.reserva,esTemporal:!1})}e.sort((a,b)=>{let c=a.fecha.getTime()-b.fecha.getTime();return 0!==c?c:String(a.clase?.hora||"").localeCompare(String(b.clase?.hora||""))});let f=new Set,g=[];for(let a of e){let b=Number(a.reserva?.clase_id??a.clase?.clase_id??a.clase?.id),c=a.fecha.toISOString().split("T")[0],d=`${b}_${c}`;if(!f.has(d)&&(f.add(d),g.push(a),g.length>=3))break}return g}function I(a,b){let c=["Domingo","Lunes","Martes","Mi\xe9rcoles","Jueves","Viernes","S\xe1bado"][a.getDay()],d=a.getDate(),e=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"][a.getMonth()];return`${c} ${b} - ${d} de ${e}`}async function J(a,b,c,d){try{let e=await fetch(`https://graph.facebook.com/v18.0/${a}/messages`,{method:"POST",headers:{Authorization:`Bearer ${b}`,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",to:c,type:"text",text:{body:d}})});if(!e.ok){let a=await e.text();return console.error("[enviarMensajeTexto] Error:",a),!1}return!0}catch(a){return console.error("[enviarMensajeTexto] Error:",a),!1}}async function K(a,b,c,d,e){try{let f=await fetch(`https://graph.facebook.com/v18.0/${a}/messages`,{method:"POST",headers:{Authorization:`Bearer ${b}`,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",to:c,type:"interactive",interactive:{type:"button",body:{text:d},action:{buttons:e.map(a=>({type:"reply",reply:{id:a.id,title:a.title}}))}}})});if(!f.ok){let a=await f.text();return console.error("[enviarMensajeConBotones] Error:",a),!1}return!0}catch(a){return console.error("[enviarMensajeConBotones] Error:",a),!1}}async function L(a,b,c,d,e,f){try{let g=await fetch(`https://graph.facebook.com/v18.0/${a}/messages`,{method:"POST",headers:{Authorization:`Bearer ${b}`,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",to:c,type:"interactive",interactive:{type:"list",body:{text:d},action:{button:e,sections:f}}})});if(!g.ok){let a=await g.text();return console.error("[enviarMensajeConLista] Error:",a),!1}return!0}catch(a){return console.error("[enviarMensajeConLista] Error:",a),!1}}async function M(a,b){try{let c=await a.prepare(`
      SELECT COUNT(*) as total
      FROM clase_recuperar
      WHERE usuario_id = ? AND usado = 0 AND fecha_vencimiento >= date('now')
    `).bind(b).first();return Number(c?.total||0)}catch(a){if(a?.message?.includes("no such table"))return 0;return console.error("[getClasesRecuperarDisponibles] Error:",a),0}}async function N(a,b,c){let d=await a.prepare(`
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
    SELECT COUNT(DISTINCT r.usuario_id) as count
    FROM reserva r
    WHERE r.clase_id = ? AND r.fecha_clase = ? AND r.es_reasignacion = 1
      AND NOT EXISTS (
        SELECT 1 FROM cancelacion c
        WHERE c.usuario_id = r.usuario_id
          AND c.clase_id = r.clase_id
          AND c.fecha_clase = r.fecha_clase
      )
  `).bind(b,c).first(),g=Number(f?.count||0),h=e+g;return console.log(`[isCupoCompleto] Clase ${b}, fecha ${c}: ${h}/35 (fijas: ${e}, temporales: ${g})`),h>=35}async function O(a,b,c){let d=await H(a,b,!1);if(0===d.length)return void await J(w,v,c,"\uD83D\uDCC5 No tienes clases programadas en este momento.");let e="\uD83D\uDCC5 *Tus pr\xf3ximas clases:*\n\n",f=d.slice(0,3);for(let a=0;a<f.length;a++){let b=f[a],c=b.clase?.hora||"",d=I(b.fecha,c),g=b.esTemporal?" \uD83D\uDCC5 temporal":"";e+=`${a+1}. ${d}${g}
`}await J(w,v,c,e)}async function P(a,b,c,d=0){let e;try{e=await a.prepare("SELECT * FROM clase WHERE (activa IS NULL OR activa = 1) ORDER BY dia, hora").all()}catch(b){if(b?.message?.includes("no such column")&&b?.message?.includes("activa"))e=await a.prepare("SELECT * FROM clase ORDER BY dia, hora").all();else throw b}let f=e?.results||[];if(0===f.length)return void await J(w,v,c,"❌ No hay clases disponibles en este momento.");let g=await M(a,b),h=function(a,b){let c=new Date;c.setHours(0,0,0,0);let d=new Date(c);d.setDate(d.getDate()+30);let e={Lun:1,Mar:2,Jue:4,Sab:6},f=[];for(let b of a){let a=e[b.dia];if(!a)continue;let g=a-c.getDay();g<0&&(g+=7);let h=new Date(c);h.setDate(h.getDate()+g);for(let a=new Date(h);a<=d;a.setDate(a.getDate()+7))f.push({fecha:new Date(a),clase:b})}return f.sort((a,b)=>{let c=a.fecha.getTime()-b.fecha.getTime();return 0!==c?c:String(a.clase.hora||"").localeCompare(String(b.clase.hora||""))}),f}(f,0),i=await F(a),j=h.filter(a=>{let b=a.fecha.toISOString().split("T")[0];return!i.has(`${a.clase.id}-${b}`)}),k=j.slice(d,d+9),l=[];for(let b of k){let c=b.fecha.toISOString().split("T")[0],d=Number(b.clase.id),e=await N(a,d,c),f=`${e?"\uD83D\uDFE1 ":""}${function(a,b){let c=["Dom","Lun","Mar","Mi\xe9","Jue","Vie","S\xe1b"][a.getDay()],d=a.getDate(),e=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"][a.getMonth()];return`${c} ${b} ${d} ${e}`}(b.fecha,b.clase.hora)}`;l.push({id:`reservar_${d}_${c}`,title:f,description:e?"Cupo completo: lista de espera":b.clase.nombre||"Yoga"})}j.length>d+9&&l.push({id:`ver_mas_clases_${d+9}`,title:"➡️ Ver m\xe1s clases",description:"Mostrar m\xe1s opciones"});let m=`📚 *Clases disponibles*

Tienes ${g} clase${1===g?"":"s"} a recuperar.

🟡 = cupo completo (si eleg\xeds esa opci\xf3n, qued\xe1s en lista de espera)

Selecciona una clase:`;await L(w,v,c,m,"Ver clases",[{title:"Clases",rows:l}])}async function Q(a,b,c){let d=await H(a,b);if(0===d.length)return void await J(w,v,c,"\uD83D\uDCC5 No tienes clases cancelables en este momento.\n\n⚠️ Record\xe1: pod\xe9s cancelar hasta 1 hora antes del inicio de la clase.");let e=d.slice(0,3),f="❌ Selecciona la clase que quieres cancelar:\n\n",g=[];for(let a=0;a<e.length;a++){let b=e[a],c=I(b.fecha,b.clase.hora),d=b.esTemporal?" \uD83D\uDCC5 temporal":"";f+=`${a+1}. ${c}${d}
`;let h=function(a,b){let c=["Dom","Lun","Mar","Mi\xe9","Jue","Vie","Sab"][a.getDay()],d=a.getDate(),e=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"][a.getMonth()];return`${c} ${b} ${d} ${e}`}(b.fecha,b.clase.hora),i=(b.esTemporal?"\uD83D\uDCC5 ":"")+h;g.push({id:`cancelar_${b.reserva?.clase_id??b.clase?.clase_id??b.clase?.id}_${b.fecha.toISOString().split("T")[0]}`,title:i.length>20?i.substring(0,20):i})}g.length>0?await K(w,v,c,f,g):await J(w,v,c,f)}async function R(a,b,c,d){try{console.log("[procesarCancelacion] Buscando reserva:",{usuarioId:b,claseId:c,fechaClase:d});let e=await a.prepare(`
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
      `).bind(b,c,d).first())return{success:!1,message:"Ya existe una cancelaci\xf3n para esta clase"};let h=await a.prepare("SELECT * FROM clase WHERE id = ?").bind(c).first();if(!h)return{success:!1,message:"No se encontr\xf3 la clase"};let i=h?.hora?String(h.hora):"";if(!z(d,i))return{success:!1,message:"Solo pod\xe9s cancelar hasta 1 hora antes del inicio de la clase."};if(g){await a.prepare(`
        DELETE FROM reserva
        WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
      `).bind(b,c,d).run(),console.log("[procesarCancelacion] ✅ Reserva temporal eliminada:",{usuarioId:b,claseId:c,fechaClase:d});try{console.log("[procesarCancelacion] Intentando promover de lista de espera (temporal)..."),await B(a,c,d),console.log("[procesarCancelacion] ✅ Promoci\xf3n de lista de espera completada (o no hab\xeda nadie)")}catch(a){console.error("[procesarCancelacion] ❌ ERROR al promover de lista de espera:",a?.message||a)}}else{await a.prepare(`
        INSERT INTO cancelacion (usuario_id, clase_id, fecha_clase, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `).bind(b,c,d).run(),console.log("[procesarCancelacion] ✅ Cancelaci\xf3n de reserva fija creada:",{usuarioId:b,claseId:c,fechaClase:d});try{console.log("[procesarCancelacion] Intentando promover de lista de espera..."),await B(a,c,d),console.log("[procesarCancelacion] ✅ Promoci\xf3n de lista de espera completada (o no hab\xeda nadie)")}catch(a){console.error("[procesarCancelacion] ❌ ERROR al promover de lista de espera:",a?.message||a)}}let j=new Date().toISOString().split("T")[0],k=new Date;k.setDate(k.getDate()+30);let l=k.toISOString().split("T")[0];try{await a.prepare(`
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
    `).bind(b).first(),n=m?.total||0,o=new Date(d),p=I(o,h.hora);return{success:!0,message:"Cancelaci\xf3n registrada exitosamente",fechaFormateada:p,totalClasesRecuperar:n}}catch(a){return console.error("[procesarCancelacion] Error:",a),{success:!1,message:a.message||"Error al procesar cancelaci\xf3n"}}}async function S(a){let b=a.nextUrl.searchParams,c=b.get("hub.mode"),d=b.get("hub.verify_token"),e=b.get("hub.challenge");return"subscribe"===c&&d===x?(console.log("[GET /api/whatsapp/webhook] Webhook verificado"),new u.NextResponse(e,{status:200})):new u.NextResponse("Forbidden",{status:403})}async function T(a){try{let b=null;try{let a=globalThis[Symbol.for("__cloudflare-context__")];a?.env?.DB&&(b=a.env.DB)}catch(a){}if(b||(b=function(a){if("undefined"!=typeof process&&process.env.DB)return process.env.DB;try{let a=globalThis[Symbol.for("__cloudflare-context__")];if(a?.env?.DB)return a.env.DB}catch(a){}return null}()),!b)return console.error("[POST /api/whatsapp/webhook] DB not available"),u.NextResponse.json({error:"Database not available"},{status:503});let c=await a.json();console.log("[POST /api/whatsapp/webhook] Received:",JSON.stringify(c,null,2));let d=c.entry?.[0],e=d?.changes?.[0],f=e?.value;if(!f)return u.NextResponse.json({received:!0});let g=f.messages||[];try{await b.prepare(`
        CREATE TABLE IF NOT EXISTS webhook_message_processed (
          message_id TEXT PRIMARY KEY,
          processed_at TEXT DEFAULT (datetime('now'))
        )
      `).run()}catch(a){}for(let a of g){let c=a.from,d=a.type,e=a.id;try{let a=await b.prepare("INSERT OR IGNORE INTO webhook_message_processed (message_id) VALUES (?)").bind(e).run();if((a?.meta?.changes??0)===0){console.log("[POST /api/whatsapp/webhook] Skipping already processed message:",e);continue}}catch(a){if(a?.message?.includes("no such table"));else throw a}console.log("[POST /api/whatsapp/webhook] Processing message:",{from:c,messageType:d,messageId:e});let f=await E(b,c);if(!f){await J(w,v,c,"❌ No est\xe1s registrado en el sistema. Por favor, contacta a la administraci\xf3n.");continue}if("text"===d){let d=a.text?.body?.toLowerCase().trim()||"";d.includes("ver")&&(d.includes("clase")||d.includes("clases"))?await O(b,f.id,c):d.includes("agendar")||d.includes("inscribir")||d.includes("reservar")?await P(b,f.id,c):d.includes("cancelar")||d.includes("cancel")?await Q(b,f.id,c):await K(w,v,c,`\xa1Hola ${f.nombre}! 👋

\xbfEn qu\xe9 te puedo ayudar?`,[{id:"cancelar",title:"❌ Cancelar clase"},{id:"reservar",title:"✅ Reservar clase"},{id:"ver_clases",title:"\uD83D\uDCC5 Ver mis clases"}])}else if("interactive"===d){let d=a.interactive,e=d?.button_reply?.id||d?.list_reply?.id;try{if("ver_clases"===e)await O(b,f.id,c);else if("cancelar"===e)await Q(b,f.id,c);else if("reservar"===e)await P(b,f.id,c);else if(e?.startsWith("ver_mas_clases_")){let a=parseInt(e.split("_").pop()||"0",10)||0;await P(b,f.id,c,a)}else if(e?.startsWith("reservar_")){let a=e.split("_");if(3===a.length){let d=parseInt(a[1],10),e=a[2],g=null;try{g=await b.prepare("SELECT activa FROM clase WHERE id = ?").bind(d).first()}catch{}if(g&&0===g.activa){await J(w,v,c,"❌ Esa clase no est\xe1 disponible en este momento.");continue}try{if(await b.prepare("SELECT 1 FROM clase_desactivada WHERE clase_id = ? AND fecha_clase = ?").bind(d,e).first()){await J(w,v,c,"❌ Esa fecha no est\xe1 disponible para reservar.");continue}}catch{}if(await M(b,f.id)<=0){await J(w,v,c,"❌ No tienes clases a recuperar disponibles.");continue}try{if(await b.prepare(`
                SELECT r.* FROM reserva r
                WHERE r.usuario_id = ? AND r.clase_id = ?
                  AND (r.fecha_clase IS NULL OR r.fecha_clase = 'null' OR r.fecha_clase = '' OR r.fecha_clase = ?)
                  AND NOT EXISTS (
                    SELECT 1 FROM cancelacion c
                    WHERE c.usuario_id = r.usuario_id
                      AND c.clase_id = r.clase_id
                      AND c.fecha_clase = ?
                  )
              `).bind(f.id,d,e,e).first()){await J(w,v,c,"⚠️ Ya est\xe1s inscripto en esa clase.");continue}let a=await b.prepare(`
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
              `).bind(d,e).first(),g=await b.prepare(`
                SELECT COUNT(DISTINCT r.usuario_id) as count
                FROM reserva r
                WHERE r.clase_id = ? AND r.fecha_clase = ? AND r.es_reasignacion = 1
                  AND NOT EXISTS (
                    SELECT 1 FROM cancelacion c
                    WHERE c.usuario_id = r.usuario_id
                      AND c.clase_id = r.clase_id
                      AND c.fecha_clase = r.fecha_clase
                  )
              `).bind(d,e).first(),h=Number(a?.count||0),i=Number(g?.count||0),j=h+i;if(console.log(`[reservar_clase] Cupo calculado para clase ${d}, fecha ${e}: ${j}/35 (fijas: ${h}, temporales: ${i})`),j>=35){try{let a=await b.prepare(`
                    SELECT COALESCE(MAX(numero), 0) as max_num
                    FROM lista_espera
                    WHERE clase_id = ? AND fecha_clase = ?
                  `).bind(d,e).first(),g=Number(a?.max_num||0)+1;await b.prepare(`
                    INSERT INTO lista_espera (usuario_id, clase_id, fecha_clase, numero, created_at)
                    VALUES (?, ?, ?, ?, datetime('now'))
                  `).bind(f.id,d,e,g).run(),await J(w,v,c,`⏳ Cupo completo. Te agregu\xe9 a la lista de espera (posici\xf3n ${g}).

📩 Te voy a avisar por WhatsApp cuando se confirme un cupo.`)}catch{await J(w,v,c,"⏳ Cupo completo. Contact\xe1 a la administraci\xf3n para lista de espera.\n\n\uD83D\uDCE9 Cuando se libere un cupo, te avisaremos por WhatsApp.")}continue}await b.prepare(`
                INSERT INTO reserva (usuario_id, clase_id, fecha_clase, es_reasignacion, created_at)
                VALUES (?, ?, ?, 1, datetime('now'))
              `).bind(f.id,d,e).run();let k=await b.prepare(`
                SELECT id FROM clase_recuperar
                WHERE usuario_id = ? AND usado = 0 AND fecha_vencimiento >= date('now')
                ORDER BY fecha_vencimiento ASC, id ASC
                LIMIT 1
              `).bind(f.id).first();k?.id&&await b.prepare(`
                  UPDATE clase_recuperar
                  SET usado = 1, fecha_uso = date('now')
                  WHERE id = ?
                `).bind(k.id).run(),await J(w,v,c,"✅ Reserva realizada exitosamente. Respond\xe9 cualquier mensaje para volver al men\xfa.")}catch(a){console.error("[reservar_clase] Error:",a),await J(w,v,c,`❌ Error al reservar: ${a?.message||"Error desconocido"}`)}}}else if(e?.startsWith("cancelar_")){let a=e.split("_");if(3===a.length){let d=parseInt(a[1]),e=a[2],g=await R(b,f.id,d,e);if(g.success){let a="✅ Clase cancelada exitosamente\n";a+=`Clase cancelada: ${g.fechaFormateada}
Se te ha asignado ${g.totalClasesRecuperar} clase${g.totalClasesRecuperar>1?"s":""} a recuperar que puedes usar en los pr\xf3ximos 30 d\xedas.
Responde cualquier mensaje para volver al men\xfa.`,await J(w,v,c,a)}else await J(w,v,c,`❌ ${g.message}`)}}}catch(a){console.error("[POST /api/whatsapp/webhook] Error:",a),await J(w,v,c,"Ocurri\xf3 un error. Volv\xe9 a intentar en un momento.")}}}return u.NextResponse.json({received:!0})}catch(a){return console.error("[POST /api/whatsapp/webhook] Error:",a),u.NextResponse.json({error:a.message||"Internal server error"},{status:500})}}process.env.WHATSAPP_TEMPLATE_NAME;let U=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/whatsapp/webhook/route",pathname:"/api/whatsapp/webhook",filename:"route",bundlePath:"app/api/whatsapp/webhook/route"},distDir:".next",projectDir:"",resolvedPagePath:"/Users/alko/clases-bot/app/api/whatsapp/webhook/route.ts",nextConfigOutput:"standalone",userland:d}),{workAsyncStorage:V,workUnitAsyncStorage:W,serverHooks:X}=U;function Y(){return(0,g.patchFetch)({workAsyncStorage:V,workUnitAsyncStorage:W})}async function Z(a,b,c){var d;let e="/api/whatsapp/webhook/route";"/index"===e&&(e="/");let g=await U.prepare(a,b,{srcPage:e,multiZoneDraftMode:"false"});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:u,params:v,nextConfig:w,isDraftMode:x,prerenderManifest:y,routerServerContext:z,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,resolvedPathname:C}=g,D=(0,j.normalizeAppPath)(e),E=!!(y.dynamicRoutes[D]||y.routes[C]);if(E&&!x){let a=!!y.routes[C],b=y.dynamicRoutes[D];if(b&&!1===b.fallback&&!a)throw new s.NoFallbackError}let F=null;!E||U.isDev||x||(F="/index"===(F=C)?"/":F);let G=!0===U.isDev||!E,H=E&&!G,I=a.method||"GET",J=(0,i.getTracer)(),K=J.getActiveScopeSpan(),L={params:v,prerenderManifest:y,renderOpts:{experimental:{dynamicIO:!!w.experimental.dynamicIO,authInterrupts:!!w.experimental.authInterrupts},supportsDynamicResponse:G,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=w.experimental)?void 0:d.cacheLife,isRevalidate:H,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>U.onRequestError(a,b,d,z)},sharedContext:{buildId:u}},M=new k.NodeNextRequest(a),N=new k.NodeNextResponse(b),O=l.NextRequestAdapter.fromNodeNextRequest(M,(0,l.signalFromNodeResponse)(b));try{let d=async c=>U.handle(O,L).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=J.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${I} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${I} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&A&&B&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=L.renderOpts.fetchMetrics;let i=L.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=L.renderOpts.collectedTags;if(!E)return await (0,o.I)(M,N,e,L.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==L.renderOpts.collectedRevalidate&&!(L.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&L.renderOpts.collectedRevalidate,d=void 0===L.renderOpts.collectedExpire||L.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:L.renderOpts.collectedExpire;return{value:{kind:t.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await U.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:H,isOnDemandRevalidate:A})},z),b}},l=await U.handleResponse({req:a,nextConfig:w,cacheKey:F,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:y,isRoutePPREnabled:!1,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,responseGenerator:k,waitUntil:c.waitUntil});if(!E)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==t.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",A?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),x&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&E||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(M,N,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};K?await g(K):await J.withPropagatedContext(a.headers,()=>J.trace(m.BaseServerSpan.handleRequest,{spanName:`${I} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":I,"http.target":a.url}},g))}catch(b){if(K||b instanceof s.NoFallbackError||await U.onRequestError(a,b,{routerKind:"App Router",routePath:D,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:H,isOnDemandRevalidate:A})}),E)throw b;return await (0,o.I)(M,N,new Response(null,{status:500})),null}}},8335:()=>{},9294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")}};var b=require("../../../../webpack-runtime.js");b.C(a);var c=b.X(0,[431,55],()=>b(b.s=6640));module.exports=c})();