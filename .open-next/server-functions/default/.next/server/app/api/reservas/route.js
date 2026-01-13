"use strict";(()=>{var a={};a.id=961,a.ids=[961],a.modules={261:a=>{a.exports=require("next/dist/shared/lib/router/utils/app-paths")},846:a=>{a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},3033:a=>{a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},3295:a=>{a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},4870:a=>{a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},4898:(a,b,c)=>{c.r(b),c.d(b,{handler:()=>L,patchFetch:()=>K,routeModule:()=>G,serverHooks:()=>J,workAsyncStorage:()=>H,workUnitAsyncStorage:()=>I});var d={};c.r(d),c.d(d,{DELETE:()=>F,GET:()=>D,POST:()=>E});var e=c(6559),f=c(8088),g=c(7719),h=c(6191),i=c(1289),j=c(261),k=c(2603),l=c(9893),m=c(4823),n=c(7220),o=c(6946),p=c(7912),q=c(9786),r=c(6143),s=c(6439),t=c(3365),u=c(2190),v=c(9949),w=c(857);function x(a){let b=globalThis[Symbol.for("__cloudflare-context__")],c=b?.env?.[a]??("undefined"!=typeof process?process.env?.[a]:void 0);return"string"==typeof c?c:""}async function y(a){try{await a.prepare("SELECT 1 FROM whatsapp_template_log LIMIT 1").first();return}catch(b){if(!b?.message?.includes("no such table"))return;await a.prepare(`
      CREATE TABLE IF NOT EXISTS whatsapp_template_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        usuario_id INTEGER,
        clase_id INTEGER,
        fecha_clase TEXT,
        telefono_raw TEXT,
        to_num TEXT,
        template_name TEXT,
        template_lang TEXT,
        http_status INTEGER,
        ok INTEGER,
        response_text TEXT
      )
    `).run()}}async function z(a){let{db:b,usuarioId:c,claseId:d,fechaClase:e,telefonoRaw:f}=a,g=x("WHATSAPP_TOKEN"),h=x("PHONE_NUMBER_ID"),i=function(){let a=x("WHATSAPP_CONFIRMAR_RESERVA_TEMPLATE")||x("WHATSAPP_TEMPLATE_NAME");return a&&"hello_world"!==a?a:"confirmar_reserva"}();if(!g||!h)return console.warn("[enviarPlantillaConfirmarReserva] WHATSAPP_TOKEN o PHONE_NUMBER_ID no configurados"),!1;let j=`https://graph.facebook.com/v18.0/${h}/messages`,k=function(a){let b=String(a||"").replace(/\D/g,""),c=[function(a){let b=String(a||"").replace(/\D/g,"");if(!b)return"";let c=b;return c.startsWith("0")&&(c=c.slice(1)),c.startsWith("54")&&!c.startsWith("549")?c="549"+c.slice(2):c.startsWith("54")||10!==c.length&&11!==c.length||(c="549"+c),c}(a),b];c[0]?.startsWith("549")&&c.push("54"+c[0].slice(3)),b.startsWith("54")&&!b.startsWith("549")&&c.push("549"+b.slice(2));let d=new Set;return c.map(a=>String(a||"").trim()).filter(a=>a&&!d.has(a)&&(d.add(a),!0))}(f),l=function(){let a=[x("WHATSAPP_TEMPLATE_LANG"),"es_AR","es","es_ES"].filter(Boolean),b=new Set;return a.filter(a=>!b.has(a)&&(b.add(a),!0))}();if(0===k.length)return console.warn("[enviarPlantillaConfirmarReserva] Tel\xe9fono vac\xedo, no se puede enviar template"),!1;try{for(let a of(await y(b),k))for(let h of l){let k={messaging_product:"whatsapp",to:a,type:"template",template:{name:i,language:{code:h}}},l=await fetch(j,{method:"POST",headers:{Authorization:`Bearer ${g}`,"Content-Type":"application/json"},body:JSON.stringify(k)}),m=await l.text();if(l.ok){console.log("[enviarPlantillaConfirmarReserva] OK",{to:a,templateName:i,templateLang:h});try{await b.prepare(`
              INSERT INTO whatsapp_template_log
              (usuario_id, clase_id, fecha_clase, telefono_raw, to_num, template_name, template_lang, http_status, ok, response_text)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            `).bind(c??null,d??null,e??null,f,a,i,h,l.status,m.slice(0,900)).run()}catch(a){console.error("[enviarPlantillaConfirmarReserva] Error guardando log (ok):",a?.message||a)}return!0}console.error("[enviarPlantillaConfirmarReserva] Error",{status:l.status,to:a,templateName:i,templateLang:h,body:m});try{await b.prepare(`
            INSERT INTO whatsapp_template_log
            (usuario_id, clase_id, fecha_clase, telefono_raw, to_num, template_name, template_lang, http_status, ok, response_text)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
          `).bind(c??null,d??null,e??null,f,a,i,h,l.status,m.slice(0,900)).run()}catch(a){console.error("[enviarPlantillaConfirmarReserva] Error guardando log (error):",a?.message||a)}}return!1}catch(a){return console.error("[enviarPlantillaConfirmarReserva] Exception:",a?.message||a),!1}}async function A(a,b,c){try{let d=`
      SELECT le.*, r.usuario_id as reserva_usuario_id
      FROM lista_espera le
      INNER JOIN reserva r ON (
        r.usuario_id = le.usuario_id
        AND r.clase_id = le.clase_id
        AND r.fecha_clase = le.fecha_clase
        AND r.es_reasignacion = 1
      )
    `,e=[];b&&c&&(d+=" WHERE le.clase_id = ? AND le.fecha_clase = ?",e.push(b,c));let f=[];try{(f=(await a.prepare(d).bind(...e).all()).results||[]).length>0&&console.log(`[limpiarListaEsperaInconsistencias] 🔍 Encontradas ${f.length} inconsistencias:`,f.map(a=>({usuario_id:a.usuario_id,clase_id:a.clase_id,fecha_clase:a.fecha_clase})))}catch(a){console.warn("[limpiarListaEsperaInconsistencias] Error al consultar inconsistencias:",a.message||a)}let g=`
      DELETE FROM lista_espera
      WHERE EXISTS (
        SELECT 1 FROM reserva r
        WHERE r.usuario_id = lista_espera.usuario_id
          AND r.clase_id = lista_espera.clase_id
          AND r.fecha_clase = lista_espera.fecha_clase
          AND r.es_reasignacion = 1
      )
    `,h=[];b&&c&&(g+=" AND lista_espera.clase_id = ? AND lista_espera.fecha_clase = ?",h.push(b,c));let i=await a.prepare(g).bind(...h).run(),j=i?.changes||0;return j>0?console.log(`[limpiarListaEsperaInconsistencias] ✅ Eliminados ${j} registros inconsistentes de lista_espera`,{claseIdNum:b,fechaClase:c,detalles:f.slice(0,5).map(a=>({usuario_id:a.usuario_id,clase_id:a.clase_id,fecha_clase:a.fecha_clase}))}):0===f.length&&console.log(`[limpiarListaEsperaInconsistencias] ✅ No se encontraron inconsistencias`,{claseIdNum:b,fechaClase:c}),j}catch(a){if(a.message&&a.message.includes("no such table"))return console.log("[limpiarListaEsperaInconsistencias] Tabla lista_espera no existe, no hay nada que limpiar"),0;return console.error("[limpiarListaEsperaInconsistencias] Error:",a.message||a),0}}async function B(a,b,c){let d=0,e=0,f=!1;for(;e<10;){e++,f||(await A(a,b,c),f=!0);let g=await a.prepare(`
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
    `).bind(b,c).first(),h=g?.count||0,i=await a.prepare(`
      SELECT COUNT(DISTINCT usuario_id) as count
      FROM reserva
      WHERE clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
    `).bind(b,c).first(),j=h+(i?.count||0),k=35-j;if(k<=0){console.log(`[verificarYPromoverAutomaticamente] No hay cupo disponible para ${c}`,{totalConfirmados:j,cupoMaximo:35,cupoDisponible:k});break}let l=await a.prepare(`
      SELECT * FROM lista_espera
      WHERE clase_id = ? AND fecha_clase = ?
      ORDER BY numero ASC
      LIMIT 1
    `).bind(b,c).first();if(!l){console.log(`[verificarYPromoverAutomaticamente] No hay nadie en lista de espera para ${c}`);break}let m=l.usuario_id;if(console.log(`[verificarYPromoverAutomaticamente] 🔄 Promoviendo usuario de lista de espera (iteraci\xf3n ${e}):`,{usuario_id:m,numero_en_lista:l.numero,cupo_disponible:k,total_confirmados:j}),await a.prepare(`
      SELECT * FROM reserva 
      WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
    `).bind(m,b,c).first())await a.prepare(`
        DELETE FROM lista_espera
        WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
      `).bind(m,b,c).run(),console.log(`[verificarYPromoverAutomaticamente] ⚠️ Usuario ya ten\xeda reserva, eliminado de lista de espera`);else{await a.prepare(`
        INSERT INTO reserva (usuario_id, clase_id, fecha_clase, es_reasignacion, created_at)
        VALUES (?, ?, ?, 1, datetime('now'))
      `).bind(m,b,c).run(),await a.prepare(`
        DELETE FROM lista_espera
        WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
      `).bind(m,b,c).run();let e=(await a.prepare(`
        SELECT * FROM lista_espera
        WHERE clase_id = ? AND fecha_clase = ?
        ORDER BY numero ASC
      `).bind(b,c).all()).results||[];for(let d=0;d<e.length;d++)await a.prepare(`
          UPDATE lista_espera
          SET numero = ?
          WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
        `).bind(d+1,e[d].usuario_id,b,c).run();try{let d=await a.prepare("SELECT telefono FROM usuario WHERE id = ?").bind(m).first(),e=d?.telefono?String(d.telefono):"";e&&await z({db:a,usuarioId:m,claseId:b,fechaClase:c,telefonoRaw:e})}catch(a){console.error("[verificarYPromoverAutomaticamente] Error notificando por WhatsApp:",a?.message||a)}d++,console.log(`[verificarYPromoverAutomaticamente] ✅ Usuario promovido exitosamente (total: ${d})`)}}return d>0&&console.log(`[verificarYPromoverAutomaticamente] ✅ Promoci\xf3n autom\xe1tica completada: ${d} usuario(s) promovido(s) para ${c}`),d}async function C(a,b,c){await A(a,b,c);try{let d=await a.prepare(`
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
    `).bind(b,c).first(),e=d?.count||0,f=await a.prepare(`
      SELECT COUNT(DISTINCT usuario_id) as count
      FROM reserva
      WHERE clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
    `).bind(b,c).first(),g=f?.count||0,h=e+g,i=35-h;if(console.log(`[promoverDeListaEspera] Cupo para fecha ${c}:`,{countFijas:e,countTemporales:g,totalConfirmados:h,cupoDisponible:i,cupoMaximo:35}),i>0){let d=await a.prepare(`
        SELECT * FROM lista_espera
        WHERE clase_id = ? AND fecha_clase = ?
        ORDER BY numero ASC
        LIMIT 1
      `).bind(b,c).first();if(d){let e=d.usuario_id,f=d.numero;if(console.log(`[promoverDeListaEspera] ✅ Usuario encontrado en lista de espera para ${c}:`,{usuario_id:e,numero_en_lista:f,cupo_disponible:i}),await a.prepare(`
          SELECT * FROM reserva 
          WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
        `).bind(e,b,c).first()){console.log(`[promoverDeListaEspera] ⚠️ Usuario ya tiene reserva para ${c}, eliminando de lista de espera...`),await a.prepare(`
            DELETE FROM lista_espera
            WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
          `).bind(e,b,c).run();try{let d=await a.prepare("SELECT telefono FROM usuario WHERE id = ?").bind(e).first(),f=d?.telefono?String(d.telefono):"";if(f){let d=await z({db:a,usuarioId:e,claseId:b,fechaClase:c,telefonoRaw:f});console.log("[promoverDeListaEspera] Resultado env\xedo template (ya ten\xeda reserva):",{ok:d,usuario_id:e,clase_id:b,fecha_clase:c})}else console.warn("[promoverDeListaEspera] No se pudo notificar (reserva ya existente): tel\xe9fono vac\xedo",{usuario_id:e})}catch(a){console.error("[promoverDeListaEspera] Error notificando (reserva ya existente):",a?.message||a)}}else{await a.prepare(`
            INSERT INTO reserva (usuario_id, clase_id, fecha_clase, es_reasignacion, created_at)
            VALUES (?, ?, ?, 1, datetime('now'))
          `).bind(e,b,c).run(),console.log(`[promoverDeListaEspera] ✅ Reserva temporal creada para ${c}`,{usuario_id:e,clase_id:b,fecha_clase:c}),await a.prepare(`
            DELETE FROM lista_espera
            WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
          `).bind(e,b,c).run();try{let d=await a.prepare("SELECT telefono FROM usuario WHERE id = ?").bind(e).first(),f=d?.telefono?String(d.telefono):"";if(f){let d=await z({db:a,usuarioId:e,claseId:b,fechaClase:c,telefonoRaw:f});console.log("[promoverDeListaEspera] Resultado env\xedo template (nuevo confirmado):",{ok:d,usuario_id:e,clase_id:b,fecha_clase:c})}else console.warn("[promoverDeListaEspera] No se pudo notificar: tel\xe9fono vac\xedo",{usuario_id:e})}catch(a){console.error("[promoverDeListaEspera] Error notificando por WhatsApp:",a?.message||a)}let d=(await a.prepare(`
            SELECT * FROM lista_espera
            WHERE clase_id = ? AND fecha_clase = ?
            ORDER BY numero ASC
          `).bind(b,c).all()).results||[];for(let e=0;e<d.length;e++)await a.prepare(`
              UPDATE lista_espera
              SET numero = ?
              WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
            `).bind(e+1,d[e].usuario_id,b,c).run();console.log(`[promoverDeListaEspera] ✅ Usuario promovido exitosamente para ${c}`,{usuario_id:e,usuarios_restantes_en_lista:d.length})}}else console.log(`[promoverDeListaEspera] No hay usuarios en lista de espera para ${c}`)}else console.log(`[promoverDeListaEspera] No hay cupo disponible para ${c} (${h}/35)`)}catch(a){throw console.error(`[promoverDeListaEspera] Error procesando fecha ${c}:`,a.message),a}}async function D(a){console.log("[GET /api/reservas] Starting request",{environment:(0,w.cR)().environment});try{let b=null,c=globalThis[Symbol.for("__cloudflare-context__")];if(c?.env?.DB&&(b=c.env.DB,console.log("[GET /api/reservas] DB obtained from Cloudflare context (OpenNext)")),!b&&"undefined"!=typeof process&&process.env.DB&&(b=process.env.DB,console.log("[GET /api/reservas] DB obtained from process.env.DB (OpenNext fallback)")),b||(b=(0,v.O)(),console.log("[GET /api/reservas] Using mock DB as fallback")),!b)return u.NextResponse.json({error:"Base de datos no disponible"},{status:503});let{searchParams:d}=new URL(a.url),e=d.get("usuario_id"),f=d.get("clase_id"),g=d.get("fecha_clase"),h="true"===d.get("include_reasignaciones");try{g&&f?await B(b,Number(f),g):await A(b)}catch(a){console.warn("[GET /api/reservas] Error en limpieza/promoci\xf3n autom\xe1tica (no cr\xedtico):",a.message||a)}let i=`
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
      )`),k.push(g)):h||j.push("(r.fecha_clase IS NULL OR r.fecha_clase = 'null' OR r.fecha_clase = '' OR r.es_reasignacion = 0 OR r.es_reasignacion IS NULL)"),j.length>0&&(i+=" AND "+j.join(" AND "));let l={Lun:1,Mar:2,Jue:3,Sab:4};i+=" ORDER BY c.dia, c.hora, u.apellido, u.nombre";let m=[];try{let a=b.prepare(i);m=(k.length>0?await a.bind(...k).all():await a.all()).results||[]}catch(a){console.error("[GET /api/reservas] Error ejecutando query:",a),m=[]}return m.sort((a,b)=>{let c=l[a.dia]||99,d=l[b.dia]||99;return c!==d?c-d:a.hora.localeCompare(b.hora)}),console.log("[GET /api/reservas] Success",{count:m.length}),u.NextResponse.json(m)}catch(a){return(0,w.WX)(a,"Error al obtener reservas",{route:"/api/reservas",method:"GET",operation:"fetch_reservas"})}}async function E(a){console.log("[POST /api/reservas] Starting request",{environment:(0,w.cR)().environment});try{let b=null,c=globalThis[Symbol.for("__cloudflare-context__")];if(c?.env?.DB&&(b=c.env.DB,console.log("[POST /api/reservas] DB obtained from Cloudflare context (OpenNext)")),!b)return console.error("[POST /api/reservas] DB not available in production"),u.NextResponse.json({error:"Base de datos no disponible",details:"El binding de D1 no est\xe1 configurado correctamente"},{status:503});if(!b)return u.NextResponse.json({error:"Base de datos no disponible"},{status:503});let{usuario_id:d,clase_id:e}=await a.json();if(!d||!e)return u.NextResponse.json({error:"Faltan campos requeridos"},{status:400});let f=await b.prepare("SELECT id, activo FROM usuario WHERE id = ?").bind(d).first();if(!f)return u.NextResponse.json({error:"El alumno no existe",code:"USUARIO_NO_EXISTE"},{status:400});if(!f.activo||0===f.activo)return u.NextResponse.json({error:"No se pueden inscribir alumnos desactivados a clases",code:"USUARIO_DESACTIVADO"},{status:400});if(await b.prepare("SELECT * FROM reserva WHERE usuario_id = ? AND clase_id = ?").bind(d,e).first())return u.NextResponse.json({error:"El alumno ya est\xe1 inscrito en esta clase",code:"ALREADY_ENROLLED"},{status:400});return await b.prepare("INSERT INTO reserva (usuario_id, clase_id) VALUES (?, ?)").bind(d,e).run(),console.log("[POST /api/reservas] Success",{usuario_id:d,clase_id:e}),u.NextResponse.json({success:!0})}catch(a){return(0,w.WX)(a,"Error al crear reserva",{route:"/api/reservas",method:"POST",operation:"create_reserva"})}}async function F(a){console.log("[DELETE /api/reservas] Starting request",{environment:(0,w.cR)().environment});try{let b=null,c=globalThis[Symbol.for("__cloudflare-context__")];if(c?.env?.DB&&(b=c.env.DB,console.log("[DELETE /api/reservas] DB obtained from Cloudflare context (OpenNext)")),!b&&"undefined"!=typeof process&&process.env.DB&&(b=process.env.DB,console.log("[DELETE /api/reservas] DB obtained from process.env.DB (OpenNext fallback)")),b||(b=(0,v.O)(),console.log("[DELETE /api/reservas] Using mock DB as fallback")),!b)return u.NextResponse.json({error:"Base de datos no disponible"},{status:503});let{searchParams:d}=new URL(a.url),e=d.get("usuario_id"),f=d.get("clase_id"),g=d.get("fecha_clase");if(!e||!f)return u.NextResponse.json({error:"Usuario ID y Clase ID requeridos"},{status:400});let h="string"==typeof f?parseInt(f,10):f,i=g;if(g){if(await b.prepare(`
        SELECT * FROM reserva 
        WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
      `).bind(e,f,g).first()){let a=await b.prepare(`
          DELETE FROM reserva 
          WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
        `).bind(e,f,g).run();console.log("[DELETE /api/reservas] Reserva temporal eliminada",{usuario_id:e,clase_id:f,fecha_clase:g,changes:a?.meta?.changes||0});try{try{await b.prepare("SELECT es_temporal FROM cancelacion LIMIT 1").first()}catch(a){if(a.message&&a.message.includes("no such column"))try{await b.prepare("ALTER TABLE cancelacion ADD COLUMN es_temporal INTEGER DEFAULT 0").run(),console.log("[DELETE /api/reservas] ✅ Columna es_temporal agregada a tabla cancelacion")}catch(a){a.message?.includes("duplicate column")||console.warn("[DELETE /api/reservas] Error agregando columna es_temporal:",a.message)}}await b.prepare(`
            SELECT * FROM cancelacion
            WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ?
          `).bind(Number(e),Number(f),g).first()||(await b.prepare(`
              INSERT INTO cancelacion (usuario_id, clase_id, fecha_clase, es_temporal, created_at)
              VALUES (?, ?, ?, 1, datetime('now'))
            `).bind(Number(e),Number(f),g).run(),console.log("[DELETE /api/reservas] ✅ Cancelaci\xf3n temporal registrada en tabla cancelacion"))}catch(a){console.warn("[DELETE /api/reservas] Error registrando cancelaci\xf3n temporal (no cr\xedtico):",a.message||a)}}else if(await b.prepare(`
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
              `).bind(a,c,g).first();e?console.log("[DELETE /api/reservas] ✅ Verificaci\xf3n: Cancelaci\xf3n existe en BD",e):console.error("[DELETE /api/reservas] ❌ ERROR: Cancelaci\xf3n NO se encontr\xf3 despu\xe9s de crearla")}}catch(a){console.error("[DELETE /api/reservas] ❌ ERROR al crear cancelaci\xf3n:",{message:a.message,stack:a.stack,usuario_id:e,clase_id:f,fecha_clase:g})}console.log("[DELETE /api/reservas] Cancelaci\xf3n creada, verificando lista de espera para esta fecha")}else console.log("[DELETE /api/reservas] No se encontr\xf3 reserva temporal ni fija para eliminar");i=g}else{console.log("[DELETE /api/reservas] \uD83D\uDD0D Eliminando reserva fija permanente, claseIdNum:",h,"tipo:",typeof h);let a=await b.prepare(`
        DELETE FROM reserva 
        WHERE usuario_id = ? AND clase_id = ? 
          AND (fecha_clase IS NULL OR fecha_clase = 'null' OR fecha_clase = '')
          AND (es_reasignacion IS NULL OR es_reasignacion = 0)
      `).bind(e,f).run();console.log("[DELETE /api/reservas] ✅ Reserva fija eliminada, cambios:",a?.meta?.changes||0),console.log("[DELETE /api/reservas] \uD83D\uDD0D Buscando informaci\xf3n de clase con ID:",h);let c=await b.prepare("SELECT dia, hora, nombre FROM clase WHERE id = ?").bind(h).first();if(console.log("[DELETE /api/reservas] \uD83D\uDD0D Resultado de b\xfasqueda de clase:",c?"ENCONTRADA":"NO ENCONTRADA",c),c){let a=c.dia;console.log("[DELETE /api/reservas] \uD83D\uDD04 Reserva fija eliminada, procesando todas las fechas futuras para clase:",{clase_id:h,dia:a,hora:c.hora});let d=[],e=new Date;e.setHours(0,0,0,0);let f={Lun:1,Mar:2,Jue:4,Sab:6}[a];if(void 0!==f)for(let a=0;a<30;a++){let b=new Date(e);if(b.setDate(e.getDate()+a),b.getDay()===f){let a=b.toISOString().split("T")[0];d.push(a)}}for(let a of(console.log("[DELETE /api/reservas] \uD83D\uDCC5 Fechas futuras generadas:",d.length,d),d))try{await C(b,h,a)}catch(b){console.error(`[DELETE /api/reservas] Error procesando fecha ${a}:`,b.message)}}else console.warn("[DELETE /api/reservas] ⚠️ No se encontr\xf3 informaci\xf3n de la clase:",h);i=null}if(console.log("[DELETE /api/reservas] Reserva eliminada",{usuario_id:e,clase_id:f,fecha_clase:g}),i)try{await C(b,h,i)}catch(a){console.error("[DELETE /api/reservas] Error al promover de lista de espera:",a.message)}let j={success:!0};if(i)try{let a=await b.prepare(`
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
        `).bind(h,i).first().catch(()=>({count:0}));j.cupoFinal={fijas:a?.count||0,temporales:c?.count||0,enListaEspera:d?.count||0,totalConfirmados:(a?.count||0)+(c?.count||0)}}catch(a){console.error("[DELETE /api/reservas] Error obteniendo estado final:",a)}return console.log("[DELETE /api/reservas] Success",{usuario_id:e,clase_id:f,fecha_clase:g,respuesta:j}),u.NextResponse.json(j)}catch(a){return(0,w.WX)(a,"Error al eliminar reserva",{route:"/api/reservas",method:"DELETE",operation:"delete_reserva"})}}let G=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/reservas/route",pathname:"/api/reservas",filename:"route",bundlePath:"app/api/reservas/route"},distDir:".next",projectDir:"",resolvedPagePath:"/Users/alko/clases-bot/app/api/reservas/route.ts",nextConfigOutput:"standalone",userland:d}),{workAsyncStorage:H,workUnitAsyncStorage:I,serverHooks:J}=G;function K(){return(0,g.patchFetch)({workAsyncStorage:H,workUnitAsyncStorage:I})}async function L(a,b,c){var d;let e="/api/reservas/route";"/index"===e&&(e="/");let g=await G.prepare(a,b,{srcPage:e,multiZoneDraftMode:"false"});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:u,params:v,nextConfig:w,isDraftMode:x,prerenderManifest:y,routerServerContext:z,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,resolvedPathname:C}=g,D=(0,j.normalizeAppPath)(e),E=!!(y.dynamicRoutes[D]||y.routes[C]);if(E&&!x){let a=!!y.routes[C],b=y.dynamicRoutes[D];if(b&&!1===b.fallback&&!a)throw new s.NoFallbackError}let F=null;!E||G.isDev||x||(F="/index"===(F=C)?"/":F);let H=!0===G.isDev||!E,I=E&&!H,J=a.method||"GET",K=(0,i.getTracer)(),L=K.getActiveScopeSpan(),M={params:v,prerenderManifest:y,renderOpts:{experimental:{dynamicIO:!!w.experimental.dynamicIO,authInterrupts:!!w.experimental.authInterrupts},supportsDynamicResponse:H,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=w.experimental)?void 0:d.cacheLife,isRevalidate:I,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>G.onRequestError(a,b,d,z)},sharedContext:{buildId:u}},N=new k.NodeNextRequest(a),O=new k.NodeNextResponse(b),P=l.NextRequestAdapter.fromNodeNextRequest(N,(0,l.signalFromNodeResponse)(b));try{let d=async c=>G.handle(P,M).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=K.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${J} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${J} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&A&&B&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=M.renderOpts.fetchMetrics;let i=M.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=M.renderOpts.collectedTags;if(!E)return await (0,o.I)(N,O,e,M.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,d=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:t.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await G.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:A})},z),b}},l=await G.handleResponse({req:a,nextConfig:w,cacheKey:F,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:y,isRoutePPREnabled:!1,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,responseGenerator:k,waitUntil:c.waitUntil});if(!E)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==t.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",A?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),x&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&E||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(N,O,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};L?await g(L):await K.withPropagatedContext(a.headers,()=>K.trace(m.BaseServerSpan.handleRequest,{spanName:`${J} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":J,"http.target":a.url}},g))}catch(b){if(L||b instanceof s.NoFallbackError||await G.onRequestError(a,b,{routerKind:"App Router",routePath:D,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:A})}),E)throw b;return await (0,o.I)(N,O,new Response(null,{status:500})),null}}},6439:a=>{a.exports=require("next/dist/shared/lib/no-fallback-error.external")},9294:a=>{a.exports=require("next/dist/server/app-render/work-async-storage.external.js")}};var b=require("../../../webpack-runtime.js");b.C(a);var c=b.X(0,[431,55,305],()=>b(b.s=4898));module.exports=c})();