# Entrevista Front End Developer – Cómo usar el proyecto clases-bot

Documento para defender los requisitos del puesto usando el proyecto **clases-bot** como ejemplo. Incluye puntos en **inglés** y **español**, más **pronunciación en fonética española** para leer en voz alta en inglés.

**Guía de pronunciación (fonética en español):**  
- *th* como en "think" → **z** (o se escribe "z" entre vocales cuando suena suave).  
- *th* como en "the" → **d**.  
- *sh* → **sh** (como "sh" en inglés).  
- *ng* → **ng** (nasal).  
- *w* → **u** o **gu** (ej. "wait" = uéit).  
- *y* como consonante → **y** (ej. "you" = iú).  
- Vocales: *a* corta (cat) = **á**; *i* corta (bit) = **i**; *e* corta (get) = **e**; *oo* (book) = **u**; *ee* (see) = **i**; *er* final = **ar**; *ou* (out) = **au**.  
- Acentuación: la sílaba tónica va en **negrita** o con tilde (é, á, í, ó, ú).  
- **éi-pi-ái** = API; **és-kiu-él** = SQL; **dí-bí** = DB.

---

## 1. React.js + Next.js

**English:**  
*"I built a full-stack app with **React 18** and **Next.js 15**: multiple pages (bookings, calendar, classes, users, cancellations), client components with `useState`/`useEffect`, and a shared `fetchWithErrorHandling` wrapper for all API calls. The app uses the **App Router**, TypeScript, and is deployed on **Cloudflare Pages** via OpenNext."*

**Pronunciación (fonética en español):**  
*"Ai bilt a ful-sták áp uiz **Ríact eitin** and **Nekst.yéi 15**: múltipl péichis (búkings, kálendar, cláses, iúsers, kanseléishons), cláient compóunents uiz \`iúsEstéit\`/\`iúsEfíct\`, and a shéard \`fechUizErrorJándling\` ráper for ol **éi-pi-ái** cols. Di áp iúsas di **Áp Ráuter**, **TáipSkript**, and is deplóid on **Cláudflér Péichis** váia OpenNekst."*

**Español:**  
*"Desarrollé una aplicación full-stack con **React 18** y **Next.js 15**: varias páginas (reservas, calendario, clases, usuarios, cancelaciones), componentes cliente con `useState`/`useEffect` y un helper `fetchWithErrorHandling` para las llamadas a la API. Usa **App Router**, TypeScript y está desplegada en **Cloudflare Pages** con OpenNext."*

**Dónde está en el código:**  
`app/reservas/page.tsx`, `app/calendario/page.tsx`, `app/clases/page.tsx`, `lib/frontend-error-handler.ts`, `package.json` (Next 15, React 18).

---

## 2. REST APIs

**English:**  
*"I designed and implemented **REST APIs** in Next.js Route Handlers: GET/POST/DELETE for bookings (with query params like `usuario_id`, `clase_id`, `fecha_clase`), GET/POST for classes and users, auth login/logout, export (JSON/CSV/SQL), and a WhatsApp webhook. I use proper HTTP methods and status codes (400, 401, 503) and structured error responses."*

**Pronunciación (fonética en español):**  
*"Ai disáind and implémented **REST éi-pi-áis** in Nekst.yéi Rút Jándlers: GET/POST/DILÍT for búkings (uiz cuíri párams láik usuario_id, clase_id, fecha_clase), GET/POST for cláses and iúsers, oz login/láutaut, éksport (Yéison/SíVi/és-kiu-él), and a Guásap uíbjuk. Ai iús próper **éich-ti-ti-pi** mézods and stéitus cóuds (fór jándred, fór óuán, fái jándred zrí) and strákchad éror rispónses."*

**Español:**  
*"Diseñé e implementé **APIs REST** en Route Handlers de Next.js: GET/POST/DELETE para reservas (con query params como `usuario_id`, `clase_id`, `fecha_clase`), GET/POST para clases y usuarios, login/logout, export (JSON/CSV/SQL) y webhook de WhatsApp. Uso métodos HTTP y códigos de estado adecuados (400, 401, 503) y respuestas de error estructuradas."*

**Dónde está en el código:**  
`app/api/reservas/route.ts` (GET/POST/DELETE/PUT), `app/api/clases/route.ts`, `app/api/usuarios/route.ts`, `app/api/auth/login/route.ts`, `app/api/export/route.ts`, `app/api/whatsapp/webhook/route.ts`.

---

## 3. Base de datos (SQL) y optimización

**English:**  
*"I have strong experience with **SQL**: I use **Cloudflare D1** (SQLite-compatible) with prepared statements, migrations, and non-trivial queries—JOINs, subqueries, `EXISTS`, and transactional logic (e.g. waitlist promotion, cleanup of inconsistencies). The concepts map directly to **PostgreSQL** (schema design, migrations, parameterized queries, indexing). I also optimized by only running cleanup when specific filters are present, and by having a mock DB for local development and testability."*

**Pronunciación (fonética en español):**  
*"Ai jav stróng ekspíriens uiz **és-kiu-él**: Ai iús **Cláudflér Dí-uán** (és-kiu-láit cómpatibol) uiz prepéard stéitments, maigréishons, and non-trívial cuíris—YÓINS, sábcuíris, \`eksísts\`, and transákshonal lóyik (íi-yi uéitlist promóushon, clínap of inkonsístensis). Da cónsepts máp directli tu **Póustgres-kuél** (skíma disáin, maigréishons, parámeteraist cuíris, índeksing). Ai ólsou óptimaist bái óunli ránning clínap uén espesífik fílters ar prézent, and bái javing a mok **dí-bí** for lóukal divélopment and testabíliti."*

**Español:**  
*"Tengo experiencia sólida con **SQL**: uso **Cloudflare D1** (compatible con SQLite) con prepared statements, migraciones y consultas complejas (JOINs, subconsultas, EXISTS y lógica transaccional como promoción de lista de espera y limpieza de inconsistencias). Los conceptos se trasladan a **PostgreSQL** (diseño de esquema, migraciones, consultas parametrizadas). También optimicé ejecutando la limpieza solo cuando hay filtros concretos y usando una BD mock para desarrollo y testabilidad."*

**Dónde está en el código:**  
`app/api/reservas/route.ts` (queries con JOINs, `EXISTS`, `limpiarListaEsperaInconsistencias`, `verificarYPromoverAutomaticamente`), `lib/db.ts`, `lib/db-mock.ts`, `migrations/*.sql`.

---

## 4. Conceptualizar e implementar features y diagnosticar bugs

**English:**  
*"I implemented end-to-end features: class reservations (fixed and per-date), waitlist with automatic promotion when a spot frees up, cancellations (per date), WhatsApp confirmations via templates, and export. I also added **diagnostic/debug** endpoints (e.g. `PUT /api/reservas?action=cleanup_inconsistencias`) and centralized error handling so the frontend shows clear messages and we can trace issues by route and operation."*

**Pronunciación (fonética en español):**  
*"Ai implémented end-tu-end fíchars: clás resarvéishons (fíkst and per-déit), uéitlist uiz otomátik promóushon uén a spot frís ap, kanseléishons (per déit), Guásap konfirméishons váia témplets, and éksport. Ai ólsou áded **daiagnóstik/dibág** éndpoins (íi-yi **PUT** /éi-pi-ái/resérvas?ákshon=clínap inkonsístensis) and séntralaist éror jándling sóu da fróntend shóus clír méseichis and uí kan tréis íshus bái rút and operéishon."*

**Español:**  
*"Implementé features de punta a punta: reservas de clases (fijas y por fecha), lista de espera con promoción automática al liberarse cupo, cancelaciones por fecha, confirmaciones por WhatsApp con plantillas y export. También añadí endpoints de **diagnóstico** (ej. `PUT /api/reservas?action=cleanup_inconsistencias`) y un manejo de errores centralizado para mostrar mensajes claros y rastrear problemas por ruta y operación."*
 
**Dónde está en el código:**  
`app/api/reservas/route.ts` (PUT con `action=cleanup_inconsistencias`), `lib/error-handler.ts`, `lib/frontend-error-handler.ts`, `app/api/reservas/diagnostico-clase/route.ts`.

---

## 5. Cooperación en equipo ágil

**English:**  
*"The project has a clear structure: migrations for schema changes, shared libs (`db`, `auth`, `error-handler`), and API routes that can be worked on in parallel. I'm used to iterating with migrations and documenting behavior in code (e.g. cancellation rules, WhatsApp template handling), which fits well with agile iterations and code review."*

**Pronunciación (fonética en español):**  
*"Da próyekt jav a clír strákcha: maigréishons for skíma chéinchis, shéard libs (\`dí-bí\`, \`oz\`, \`éror-jándler\`), and **éi-pi-ái** ruts dat kan bi uórkt on in páralel. Áim iúst tu íteréiting uiz maigréishons and dókiumenting bijéivor in cóud (íi-yi kanseléishon ruls, Guásap témplet jándling), uích fits uél uiz áyail íteréishons and cóud riviu."*

**Español:**  
*"El proyecto tiene una estructura clara: migraciones para cambios de esquema, librerías compartidas (`db`, `auth`, `error-handler`) y rutas API que se pueden trabajar en paralelo. Estoy acostumbrado a iterar con migraciones y documentar el comportamiento en código (reglas de cancelación, plantillas de WhatsApp), lo que encaja con un equipo ágil y code review."*

---

## 6. Integraciones externas (WhatsApp / APIs)

**English:**  
*"I integrated the **WhatsApp Business API** (webhook for incoming messages, template messages for confirmations), with phone normalization, retries with different template languages, and logging to the database. That shows I can integrate third-party REST APIs, handle webhooks, and work with external providers in a Node/Next.js environment."*

**Pronunciación (fonética en español):**  
*"Ai íntegréited da **Guásap Bíznis éi-pi-ái** (uíbjuk foríncoming méseichis, témplet méseichis for konfirméishons), uiz fóun normalaizéishon, ritráis uiz díferent témplet lánguichis, and lógging tu da déitabéis. Dat shóus Ai kan íntegréit zerd-párti REST éi-pi-áis, jándol uíbjuks, and uórk uiz ekstérnal prováiders in a Nóud/Nekst.yéi enváiromment."*

**Español:**  
*"Integré la **API de WhatsApp Business** (webhook para mensajes entrantes, plantillas para confirmaciones), con normalización de teléfonos, reintentos con distintos idiomas de plantilla y registro en base de datos. Eso demuestra que puedo integrar APIs REST de terceros, manejar webhooks y trabajar con proveedores externos en Node/Next.js."*

**Dónde está en el código:**  
`app/api/whatsapp/webhook/route.ts`, `app/api/whatsapp/send-template/route.ts`, y la lógica de `enviarPlantillaConfirmarReserva` en `app/api/reservas/route.ts`.

---

## 7. Auth y seguridad

**English:**  
*"I implemented **cookie-based session auth** (httpOnly, secure in production, sameSite), protected routes via **Next.js middleware**, and login/logout API routes. The app also validates input (e.g. user must exist and be active before creating a reservation) and returns clear error codes like `USUARIO_DESACTIVADO` or `ALREADY_ENROLLED`."*

**Pronunciación (fonética en español):**  
*"Ai implémented **cúki-béist séshon oz** (éich-ti-ti-pi-ónli, sikúr in prodákshon, séimSáit), protéktted ruts váia **Nekst.yéi mídluér**, and login/láutaut **éi-pi-ái** ruts. Di áp ólsou válidéits ínput (íi-yi iúser mast eksíst and bi áktiv bifór kriéiting a resarvéishon) and ritérns clír éror cóuds láik \`USUARIO_DESACTIVADO\` or \`OLRÉDI enróuld\`."*

**Español:**  
*"Implementé **autenticación por sesión con cookies** (httpOnly, secure en producción, sameSite), rutas protegidas con **middleware de Next.js** y endpoints de login/logout. La app valida datos (ej. usuario debe existir y estar activo antes de crear una reserva) y devuelve códigos de error claros como `USUARIO_DESACTIVADO` o `ALREADY_ENROLLED`."*

**Dónde está en el código:**  
`middleware.ts`, `lib/auth.ts`, `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`, validaciones en `app/api/reservas/route.ts` POST.

---

## 8. Cómo hubiera utilizado MobX en este proyecto

**English:**  
*"In this app I used React `useState`/`useEffect` per page. If I were to refactor with **MobX**, I’d introduce a small set of stores that match the domain and reuse them across pages:*

- ***ReservasStore***: observable `reservas[]`, `loading`, `error`. Actions: `loadReservas(filters?)`, `addReserva(usuarioId, claseId)`, `removeReserva(usuarioId, claseId, fechaClase?)`. The calendar and bookings pages would read from this store instead of each managing its own state and refetching.*
- ***ClasesStore***: observable `clases[]`, with `loadClases()`. Used by calendar, classes page, and bookings.*
- ***UsuariosStore***: observable `usuarios[]` for the calendar modal (search/add to waitlist) and the users page.*
- ***AuthStore***: observable `isAuthenticated`, actions `login()`/`logout()`, so the Navbar and any protected UI react to auth without prop drilling.*
- ***UIStore*** (optional): `selectedClase`, `showModal`, `listaEspera` for the calendar modal—so opening a class card is a single action and any component can react.*

*I’d use **computed** for derived data: e.g. bookings grouped by `clase_id` and `fecha_clase` for the calendar grid, or filtered waitlist. **Reactions** could sync store state to the API after mutations (e.g. after `removeReserva`, call the DELETE endpoint and then refresh the store). That would give a single source of truth, less duplication between calendar and bookings pages, and easier testing by mocking stores."*

**Pronunciación (fonética en español):**  
*"In dis áp Ai iúst Ríact useState/useEffect per péich. If Ai uór tu rifákter uiz Mobéks, Áid introdús a smol set of stors dat mách da doméin and riiús dem akrós péichis: ReservasStor, ClasesStor, UsuariosStor, OzStor, UIStor. Áid iús kompiúted for diráid déita: búkings grúpt bái clase_id and fecha_clase for da kálendar grid, or fíltred uéitlist. Rikéishons kud sink stor stéit tu di éi-pi-ái áfter miutéishons—áfter removeReserva, col di DILÍT éndpoin and den rifrésh da stor. Dat uud giv a síngol sors of trúz, les diuplikéishon bituín kálendar and búkings péichis, and ízier tésting bái mókking stors."*  
*Frase final: "Ai javánt iúst Móbéks in prodákshon yet, bat Áiv zot ábau jáu it uud fít a próyekt láik dis—séntralaizing búkings, cláses and oz in stors and iúsing kompiúted válius for da kálendar—and Áim rédi tu lern it on da yob."*

**Español:**  
*"En esta app usé `useState`/`useEffect` por página. Si refactorizara con **MobX**, introduciría unos pocos stores alineados con el dominio y los reutilizaría entre páginas:*

- ***ReservasStore***: observable `reservas[]`, `loading`, `error`. Acciones: `loadReservas(filtros?)`, `addReserva(usuarioId, claseId)`, `removeReserva(usuarioId, claseId, fechaClase?)`. Las páginas de calendario y reservas leerían de este store en lugar de mantener estado propio y volver a cargar.*
- ***ClasesStore***: observable `clases[]`, con `loadClases()`. Usado por calendario, página de clases y reservas.*
- ***UsuariosStore***: observable `usuarios[]` para el modal del calendario (buscar/añadir a lista de espera) y la página de usuarios.*
- ***AuthStore***: observable `isAuthenticated`, acciones `login()`/`logout()`, para que el Navbar y la UI protegida reaccionen a la auth sin prop drilling.*
- ***UIStore*** (opcional): `selectedClase`, `showModal`, `listaEspera` del modal del calendario—así abrir una clase sería una sola acción y cualquier componente podría reaccionar.*

*Usaría **computed** para datos derivados: por ejemplo reservas agrupadas por `clase_id` y `fecha_clase` para la grilla del calendario, o lista de espera filtrada. **Reactions** podrían sincronizar el store con la API tras mutaciones (ej. tras `removeReserva`, llamar al endpoint DELETE y refrescar el store). Eso daría una única fuente de verdad, menos duplicación entre calendario y reservas, y tests más fáciles mockeando stores."*

**Ejemplo conceptual (pseudocódigo):**

```ts
// stores/ReservasStore.ts (MobX 6 + makeAutoObservable)
class ReservasStore {
  reservas: Reserva[] = [];
  loading = false;
  error: string | null = null;

  get reservasByClaseYFecha() {
    return groupBy(this.reservas, r => `${r.clase_id}-${r.fecha_clase ?? 'fija'}`);
  }

  async loadReservas(params?: { clase_id?: number; fecha_clase?: string }) {
    this.loading = true;
    this.error = null;
    try {
      const res = await fetch(`/api/reservas?${new URLSearchParams(params)}`);
      this.reservas = await res.json();
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.loading = false;
    }
  }

  async removeReserva(usuarioId: number, claseId: number, fechaClase?: string) {
    await fetch(`/api/reservas?usuario_id=...`, { method: 'DELETE' });
    await this.loadReservas({ clase_id: claseId, fecha_clase: fechaClase ?? '' });
  }
}
```

*En la entrevista puedes decir: "I haven’t used MobX in production yet, but I’ve thought about how it would fit a project like this—centralizing bookings, classes, and auth in stores and using computed values for the calendar—and I’m ready to learn it on the job."*

---

## Requisitos que no cubres con este proyecto (qué decir)

| Requisito | Situación | Sugerencia para la entrevista |
|-----------|-----------|-------------------------------|
| **MobX** | No usas MobX; usas estado local de React. | *"I haven't used MobX in production yet; I've used React state and could pick up MobX quickly. I've already thought about how I'd use it in this project—see section 8—with stores for bookings, classes, auth and computed values for the calendar."* |
| **AWS (Lambda, Transcribe, S3)** | Usas Cloudflare (D1, Pages, serverless). | *"I've used serverless and managed DB in production (Cloudflare). I'm confident I can transfer that to AWS Lambda and S3; I'd need to learn Transcribe specifically."* |
| **PostgreSQL** | Usas D1 (SQLite). | *"I use SQL daily with D1 (migrations, prepared statements, complex queries). The mental model is the same as PostgreSQL; I'd just need to learn dialect and tooling."* |
| **Redis** | No hay Redis en el proyecto. | *"I haven't used Redis in this project; I'm familiar with caching concepts and would be happy to learn Redis on the job."* |
| **GraphQL** | Solo REST. | *"I've designed and built REST APIs; I'm open to learning GraphQL if the stack uses it."* |
| **ffmpeg / ChatGPT** | No aparecen en el repo. | *"I'm interested in media processing and AI integrations; I could learn ffmpeg and ChatGPT/Node integration as needed."* |

---

## Frase corta para resumir el proyecto

**English:**  
*"I built a class-booking app with React and Next.js: REST APIs, SQL database with migrations and complex queries, waitlist with auto-promotion, WhatsApp integration, cookie-based auth with middleware, and centralized error handling. It's deployed on Cloudflare; I'm ready to apply the same skills to your stack with AWS and PostgreSQL."*

**Pronunciación (fonética en español):**  
*"Ai bilt a clás-búking áp uiz Ríact and Nekst.yéi: REST éi-pi-áis, és-kiu-él déitabéis uiz maigréishons and kómpleks cuíris, uéitlist uiz óto promóushon, Guásap íntegréishon, cúki-béist oz uiz mídluér, and séntralaist éror jándling. Íts deplóid on Cláudflér; Áim rédi tu aplái da séim skils tu yor sták uiz **éi-dábliu-és** and Póustgres-kuél."*

**Español:**  
*"Desarrollé una app de reserva de clases con React y Next.js: APIs REST, base de datos SQL con migraciones y consultas complejas, lista de espera con promoción automática, integración con WhatsApp, autenticación por cookies y middleware, y manejo de errores centralizado. Está desplegada en Cloudflare y puedo trasladar estas habilidades a vuestro stack con AWS y PostgreSQL."*
