import mongoose from 'mongoose';
import { env } from './src/config/env.js';

const BASE = 'http://localhost:3000/api';
const results = [];
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}${detail ? ` :: ${detail}` : ''}`);
};

const req = async (method, path, { token, body, contentType, raw } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (raw) { payload = raw; headers['Content-Type'] = contentType; }
  else if (body !== undefined) { payload = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, json };
};

await mongoose.connect(env.mongodb.uri);
const db = mongoose.connection.db;

const created = { images: [], services: [], professionals: [], works: [] };
const cleanup = async () => {
  if (created.works.length) await db.collection('works').deleteMany({ _id: { $in: created.works.map((i) => new mongoose.Types.ObjectId(i)) } });
  if (created.services.length) await db.collection('services').deleteMany({ _id: { $in: created.services.map((i) => new mongoose.Types.ObjectId(i)) } });
  if (created.professionals.length) await db.collection('professionals').deleteMany({ _id: { $in: created.professionals.map((i) => new mongoose.Types.ObjectId(i)) } });
  if (created.images.length) {
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'images' });
    for (const id of created.images) {
      try { await bucket.delete(new mongoose.Types.ObjectId(id)); } catch { /* ignore */ }
    }
  }
  await db.collection('users').deleteMany({ email: { $in: ['oc_probe_admin@example.com', 'oc_probe_prof@example.com'] } });
};

const png = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A, 0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x52, 0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01, 0x08,0x06,0x00,0x00,0x00,0x1F,0x15,0xC4,0x89]);

try {
  // --- auth setup ---
  await req('POST', '/auth/register', { body: { nombre: 'OC Admin', email: 'oc_probe_admin@example.com', password: 'ProbePass123!', rol: 'ADMIN' } });
  await req('POST', '/auth/register', { body: { nombre: 'OC Prof', email: 'oc_probe_prof@example.com', password: 'ProbePass123!', rol: 'PROFESIONAL' } });
  const adminLogin = await req('POST', '/auth/login', { body: { email: 'oc_probe_admin@example.com', password: 'ProbePass123!' } });
  const adminTok = adminLogin.json?.data?.accessToken;
  const profTok = (await req('POST', '/auth/login', { body: { email: 'oc_probe_prof@example.com', password: 'ProbePass123!' } })).json?.data?.accessToken;
  record('login admin devuelve rol=ADMIN', adminLogin.json?.data?.user?.rol === 'ADMIN');
  const me = await req('GET', '/auth/me', { token: adminTok });
  record('/auth/me devuelve rol=ADMIN', me.json?.data?.rol === 'ADMIN');

  // --- health ---
  const health = await req('GET', '/health/db');
  record('GET /health/db connected', health.json?.status === 'connected', JSON.stringify(health.json));

  // --- public baseline ---
  const pubS = await req('GET', '/public/services?limit=50');
  const pubP = await req('GET', '/public/professionals?limit=50');
  const pubW = await req('GET', '/public/works?limit=50');
  record('GET /public/services 200', pubS.status === 200 && Array.isArray(pubS.json.data.services));
  record('GET /public/professionals 200', pubP.status === 200 && Array.isArray(pubP.json.data.professionals));
  record('GET /public/works 200 (solo publicados)', pubW.status === 200 && Array.isArray(pubW.json.data.works));
  const publicSvcLeak = pubS.json.data.services.some((s) => 'imageId' in s || 'businessId' in s || 'isActive' in s);
  record('DTO público servicios sin fugas', !publicSvcLeak);
  const publicWorkLeak = pubW.json.data.works.some((w) => 'imageIds' in w || 'isPublished' in w || 'businessId' in w);
  record('DTO público trabajos sin fugas (imageIds/isPublished)', !publicWorkLeak);

  // --- authZ ---
  record('POST /services sin token -> 401', (await req('POST', '/services', { body: { name: 'x', durationMinutes: 1, price: 1 } })).status === 401);
  record('POST /works sin token -> 401', (await req('POST', '/works', { body: { titulo: 'x' } })).status === 401);
  record('PROFESIONAL POST /services -> denegado', [401, 403].includes((await req('POST', '/services', { token: profTok, body: { name: 'x', durationMinutes: 1, price: 1 } })).status));
  record('PROFESIONAL POST /images -> denegado', [401, 403].includes((await req('POST', '/images', { token: profTok, raw: png, contentType: 'image/png' })).status));
  record('PROFESIONAL GET /services -> 200 (lectura autenticada)', (await req('GET', '/services', { token: profTok })).status === 200);

  // --- images validation ---
  const upImg = await req('POST', '/images', { token: adminTok, raw: png, contentType: 'image/png' });
  record('POST /images PNG válido -> 201', upImg.status === 201, upImg.json?.data?.id);
  if (upImg.json?.data?.id) created.images.push(upImg.json.data.id);
  const imgId = upImg.json?.data?.id;

  const fake = Buffer.from([0x4D,0x5A,0x90,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00]);
  record('POST /images MZ falso -> 400', (await req('POST', '/images', { token: adminTok, raw: fake, contentType: 'image/png' })).status === 400);
  record('POST /images content-type no-imagen -> 400', (await req('POST', '/images', { token: adminTok, raw: png, contentType: 'application/octet-stream' })).status === 400);
  const big = Buffer.alloc(6 * 1024 * 1024, 0xFF);
  record('POST /images >5MB -> 400/413', [400, 413].includes((await req('POST', '/images', { token: adminTok, raw: big, contentType: 'image/jpeg' })).status));

  // --- image serving ---
  const served = await fetch(`${BASE}/images/${imgId}`);
  record('GET /images/:id 200 + content-type', served.status === 200 && (served.headers.get('content-type') || '').includes('image/png'), `corp=${served.headers.get('cross-origin-resource-policy')}`);
  record('GET /images/:id CORP cross-origin', served.headers.get('cross-origin-resource-policy') === 'cross-origin');
  record('GET /images/id inexistente -> 404', (await req('GET', '/images/6ad8bd000000000000000000')).status === 404);
  record('GET /images/id malformado -> 400', (await req('GET', '/images/notanid')).status === 400);

  // --- services CRUD + image ref ---
  const svc = await req('POST', '/services', { token: adminTok, body: { name: 'OC Servicio Img', durationMinutes: 30, price: 2000, imageId: imgId } });
  record('POST /services con imageId -> 201', svc.status === 201 && svc.json.data.imageUrl === `/api/images/${imgId}`);
  if (svc.json?.data?.id) created.services.push(svc.json.data.id);
  record('DELETE imagen referenciada -> 409', (await req('DELETE', `/images/${imgId}`, { token: adminTok })).status === 409);
  const pubSvcWithImg = await req('GET', '/public/services?limit=100');
  const found = pubSvcWithImg.json.data.services.find((s) => s.id === svc.json.data.id);
  record('DTO público servicio incluye imageUrl', found?.imageUrl === `/api/images/${imgId}`);

  // --- professionals ---
  const prof = await req('POST', '/professionals', { token: adminTok, body: { nombre: 'OC', apellido: 'Probe', especialidades: 'Color', imageId: imgId, services: [svc.json.data.id] } });
  record('POST /professionals con imageId+servicios -> 201', prof.status === 201 && prof.json.data.imageUrl === `/api/images/${imgId}`);
  if (prof.json?.data?.id) created.professionals.push(prof.json.data.id);
  record('POST /professionals servicio inválido -> 400', (await req('POST', '/professionals', { token: adminTok, body: { nombre: 'X', apellido: 'Y', services: ['6ad8bd000000000000000000'] } })).status === 400);
  const pubProf = await req('GET', '/public/professionals?limit=100');
  const pubProfFound = pubProf.json.data.professionals.find((p) => p.id === prof.json.data.id);
  record('DTO público profesional incluye imageUrl+especialidades', pubProfFound?.imageUrl === `/api/images/${imgId}` && pubProfFound?.especialidades === 'Color');

  // --- works publish/unpublish + multi-image ---
  const upImg2 = await req('POST', '/images', { token: adminTok, raw: png, contentType: 'image/png' });
  const imgId2 = upImg2.json?.data?.id;
  if (imgId2) created.images.push(imgId2);
  const work = await req('POST', '/works', { token: adminTok, body: { titulo: 'OC Work', categoria: 'Color', imageIds: [imgId, imgId2], isPublished: false } });
  record('POST /works (borrador) -> 201', work.status === 201 && work.json.data.imageUrls.length === 2);
  if (work.json?.data?.id) created.works.push(work.json.data.id);
  const workId = work.json?.data?.id;
  record('work borrador NO aparece en /public/works', !(await req('GET', '/public/works?limit=100')).json.data.works.some((w) => w.id === workId));
  await req('PUT', `/works/${workId}`, { token: adminTok, body: { isPublished: true } });
  record('work publicado SÍ aparece en /public/works', (await req('GET', '/public/works?limit=100')).json.data.works.some((w) => w.id === workId));
  await req('PUT', `/works/${workId}`, { token: adminTok, body: { isPublished: false } });
  record('work despublicado desaparece de /public/works', !(await req('GET', '/public/works?limit=100')).json.data.works.some((w) => w.id === workId));

  // --- image swap orphan cleanup ---
  await req('PUT', `/works/${workId}`, { token: adminTok, body: { imageIds: [imgId] } });
  await new Promise((r) => setTimeout(r, 400));
  record('imagen removida de work -> autoeliminada (404)', (await req('GET', `/images/${imgId2}`)).status === 404);
  record('imagen aún referenciada (service) -> 200', (await req('GET', `/images/${imgId}`)).status === 200);

  // --- soft delete works ---
  const del = await req('DELETE', `/works/${workId}`, { token: adminTok });
  record('DELETE /works (lógico) -> 200', del.status === 200 && del.json.data.isPublished === false);
  record('work inactivo no aparece en /public/works', !(await req('GET', '/public/works?limit=100')).json.data.works.some((w) => w.id === workId));

  // --- cleanup & verify existing data ---
  await req('PUT', `/professionals/${prof.json.data.id}`, { token: adminTok, body: { imageId: null, services: [] } });
  await req('PUT', `/services/${svc.json.data.id}`, { token: adminTok, body: { imageId: null } });
  record('imagen liberada -> autoeliminada (404)', (await req('GET', `/images/${imgId}`)).status === 404);

  const finalSvc = (await req('GET', '/public/services?limit=50')).json.data.pagination.total;
  const finalProf = (await req('GET', '/public/professionals?limit=50')).json.data.pagination.total;
  record('datos públicos existentes intactos (servicios)', finalSvc >= 3, `total=${finalSvc}`);
  record('datos públicos existentes intactos (profesionales)', finalProf >= 1, `total=${finalProf}`);
} catch (err) {
  record('EXCEPCIÓN EN SUITE', false, err.message);
} finally {
  await cleanup();
  console.log('\n--- limpieza aplicada ---');
  console.log('works totales:', await db.collection('works').countDocuments({}));
  console.log('usuarios con email probe:', await db.collection('users').countDocuments({ email: { $in: ['oc_probe_admin@example.com', 'oc_probe_prof@example.com'] } }));
  await mongoose.disconnect();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nRESUMEN: ${results.length - failed}/${results.length} PASS, ${failed} FAIL`);
  process.exit(failed ? 1 : 0);
}
