import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { getTelegramPublicConfig, sendTelegramMessage } from './telegram.js';

const loadLocalEnvFile = (fileName) => {
  const filePath = path.resolve(fileName);
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] != null) continue;

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
};

loadLocalEnvFile('.env');
loadLocalEnvFile('.env.local');

const app = express();
const PORT = Number(process.env.AUTH_API_PORT || 5050);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret_change_me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me';
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);
const DATABASE_URL = process.env.DATABASE_URL || '';
const POSTGRES_SSL = process.env.POSTGRES_SSL === 'true';
const STATE_TABLE = process.env.PG_STATE_TABLE || 'app_state';
const WEBHWP_ENABLED = process.env.WEBHWP_ENABLED === 'true';
const WEBHWP_SCRIPT_URL = process.env.WEBHWP_SCRIPT_URL || '';
const WEBHWP_SERVICE_URL = process.env.WEBHWP_SERVICE_URL || '';
const WEBHWP_CLIENT_ID = process.env.WEBHWP_CLIENT_ID || '';
const WEBHWP_CLIENT_SECRET = process.env.WEBHWP_CLIENT_SECRET || '';
const WEBHWP_MEETING_TEMPLATE = process.env.WEBHWP_MEETING_TEMPLATE || 'meeting-default';
const WEBHWP_BOOTSTRAP_MODE = process.env.WEBHWP_BOOTSTRAP_MODE || 'server';
const pgPool = DATABASE_URL ? new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: POSTGRES_SSL ? { rejectUnauthorized: false } : undefined,
}) : null;

const dbDir = path.resolve('server', 'db');
const authDbFile = path.join(dbDir, 'auth-db.json');
const refreshDbFile = path.join(dbDir, 'refresh-sessions.json');
const childrenDbFile = path.join(dbDir, 'children-db.json');
const staffDbFile = path.join(dbDir, 'staff-db.json');
const meetingsDbFile = path.join(dbDir, 'meetings-db.json');
const documentsDbFile = path.join(dbDir, 'documents-db.json');
const programsDbFile = path.join(dbDir, 'programs-db.json');
const calendarDbFile = path.join(dbDir, 'calendar-db.json');
const auditDbFile = path.join(dbDir, 'audit-db.json');
const documentsStorageDir = path.resolve('server', 'storage', 'documents');

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

const defaultPermissions = {
  dashboard: true,
  children: true,
  children_view: true,
  children_create: false,
  children_edit: false,
  children_delete: false,
  attendance_view: true,
  attendance_edit: false,
  attendance_excel: false,
  rfid_access: true,
  calendar: true,
  calendar_google: true,
  calendar_local: true,
  calendar_sync: false,
  staff: false,
  staff_view: false,
  staff_attendance: false,
  staff_permissions: false,
  programs: false,
  meetings: false,
  stats: false,
  facility: false,
  public: false,
};

const readJson = (filePath, fallback) => {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

const readState = async (namespace, fallback) => {
  if (!pgPool) return readJson(namespace, fallback);
  const result = await pgPool.query(`SELECT payload FROM ${STATE_TABLE} WHERE namespace = $1`, [namespace]);
  if (result.rowCount === 0) return fallback;
  return result.rows[0].payload;
};

const writeState = async (namespace, data) => {
  if (!pgPool) {
    writeJson(namespace, data);
    return;
  }
  await pgPool.query(
    `INSERT INTO ${STATE_TABLE} (namespace, payload, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (namespace)
     DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
    [namespace, JSON.stringify(data)],
  );
};

const ensureDbFiles = () => {
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  if (!fs.existsSync(authDbFile)) {
    const defaultAuthDb = {
      roleTemplates: {
        NON_STAFF: defaultPermissions,
      },
      users: [
        {
          id: process.env.ADMIN_ID || 'admin',
          password: process.env.ADMIN_PASSWORD || 'admin777',
          role: 'ADMIN',
          name: '시스템 관리자',
          permissions: {},
          active: true,
        },
        {
          id: process.env.STAFF_ID || 'staff01',
          password: process.env.STAFF_PASSWORD || 'staff777',
          role: 'NON_STAFF',
          name: '일반 종사자',
          permissions: defaultPermissions,
          active: true,
        },
      ],
    };

    writeJson(authDbFile, defaultAuthDb);
  }

  if (!fs.existsSync(refreshDbFile)) {
    writeJson(refreshDbFile, { sessions: [] });
  }

  if (!fs.existsSync(childrenDbFile)) {
    writeJson(childrenDbFile, { children: [], scanLogs: [], updatedAt: null });
  }

  if (!fs.existsSync(staffDbFile)) {
    writeJson(staffDbFile, { staff: [], updatedAt: null });
  }

  if (!fs.existsSync(meetingsDbFile)) {
    writeJson(meetingsDbFile, { meetings: [], updatedAt: null });
  }

  if (!fs.existsSync(documentsDbFile)) {
    writeJson(documentsDbFile, { documents: [], updatedAt: null });
  }

  if (!fs.existsSync(programsDbFile)) {
    writeJson(programsDbFile, { programs: [], updatedAt: null });
  }

  if (!fs.existsSync(calendarDbFile)) {
    writeJson(calendarDbFile, { calendarUrl: '', events: [], updatedAt: null });
  }

  if (!fs.existsSync(auditDbFile)) {
    writeJson(auditDbFile, { logs: [], updatedAt: null });
  }

  if (!fs.existsSync(documentsStorageDir)) {
    fs.mkdirSync(documentsStorageDir, { recursive: true });
  }
};

const ensurePostgresStateTable = async () => {
  if (!pgPool) return;
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS ${STATE_TABLE} (
      namespace TEXT PRIMARY KEY,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

const seedPostgresFromJsonIfEmpty = async (namespace, filePath, fallback) => {
  if (!pgPool) return;
  const result = await pgPool.query(`SELECT 1 FROM ${STATE_TABLE} WHERE namespace = $1`, [namespace]);
  if (result.rowCount > 0) return;
  const fileData = readJson(filePath, fallback);
  await writeState(namespace, fileData);
};

const loadAuthDb = async () => (
  pgPool
    ? readState('auth', { roleTemplates: { NON_STAFF: defaultPermissions }, users: [] })
    : readJson(authDbFile, { roleTemplates: { NON_STAFF: defaultPermissions }, users: [] })
);
const saveAuthDb = async (db) => {
  if (pgPool) return writeState('auth', db);
  writeJson(authDbFile, db);
};
const loadChildrenDb = async () => (
  pgPool
    ? readState('children', { children: [], scanLogs: [], updatedAt: null })
    : readJson(childrenDbFile, { children: [], scanLogs: [], updatedAt: null })
);
const saveChildrenDb = async (db) => {
  db.updatedAt = new Date().toISOString();
  if (pgPool) return writeState('children', db);
  writeJson(childrenDbFile, db);
};
const loadStaffDb = async () => (
  pgPool
    ? readState('staff', { staff: [], updatedAt: null })
    : readJson(staffDbFile, { staff: [], updatedAt: null })
);
const saveStaffDb = async (db) => {
  db.updatedAt = new Date().toISOString();
  if (pgPool) return writeState('staff', db);
  writeJson(staffDbFile, db);
};
const loadMeetingsDb = async () => (
  pgPool
    ? readState('meetings', { meetings: [], updatedAt: null })
    : readJson(meetingsDbFile, { meetings: [], updatedAt: null })
);
const saveMeetingsDb = async (db) => {
  db.updatedAt = new Date().toISOString();
  if (pgPool) return writeState('meetings', db);
  writeJson(meetingsDbFile, db);
};
const loadDocumentsDb = async () => (
  pgPool
    ? readState('documents', { documents: [], updatedAt: null })
    : readJson(documentsDbFile, { documents: [], updatedAt: null })
);
const saveDocumentsDb = async (db) => {
  db.updatedAt = new Date().toISOString();
  if (pgPool) return writeState('documents', db);
  writeJson(documentsDbFile, db);
};
const loadProgramsDb = async () => (
  pgPool
    ? readState('programs', { programs: [], updatedAt: null })
    : readJson(programsDbFile, { programs: [], updatedAt: null })
);
const saveProgramsDb = async (db) => {
  db.updatedAt = new Date().toISOString();
  if (pgPool) return writeState('programs', db);
  writeJson(programsDbFile, db);
};
const loadCalendarDb = async () => (
  pgPool
    ? readState('calendar', { calendarUrl: '', events: [], updatedAt: null })
    : readJson(calendarDbFile, { calendarUrl: '', events: [], updatedAt: null })
);
const saveCalendarDb = async (db) => {
  db.updatedAt = new Date().toISOString();
  if (pgPool) return writeState('calendar', db);
  writeJson(calendarDbFile, db);
};
const loadAuditDb = async () => (
  pgPool
    ? readState('audit', { logs: [], updatedAt: null })
    : readJson(auditDbFile, { logs: [], updatedAt: null })
);
const saveAuditDb = async (db) => {
  db.updatedAt = new Date().toISOString();
  if (pgPool) return writeState('audit', db);
  writeJson(auditDbFile, db);
};
const formatKoreanDate = (date) => date.toLocaleDateString('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
});

const DOCUMENT_KIND = {
  HTML: 'html',
  HWPX: 'hwpx',
};

const DOCUMENT_ENGINE = {
  ROOSTER: 'rooster',
  WEBHWP: 'webhwp',
};

const normalizeDocumentKind = (value) => (
  value === DOCUMENT_KIND.HWPX ? DOCUMENT_KIND.HWPX : DOCUMENT_KIND.HTML
);

const ensureDocumentsStorageDir = () => {
  if (!fs.existsSync(documentsStorageDir)) {
    fs.mkdirSync(documentsStorageDir, { recursive: true });
  }
};

const makeDocumentFileName = (documentId, kind) => `${documentId}.${kind === DOCUMENT_KIND.HWPX ? 'hwpx' : 'html'}`;

const makeDocumentFilePath = (documentId, kind) => path.join(documentsStorageDir, makeDocumentFileName(documentId, kind));

const createDocumentRecord = ({
  id,
  ownerType = null,
  ownerId = null,
  engine = DOCUMENT_ENGINE.ROOSTER,
  kind = DOCUMENT_KIND.HTML,
  title = '',
} = {}) => {
  const resolvedKind = normalizeDocumentKind(kind);
  const now = new Date().toISOString();
  return {
    id: id || `doc_${crypto.randomUUID()}`,
    ownerType,
    ownerId: ownerId != null ? String(ownerId) : null,
    title,
    engine,
    kind: resolvedKind,
    storageType: 'file',
    fileName: null,
    filePath: null,
    mimeType: resolvedKind === DOCUMENT_KIND.HWPX ? 'application/hancom-hwpx' : 'text/html; charset=utf-8',
    version: 0,
    createdAt: now,
    updatedAt: now,
  };
};

const getDocumentPublicMeta = (documentRecord) => {
  if (!documentRecord) return null;
  const { id, ownerType, ownerId, title, engine, kind, storageType, fileName, mimeType, version, createdAt, updatedAt } = documentRecord;
  return { id, ownerType, ownerId, title, engine, kind, storageType, fileName, mimeType, version, createdAt, updatedAt };
};

const loadDocumentBody = (documentRecord) => {
  if (!documentRecord?.filePath || !fs.existsSync(documentRecord.filePath)) {
    return documentRecord?.kind === DOCUMENT_KIND.HWPX
      ? { kind: DOCUMENT_KIND.HWPX, contentBase64: '' }
      : { kind: DOCUMENT_KIND.HTML, html: '' };
  }

  if (documentRecord.kind === DOCUMENT_KIND.HWPX) {
    return {
      kind: DOCUMENT_KIND.HWPX,
      contentBase64: fs.readFileSync(documentRecord.filePath).toString('base64'),
    };
  }

  return {
    kind: DOCUMENT_KIND.HTML,
    html: fs.readFileSync(documentRecord.filePath, 'utf-8'),
  };
};

const writeDocumentBodyToStorage = (documentRecord, body) => {
  ensureDocumentsStorageDir();
  const resolvedKind = normalizeDocumentKind(body?.kind || documentRecord.kind);
  const filePath = makeDocumentFilePath(documentRecord.id, resolvedKind);
  const fileName = makeDocumentFileName(documentRecord.id, resolvedKind);

  if (resolvedKind === DOCUMENT_KIND.HWPX) {
    const contentBase64 = typeof body?.contentBase64 === 'string' ? body.contentBase64 : '';
    fs.writeFileSync(filePath, Buffer.from(contentBase64, 'base64'));
  } else {
    const html = typeof body?.html === 'string' ? body.html : '';
    fs.writeFileSync(filePath, html, 'utf-8');
  }

  if (documentRecord.filePath && documentRecord.filePath !== filePath && fs.existsSync(documentRecord.filePath)) {
    fs.rmSync(documentRecord.filePath, { force: true });
  }

  documentRecord.kind = resolvedKind;
  documentRecord.storageType = 'file';
  documentRecord.filePath = filePath;
  documentRecord.fileName = fileName;
  documentRecord.mimeType = resolvedKind === DOCUMENT_KIND.HWPX ? 'application/hancom-hwpx' : 'text/html; charset=utf-8';
  documentRecord.updatedAt = new Date().toISOString();
  return documentRecord;
};

const removeDocumentFile = (documentRecord) => {
  if (documentRecord?.filePath && fs.existsSync(documentRecord.filePath)) {
    fs.rmSync(documentRecord.filePath, { force: true });
  }
};

const upsertDocumentRecord = async ({ existingDocumentId = null, ownerType = null, ownerId = null, title = '', engine, body }) => {
  const documentsDb = await loadDocumentsDb();
  let documentRecord = existingDocumentId
    ? documentsDb.documents.find((item) => item.id === existingDocumentId)
    : null;

  if (!documentRecord) {
    documentRecord = createDocumentRecord({
      id: existingDocumentId || undefined,
      ownerType,
      ownerId,
      engine: engine || DOCUMENT_ENGINE.ROOSTER,
      kind: body?.kind || DOCUMENT_KIND.HTML,
      title,
    });
    documentsDb.documents.push(documentRecord);
  }

  documentRecord.ownerType = ownerType ?? documentRecord.ownerType ?? null;
  documentRecord.ownerId = ownerId != null ? String(ownerId) : (documentRecord.ownerId ?? null);
  documentRecord.title = title || documentRecord.title || '';
  documentRecord.engine = engine || documentRecord.engine || DOCUMENT_ENGINE.ROOSTER;

  if (body) {
    writeDocumentBodyToStorage(documentRecord, body);
  }

  documentRecord.version = Number(documentRecord.version || 0) + (body ? 1 : 0);
  if (!documentRecord.createdAt) documentRecord.createdAt = new Date().toISOString();
  documentRecord.updatedAt = new Date().toISOString();

  await saveDocumentsDb(documentsDb);
  return documentRecord;
};

const hydrateMeetingWithDocument = async (meeting, documentsDb) => {
  if (!meeting || typeof meeting !== 'object') return meeting;

  const resolvedMeeting = { ...meeting };
  if (!resolvedMeeting.documentId) {
    if (typeof resolvedMeeting.content !== 'string' || resolvedMeeting.content.length === 0) {
      return resolvedMeeting;
    }
    const documentRecord = await upsertDocumentRecord({
      ownerType: 'meeting',
      ownerId: resolvedMeeting.id,
      title: resolvedMeeting.title || '',
      engine: DOCUMENT_ENGINE.ROOSTER,
      body: { kind: DOCUMENT_KIND.HTML, html: resolvedMeeting.content },
    });
    resolvedMeeting.documentId = documentRecord.id;
    resolvedMeeting.document = getDocumentPublicMeta(documentRecord);
    return resolvedMeeting;
  }

  const documentRecord = (documentsDb?.documents || []).find((item) => item.id === resolvedMeeting.documentId);
  if (!documentRecord) return resolvedMeeting;

  resolvedMeeting.document = getDocumentPublicMeta(documentRecord);
  if (documentRecord.kind === DOCUMENT_KIND.HTML) {
    resolvedMeeting.content = loadDocumentBody(documentRecord).html;
  }

  return resolvedMeeting;
};

const migrateMeetingDocuments = async () => {
  const meetingsDb = await loadMeetingsDb();
  const documentsDb = await loadDocumentsDb();
  let meetingsChanged = false;

  for (let i = 0; i < meetingsDb.meetings.length; i += 1) {
    const meeting = meetingsDb.meetings[i];
    if (!meeting || typeof meeting !== 'object') continue;
    if (meeting.documentId || typeof meeting.content !== 'string' || meeting.content.length === 0) continue;

    const documentRecord = createDocumentRecord({
      ownerType: 'meeting',
      ownerId: meeting.id,
      engine: DOCUMENT_ENGINE.ROOSTER,
      kind: DOCUMENT_KIND.HTML,
      title: meeting.title || '',
    });
    writeDocumentBodyToStorage(documentRecord, { kind: DOCUMENT_KIND.HTML, html: meeting.content });
    documentsDb.documents.push(documentRecord);
    meetingsDb.meetings[i] = {
      ...meeting,
      documentId: documentRecord.id,
    };
    meetingsChanged = true;
  }

  if (meetingsChanged) {
    await saveDocumentsDb(documentsDb);
    await saveMeetingsDb(meetingsDb);
  }
};

const sanitizeAuditDetails = (details) => {
  if (!details || typeof details !== 'object') return details;
  const clone = JSON.parse(JSON.stringify(details));
  const walk = (value) => {
    if (!value || typeof value !== 'object') return;
    Object.keys(value).forEach((key) => {
      if (['password', 'passwordHash', 'refreshToken', 'accessToken'].includes(key)) {
        value[key] = '[REDACTED]';
        return;
      }
      walk(value[key]);
    });
  };
  walk(clone);
  return clone;
};

const recordAuditLog = async (req, entry) => {
  const auditDb = await loadAuditDb();
  const log = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actorId: req.auth?.sub || 'system',
    actorRole: req.auth?.role || 'SYSTEM',
    module: entry.module || 'unknown',
    action: entry.action || 'UPDATE',
    targetType: entry.targetType || 'record',
    targetId: entry.targetId != null ? String(entry.targetId) : null,
    targetLabel: entry.targetLabel || null,
    details: sanitizeAuditDetails(entry.details || {}),
  };

  auditDb.logs.unshift(log);
  auditDb.logs = auditDb.logs.slice(0, 1000);
  await saveAuditDb(auditDb);
  return log;
};

const resolvePermissions = (authDb, user) => {
  if (user.role === 'ADMIN') return {};
  return user.permissions || authDb.roleTemplates?.NON_STAFF || defaultPermissions;
};

const sanitizeUser = (authDb, user) => ({
  id: user.id,
  role: user.role,
  name: user.name,
  permissions: resolvePermissions(authDb, user),
  active: user.active !== false,
});

const randomSid = () => crypto.randomBytes(24).toString('hex');

const createTokens = (user, sid) => {
  const accessToken = jwt.sign(
    { sub: user.id, role: user.role, type: 'access', sid },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN },
  );

  const refreshToken = jwt.sign(
    { sub: user.id, role: user.role, type: 'refresh', sid },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN },
  );

  return { accessToken, refreshToken };
};

const loadRefreshDb = async () => (
  pgPool
    ? readState('refresh', { sessions: [] })
    : readJson(refreshDbFile, { sessions: [] })
);

const saveRefreshDb = async (db) => {
  if (pgPool) return writeState('refresh', db);
  writeJson(refreshDbFile, db);
};

const saveSession = async (sid, userId, expiresAt) => {
  const refreshDb = await loadRefreshDb();
  refreshDb.sessions.push({
    sid,
    userId,
    expiresAt,
    revoked: false,
    issuedAt: Date.now(),
  });
  await saveRefreshDb(refreshDb);
};

const revokeSessionsByUserId = async (userId) => {
  const refreshDb = await loadRefreshDb();
  refreshDb.sessions = refreshDb.sessions.map((s) => (
    s.userId === userId ? { ...s, revoked: true } : s
  ));
  await saveRefreshDb(refreshDb);
};

const revokeSessionBySid = async (sid) => {
  const refreshDb = await loadRefreshDb();
  refreshDb.sessions = refreshDb.sessions.map((s) => (
    s.sid === sid ? { ...s, revoked: true } : s
  ));
  await saveRefreshDb(refreshDb);
};

const findValidRefreshSession = async (sid, userId) => {
  const refreshDb = await loadRefreshDb();
  return refreshDb.sessions.find((s) => (
    s.sid === sid &&
    s.userId === userId &&
    !s.revoked &&
    s.expiresAt > Date.now()
  ));
};

const getBearerToken = (req) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
};

const authMiddleware = (req, res, next) => {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ message: '인증이 필요합니다.' });

  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    if (payload.type !== 'access') {
      return res.status(401).json({ message: '잘못된 토큰 타입입니다.' });
    }
    req.auth = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ message: '유효하지 않거나 만료된 토큰입니다.' });
  }
};

const adminOnly = async (req, res, next) => {
  const authDb = await loadAuthDb();
  const current = authDb.users.find((u) => u.id === req.auth.sub && u.active);
  if (!current || current.role !== 'ADMIN') {
    return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
  }
  req.currentUser = current;
  req.authDb = authDb;
  return next();
};

const stripSensitiveUser = (authDb, user) => ({
  ...sanitizeUser(authDb, user),
  hasPassword: !!user.passwordHash || !!user.password,
});

const migrateAuthDb = async () => {
  const authDb = await loadAuthDb();
  let changed = false;

  if (!authDb.roleTemplates) {
    authDb.roleTemplates = { NON_STAFF: defaultPermissions };
    changed = true;
  } else if (!authDb.roleTemplates.NON_STAFF || Object.keys(authDb.roleTemplates.NON_STAFF).length === 0) {
    authDb.roleTemplates.NON_STAFF = defaultPermissions;
    changed = true;
  }

  for (const user of authDb.users) {
    if (user.passwordHash) continue;
    if (!user.password) continue;
    user.passwordHash = await bcrypt.hash(user.password, BCRYPT_ROUNDS);
    delete user.password;
    changed = true;
  }

  if (changed) {
    await saveAuthDb(authDb);
  }
};

ensureDbFiles();
await ensurePostgresStateTable();
await seedPostgresFromJsonIfEmpty('auth', authDbFile, { roleTemplates: { NON_STAFF: defaultPermissions }, users: [] });
await seedPostgresFromJsonIfEmpty('refresh', refreshDbFile, { sessions: [] });
await seedPostgresFromJsonIfEmpty('children', childrenDbFile, { children: [], scanLogs: [], updatedAt: null });
await seedPostgresFromJsonIfEmpty('staff', staffDbFile, { staff: [], updatedAt: null });
await seedPostgresFromJsonIfEmpty('meetings', meetingsDbFile, { meetings: [], updatedAt: null });
await seedPostgresFromJsonIfEmpty('documents', documentsDbFile, { documents: [], updatedAt: null });
await seedPostgresFromJsonIfEmpty('programs', programsDbFile, { programs: [], updatedAt: null });
await seedPostgresFromJsonIfEmpty('calendar', calendarDbFile, { calendarUrl: '', events: [], updatedAt: null });
await seedPostgresFromJsonIfEmpty('audit', auditDbFile, { logs: [], updatedAt: null });
await migrateAuthDb();
await migrateMeetingDocuments();

app.get('/health', (_, res) => {
  res.json({ ok: true, service: 'groupware-auth-api-jwt', provider: pgPool ? 'postgres' : 'json' });
});

app.post('/api/auth/login', async (req, res) => {
  const { id, password } = req.body || {};
  const authDb = await loadAuthDb();
  const user = authDb.users.find((u) => u.id === id && u.active);

  if (!user || !user.passwordHash) {
    return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }

  const matched = await bcrypt.compare(password || '', user.passwordHash);
  if (!matched) {
    return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }

  const sid = randomSid();
  const tokens = createTokens(user, sid);
  const decodedRefresh = jwt.decode(tokens.refreshToken);
  await saveSession(sid, user.id, decodedRefresh.exp * 1000);

  return res.json({
    user: sanitizeUser(authDb, user),
    tokens,
  });
});

app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ message: 'refreshToken이 필요합니다.' });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    if (payload.type !== 'refresh') {
      return res.status(401).json({ message: '잘못된 토큰 타입입니다.' });
    }

    const validSession = await findValidRefreshSession(payload.sid, payload.sub);
    if (!validSession) {
      return res.status(401).json({ message: '유효한 세션이 없습니다.' });
    }

    await revokeSessionBySid(payload.sid);

    const authDb = await loadAuthDb();
    const user = authDb.users.find((u) => u.id === payload.sub && u.active);
    if (!user) {
      return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const newSid = randomSid();
    const newTokens = createTokens(user, newSid);
    const decodedRefresh = jwt.decode(newTokens.refreshToken);
    await saveSession(newSid, user.id, decodedRefresh.exp * 1000);

    return res.json({
      user: sanitizeUser(authDb, user),
      tokens: newTokens,
    });
  } catch (err) {
    return res.status(401).json({ message: '유효하지 않거나 만료된 refresh token입니다.' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const authDb = await loadAuthDb();
  const user = authDb.users.find((u) => u.id === req.auth.sub && u.active);
  if (!user) {
    return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
  }
  return res.json({ user: sanitizeUser(authDb, user) });
});

app.post('/api/auth/logout', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.json({ ok: true });

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    await revokeSessionBySid(payload.sid);
  } catch (err) {
    // idempotent logout
  }

  return res.json({ ok: true });
});

app.get('/api/webhwp/config', authMiddleware, async (_, res) => {
  return res.json({
    enabled: WEBHWP_ENABLED,
    bootstrapMode: WEBHWP_BOOTSTRAP_MODE,
    scriptUrl: WEBHWP_SCRIPT_URL,
    serviceUrl: WEBHWP_SERVICE_URL,
    templates: {
      meeting: WEBHWP_MEETING_TEMPLATE,
    },
    readiness: {
      hasServiceUrl: Boolean(WEBHWP_SERVICE_URL),
      hasScriptUrl: Boolean(WEBHWP_SCRIPT_URL),
      hasClientCredentials: Boolean(WEBHWP_CLIENT_ID && WEBHWP_CLIENT_SECRET),
    },
  });
});

app.get('/api/notifications/telegram/config', authMiddleware, adminOnly, async (_, res) => {
  return res.json(getTelegramPublicConfig());
});

app.post('/api/notifications/telegram/test', authMiddleware, adminOnly, async (req, res) => {
  const message =
    String(req.body?.message || '').trim() ||
    `SC23 테스트 알림\n관리자: ${req.auth.sub}\n시각: ${new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
    })}`;

  try {
    const result = await sendTelegramMessage({ message });
    return res.json({
      ok: true,
      delivered: true,
      messageId: result.messageId,
      chatId: result.chatId,
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      delivered: false,
      message: error instanceof Error ? error.message : String(error),
      config: getTelegramPublicConfig(),
    });
  }
});

app.get('/api/documents', authMiddleware, async (req, res) => {
  const documentsDb = await loadDocumentsDb();
  const ownerType = String(req.query.ownerType || '').trim();
  const ownerId = String(req.query.ownerId || '').trim();

  let documents = Array.isArray(documentsDb.documents) ? documentsDb.documents : [];
  if (ownerType) {
    documents = documents.filter((item) => item.ownerType === ownerType);
  }
  if (ownerId) {
    documents = documents.filter((item) => String(item.ownerId) === ownerId);
  }

  return res.json({
    documents: documents.map(getDocumentPublicMeta),
    updatedAt: documentsDb.updatedAt || null,
  });
});

app.post('/api/documents', authMiddleware, async (req, res) => {
  const { document, body } = req.body || {};
  if (!document || typeof document !== 'object') {
    return res.status(400).json({ message: 'document 객체가 필요합니다.' });
  }

  const documentRecord = await upsertDocumentRecord({
    existingDocumentId: document.id || null,
    ownerType: document.ownerType || null,
    ownerId: document.ownerId ?? null,
    title: document.title || '',
    engine: document.engine || DOCUMENT_ENGINE.ROOSTER,
    body: body || { kind: document.kind || DOCUMENT_KIND.HTML, html: '' },
  });

  await recordAuditLog(req, {
    module: 'documents',
    action: 'CREATE',
    targetType: 'document',
    targetId: documentRecord.id,
    targetLabel: documentRecord.title || documentRecord.fileName || documentRecord.id,
    details: { ownerType: documentRecord.ownerType, ownerId: documentRecord.ownerId, kind: documentRecord.kind },
  });

  return res.status(201).json({
    document: getDocumentPublicMeta(documentRecord),
    body: loadDocumentBody(documentRecord),
  });
});

app.get('/api/documents/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const includeBody = String(req.query.includeBody || 'false') === 'true';
  const documentsDb = await loadDocumentsDb();
  const documentRecord = documentsDb.documents.find((item) => item.id === id);

  if (!documentRecord) {
    return res.status(404).json({ message: '문서를 찾을 수 없습니다.' });
  }

  return res.json({
    document: getDocumentPublicMeta(documentRecord),
    body: includeBody ? loadDocumentBody(documentRecord) : undefined,
  });
});

app.put('/api/documents/:id/body', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { body, title, ownerType, ownerId, engine } = req.body || {};
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ message: 'body 객체가 필요합니다.' });
  }

  const documentRecord = await upsertDocumentRecord({
    existingDocumentId: id,
    ownerType: ownerType || null,
    ownerId: ownerId ?? null,
    title: title || '',
    engine: engine || DOCUMENT_ENGINE.ROOSTER,
    body,
  });

  await recordAuditLog(req, {
    module: 'documents',
    action: 'BODY_UPDATE',
    targetType: 'document',
    targetId: documentRecord.id,
    targetLabel: documentRecord.title || documentRecord.fileName || documentRecord.id,
    details: { version: documentRecord.version, kind: documentRecord.kind },
  });

  return res.json({
    document: getDocumentPublicMeta(documentRecord),
    body: loadDocumentBody(documentRecord),
  });
});

app.post('/api/documents/:id/clone', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { ownerType = null, ownerId = null, title = '' } = req.body || {};
  const documentsDb = await loadDocumentsDb();
  const sourceDocument = documentsDb.documents.find((item) => item.id === id);

  if (!sourceDocument) {
    return res.status(404).json({ message: '복제할 문서를 찾을 수 없습니다.' });
  }

  const clonedDocument = await upsertDocumentRecord({
    ownerType,
    ownerId,
    title: title || sourceDocument.title || '',
    engine: sourceDocument.engine,
    body: loadDocumentBody(sourceDocument),
  });

  await recordAuditLog(req, {
    module: 'documents',
    action: 'CLONE',
    targetType: 'document',
    targetId: clonedDocument.id,
    targetLabel: clonedDocument.title || clonedDocument.fileName || clonedDocument.id,
    details: { sourceDocumentId: sourceDocument.id },
  });

  return res.status(201).json({
    document: getDocumentPublicMeta(clonedDocument),
    body: loadDocumentBody(clonedDocument),
  });
});

app.get('/api/documents/:id/download', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const documentsDb = await loadDocumentsDb();
  const documentRecord = documentsDb.documents.find((item) => item.id === id);

  if (!documentRecord || !documentRecord.filePath || !fs.existsSync(documentRecord.filePath)) {
    return res.status(404).json({ message: '다운로드할 문서를 찾을 수 없습니다.' });
  }

  return res.download(documentRecord.filePath, documentRecord.fileName || path.basename(documentRecord.filePath));
});

app.get('/api/children', authMiddleware, async (req, res) => {
  const childrenDb = await loadChildrenDb();
  return res.json({
    children: Array.isArray(childrenDb.children) ? childrenDb.children : [],
    scanLogs: Array.isArray(childrenDb.scanLogs) ? childrenDb.scanLogs : [],
    updatedAt: childrenDb.updatedAt || null,
  });
});

app.post('/api/children', authMiddleware, async (req, res) => {
  const { child } = req.body || {};
  if (!child || typeof child !== 'object') {
    return res.status(400).json({ message: 'child 객체가 필요합니다.' });
  }
  if (!child.id || !child.name || !child.cardId) {
    return res.status(400).json({ message: 'id, name, cardId는 필수입니다.' });
  }

  const childrenDb = await loadChildrenDb();
  if (childrenDb.children.some((item) => String(item.id) === String(child.id))) {
    return res.status(409).json({ message: '이미 존재하는 아동 ID입니다.' });
  }

  childrenDb.children.push(child);
  await saveChildrenDb(childrenDb);
  await recordAuditLog(req, {
    module: 'children',
    action: 'CREATE',
    targetType: 'child',
    targetId: child.id,
    targetLabel: child.name,
    details: { child },
  });

  return res.status(201).json({ child, updatedAt: childrenDb.updatedAt });
});

app.patch('/api/children/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { updates } = req.body || {};
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ message: 'updates 객체가 필요합니다.' });
  }

  const childrenDb = await loadChildrenDb();
  const index = childrenDb.children.findIndex((item) => String(item.id) === String(id));
  if (index === -1) {
    return res.status(404).json({ message: '아동을 찾을 수 없습니다.' });
  }

  childrenDb.children[index] = {
    ...childrenDb.children[index],
    ...updates,
  };
  await saveChildrenDb(childrenDb);
  await recordAuditLog(req, {
    module: 'children',
    action: 'UPDATE',
    targetType: 'child',
    targetId: childrenDb.children[index].id,
    targetLabel: childrenDb.children[index].name,
    details: { updates },
  });

  return res.json({ child: childrenDb.children[index], updatedAt: childrenDb.updatedAt });
});

app.delete('/api/children/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const childrenDb = await loadChildrenDb();
  const nextChildren = childrenDb.children.filter((item) => String(item.id) !== String(id));

  if (nextChildren.length === childrenDb.children.length) {
    return res.status(404).json({ message: '아동을 찾을 수 없습니다.' });
  }

  const deletedChild = childrenDb.children.find((item) => String(item.id) === String(id));
  childrenDb.children = nextChildren;
  await saveChildrenDb(childrenDb);
  await recordAuditLog(req, {
    module: 'children',
    action: 'DELETE',
    targetType: 'child',
    targetId: id,
    targetLabel: deletedChild?.name || null,
  });

  return res.json({ ok: true, updatedAt: childrenDb.updatedAt });
});

app.put('/api/children/bulk', authMiddleware, async (req, res) => {
  const { children } = req.body || {};
  if (!Array.isArray(children)) {
    return res.status(400).json({ message: 'children 배열이 필요합니다.' });
  }

  const childrenDb = await loadChildrenDb();
  childrenDb.children = children;
  await saveChildrenDb(childrenDb);
  await recordAuditLog(req, {
    module: 'children',
    action: 'BULK_SYNC',
    targetType: 'child',
    targetId: 'bulk',
    targetLabel: 'children',
    details: { count: children.length },
  });

  return res.json({
    ok: true,
    count: children.length,
    updatedAt: childrenDb.updatedAt,
  });
});

app.put('/api/children/scan-logs', authMiddleware, async (req, res) => {
  const { scanLogs } = req.body || {};
  if (!Array.isArray(scanLogs)) {
    return res.status(400).json({ message: 'scanLogs 배열이 필요합니다.' });
  }

  const childrenDb = await loadChildrenDb();
  childrenDb.scanLogs = scanLogs.slice(0, 200);
  await saveChildrenDb(childrenDb);
  await recordAuditLog(req, {
    module: 'children',
    action: 'SCAN_LOG_SYNC',
    targetType: 'scan_log',
    targetId: 'bulk',
    targetLabel: 'scanLogs',
    details: { count: childrenDb.scanLogs.length },
  });

  return res.json({
    ok: true,
    count: childrenDb.scanLogs.length,
    updatedAt: childrenDb.updatedAt,
  });
});

app.get('/api/staff', authMiddleware, async (req, res) => {
  const staffDb = await loadStaffDb();
  return res.json({
    staff: Array.isArray(staffDb.staff) ? staffDb.staff : [],
    updatedAt: staffDb.updatedAt || null,
  });
});

app.post('/api/staff', authMiddleware, async (req, res) => {
  const { member } = req.body || {};
  if (!member || typeof member !== 'object') {
    return res.status(400).json({ message: 'member 객체가 필요합니다.' });
  }
  if (!member.id || !member.name || !member.role) {
    return res.status(400).json({ message: 'id, name, role은 필수입니다.' });
  }

  const staffDb = await loadStaffDb();
  if (staffDb.staff.some((item) => String(item.id) === String(member.id))) {
    return res.status(409).json({ message: '이미 존재하는 종사자 ID입니다.' });
  }

  staffDb.staff.push(member);
  await saveStaffDb(staffDb);
  await recordAuditLog(req, {
    module: 'staff',
    action: 'CREATE',
    targetType: 'staff',
    targetId: member.id,
    targetLabel: member.name,
    details: { member },
  });

  return res.status(201).json({ member, updatedAt: staffDb.updatedAt });
});

app.patch('/api/staff/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { updates } = req.body || {};
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ message: 'updates 객체가 필요합니다.' });
  }

  const staffDb = await loadStaffDb();
  const index = staffDb.staff.findIndex((item) => String(item.id) === String(id));
  if (index === -1) {
    return res.status(404).json({ message: '종사자를 찾을 수 없습니다.' });
  }

  staffDb.staff[index] = {
    ...staffDb.staff[index],
    ...updates,
  };
  await saveStaffDb(staffDb);
  await recordAuditLog(req, {
    module: 'staff',
    action: 'UPDATE',
    targetType: 'staff',
    targetId: staffDb.staff[index].id,
    targetLabel: staffDb.staff[index].name,
    details: { updates },
  });

  return res.json({ member: staffDb.staff[index], updatedAt: staffDb.updatedAt });
});

app.delete('/api/staff/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const staffDb = await loadStaffDb();
  const nextStaff = staffDb.staff.filter((item) => String(item.id) !== String(id));

  if (nextStaff.length === staffDb.staff.length) {
    return res.status(404).json({ message: '종사자를 찾을 수 없습니다.' });
  }

  const deletedMember = staffDb.staff.find((item) => String(item.id) === String(id));
  staffDb.staff = nextStaff;
  await saveStaffDb(staffDb);
  await recordAuditLog(req, {
    module: 'staff',
    action: 'DELETE',
    targetType: 'staff',
    targetId: id,
    targetLabel: deletedMember?.name || null,
  });

  return res.json({ ok: true, updatedAt: staffDb.updatedAt });
});

app.put('/api/staff/bulk', authMiddleware, async (req, res) => {
  const { staff } = req.body || {};
  if (!Array.isArray(staff)) {
    return res.status(400).json({ message: 'staff 배열이 필요합니다.' });
  }

  const staffDb = await loadStaffDb();
  staffDb.staff = staff;
  await saveStaffDb(staffDb);
  await recordAuditLog(req, {
    module: 'staff',
    action: 'BULK_SYNC',
    targetType: 'staff',
    targetId: 'bulk',
    targetLabel: 'staff',
    details: { count: staff.length },
  });

  return res.json({
    ok: true,
    count: staff.length,
    updatedAt: staffDb.updatedAt,
  });
});

app.get('/api/meetings', authMiddleware, async (req, res) => {
  const meetingsDb = await loadMeetingsDb();
  const documentsDb = await loadDocumentsDb();
  const meetings = [];
  let changed = false;

  for (const meeting of Array.isArray(meetingsDb.meetings) ? meetingsDb.meetings : []) {
    const hydratedMeeting = await hydrateMeetingWithDocument(meeting, documentsDb);
    meetings.push(hydratedMeeting);
    if (hydratedMeeting.documentId && hydratedMeeting.documentId !== meeting.documentId) {
      changed = true;
    }
  }

  if (changed) {
    meetingsDb.meetings = meetings.map(({ document, ...meeting }) => meeting);
    await saveMeetingsDb(meetingsDb);
  }

  return res.json({
    meetings,
    updatedAt: meetingsDb.updatedAt || null,
  });
});

app.post('/api/meetings', authMiddleware, async (req, res) => {
  const { meeting } = req.body || {};
  if (!meeting || typeof meeting !== 'object') {
    return res.status(400).json({ message: 'meeting 객체가 필요합니다.' });
  }
  if (!meeting.id || !meeting.title || !meeting.type) {
    return res.status(400).json({ message: 'id, title, type은 필수입니다.' });
  }

  const meetingsDb = await loadMeetingsDb();
  if (meetingsDb.meetings.some((item) => String(item.id) === String(meeting.id))) {
    return res.status(409).json({ message: '이미 존재하는 회의/문서 ID입니다.' });
  }

  let nextMeeting = { ...meeting };
  if (typeof nextMeeting.content === 'string') {
    const documentRecord = await upsertDocumentRecord({
      existingDocumentId: nextMeeting.documentId || null,
      ownerType: 'meeting',
      ownerId: nextMeeting.id,
      title: nextMeeting.title || '',
      engine: nextMeeting.document?.engine || DOCUMENT_ENGINE.ROOSTER,
      body: { kind: DOCUMENT_KIND.HTML, html: nextMeeting.content },
    });
    nextMeeting.documentId = documentRecord.id;
  }

  meetingsDb.meetings.push(nextMeeting);
  await saveMeetingsDb(meetingsDb);
  await recordAuditLog(req, {
    module: 'meetings',
    action: 'CREATE',
    targetType: 'meeting',
    targetId: nextMeeting.id,
    targetLabel: nextMeeting.title,
    details: { meeting: { id: nextMeeting.id, type: nextMeeting.type, status: nextMeeting.status, documentId: nextMeeting.documentId || null } },
  });

  return res.status(201).json({ meeting: await hydrateMeetingWithDocument(nextMeeting, await loadDocumentsDb()), updatedAt: meetingsDb.updatedAt });
});

app.patch('/api/meetings/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { updates } = req.body || {};
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ message: 'updates 객체가 필요합니다.' });
  }

  const meetingsDb = await loadMeetingsDb();
  const index = meetingsDb.meetings.findIndex((item) => String(item.id) === String(id));
  if (index === -1) {
    return res.status(404).json({ message: '회의/문서를 찾을 수 없습니다.' });
  }

  const nextMeeting = {
    ...meetingsDb.meetings[index],
    ...updates,
  };

  if (typeof updates.content === 'string') {
    const documentRecord = await upsertDocumentRecord({
      existingDocumentId: nextMeeting.documentId || null,
      ownerType: 'meeting',
      ownerId: nextMeeting.id,
      title: nextMeeting.title || '',
      engine: nextMeeting.document?.engine || DOCUMENT_ENGINE.ROOSTER,
      body: { kind: DOCUMENT_KIND.HTML, html: updates.content },
    });
    nextMeeting.documentId = documentRecord.id;
  }

  meetingsDb.meetings[index] = nextMeeting;
  await saveMeetingsDb(meetingsDb);
  await recordAuditLog(req, {
    module: 'meetings',
    action: 'UPDATE',
    targetType: 'meeting',
    targetId: nextMeeting.id,
    targetLabel: nextMeeting.title,
    details: { updates },
  });

  return res.json({ meeting: await hydrateMeetingWithDocument(nextMeeting, await loadDocumentsDb()), updatedAt: meetingsDb.updatedAt });
});

app.delete('/api/meetings/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const meetingsDb = await loadMeetingsDb();
  const nextMeetings = meetingsDb.meetings.filter((item) => String(item.id) !== String(id));

  if (nextMeetings.length === meetingsDb.meetings.length) {
    return res.status(404).json({ message: '회의/문서를 찾을 수 없습니다.' });
  }

  const deletedMeeting = meetingsDb.meetings.find((item) => String(item.id) === String(id));
  meetingsDb.meetings = nextMeetings;
  await saveMeetingsDb(meetingsDb);

  if (deletedMeeting?.documentId) {
    const documentsDb = await loadDocumentsDb();
    const documentRecord = documentsDb.documents.find((item) => item.id === deletedMeeting.documentId);
    if (documentRecord && documentRecord.ownerType === 'meeting' && String(documentRecord.ownerId) === String(id)) {
      removeDocumentFile(documentRecord);
      documentsDb.documents = documentsDb.documents.filter((item) => item.id !== deletedMeeting.documentId);
      await saveDocumentsDb(documentsDb);
    }
  }

  await recordAuditLog(req, {
    module: 'meetings',
    action: 'DELETE',
    targetType: 'meeting',
    targetId: id,
    targetLabel: deletedMeeting?.title || null,
  });

  return res.json({ ok: true, updatedAt: meetingsDb.updatedAt });
});

app.put('/api/meetings/bulk', authMiddleware, async (req, res) => {
  const { meetings } = req.body || {};
  if (!Array.isArray(meetings)) {
    return res.status(400).json({ message: 'meetings 배열이 필요합니다.' });
  }

  const meetingsDb = await loadMeetingsDb();
  const nextMeetings = [];
  for (const meeting of meetings) {
    const nextMeeting = { ...meeting };
    if (typeof nextMeeting.content === 'string') {
      const documentRecord = await upsertDocumentRecord({
        existingDocumentId: nextMeeting.documentId || null,
        ownerType: 'meeting',
        ownerId: nextMeeting.id,
        title: nextMeeting.title || '',
        engine: nextMeeting.document?.engine || DOCUMENT_ENGINE.ROOSTER,
        body: { kind: DOCUMENT_KIND.HTML, html: nextMeeting.content },
      });
      nextMeeting.documentId = documentRecord.id;
    }
    nextMeetings.push(nextMeeting);
  }
  meetingsDb.meetings = nextMeetings;
  await saveMeetingsDb(meetingsDb);
  await recordAuditLog(req, {
    module: 'meetings',
    action: 'BULK_SYNC',
    targetType: 'meeting',
    targetId: 'bulk',
    targetLabel: 'meetings',
    details: { count: meetings.length },
  });

  return res.json({
    ok: true,
    count: nextMeetings.length,
    updatedAt: meetingsDb.updatedAt,
  });
});

app.get('/api/programs', authMiddleware, async (req, res) => {
  const programsDb = await loadProgramsDb();
  return res.json({
    programs: Array.isArray(programsDb.programs) ? programsDb.programs : [],
    updatedAt: programsDb.updatedAt || null,
  });
});

app.post('/api/programs', authMiddleware, async (req, res) => {
  const { program } = req.body || {};
  if (!program || typeof program !== 'object') {
    return res.status(400).json({ message: 'program 객체가 필요합니다.' });
  }
  if (!program.id || !program.title || !program.category) {
    return res.status(400).json({ message: 'id, title, category는 필수입니다.' });
  }

  const programsDb = await loadProgramsDb();
  if (programsDb.programs.some((item) => String(item.id) === String(program.id))) {
    return res.status(409).json({ message: '이미 존재하는 프로그램 ID입니다.' });
  }

  programsDb.programs.push(program);
  await saveProgramsDb(programsDb);
  await recordAuditLog(req, {
    module: 'programs',
    action: 'CREATE',
    targetType: 'program',
    targetId: program.id,
    targetLabel: program.title,
    details: { program },
  });

  return res.status(201).json({ program, updatedAt: programsDb.updatedAt });
});

app.patch('/api/programs/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { updates } = req.body || {};
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ message: 'updates 객체가 필요합니다.' });
  }

  const programsDb = await loadProgramsDb();
  const index = programsDb.programs.findIndex((item) => String(item.id) === String(id));
  if (index === -1) {
    return res.status(404).json({ message: '프로그램을 찾을 수 없습니다.' });
  }

  programsDb.programs[index] = {
    ...programsDb.programs[index],
    ...updates,
  };
  await saveProgramsDb(programsDb);
  await recordAuditLog(req, {
    module: 'programs',
    action: 'UPDATE',
    targetType: 'program',
    targetId: programsDb.programs[index].id,
    targetLabel: programsDb.programs[index].title,
    details: { updates },
  });

  return res.json({ program: programsDb.programs[index], updatedAt: programsDb.updatedAt });
});

app.delete('/api/programs/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const programsDb = await loadProgramsDb();
  const nextPrograms = programsDb.programs.filter((item) => String(item.id) !== String(id));

  if (nextPrograms.length === programsDb.programs.length) {
    return res.status(404).json({ message: '프로그램을 찾을 수 없습니다.' });
  }

  const deletedProgram = programsDb.programs.find((item) => String(item.id) === String(id));
  programsDb.programs = nextPrograms;
  await saveProgramsDb(programsDb);
  await recordAuditLog(req, {
    module: 'programs',
    action: 'DELETE',
    targetType: 'program',
    targetId: id,
    targetLabel: deletedProgram?.title || null,
  });

  return res.json({ ok: true, updatedAt: programsDb.updatedAt });
});

app.put('/api/programs/bulk', authMiddleware, async (req, res) => {
  const { programs } = req.body || {};
  if (!Array.isArray(programs)) {
    return res.status(400).json({ message: 'programs 배열이 필요합니다.' });
  }

  const programsDb = await loadProgramsDb();
  programsDb.programs = programs;
  await saveProgramsDb(programsDb);
  await recordAuditLog(req, {
    module: 'programs',
    action: 'BULK_SYNC',
    targetType: 'program',
    targetId: 'bulk',
    targetLabel: 'programs',
    details: { count: programs.length },
  });

  return res.json({
    ok: true,
    count: programs.length,
    updatedAt: programsDb.updatedAt,
  });
});

app.get('/api/calendar', authMiddleware, async (req, res) => {
  const calendarDb = await loadCalendarDb();
  return res.json({
    calendarUrl: calendarDb.calendarUrl || '',
    events: Array.isArray(calendarDb.events) ? calendarDb.events : [],
    updatedAt: calendarDb.updatedAt || null,
  });
});

app.put('/api/calendar/settings', authMiddleware, async (req, res) => {
  const { calendarUrl } = req.body || {};
  if (typeof calendarUrl !== 'string') {
    return res.status(400).json({ message: 'calendarUrl 문자열이 필요합니다.' });
  }

  const calendarDb = await loadCalendarDb();
  calendarDb.calendarUrl = calendarUrl;
  await saveCalendarDb(calendarDb);
  await recordAuditLog(req, {
    module: 'calendar',
    action: 'SETTINGS_UPDATE',
    targetType: 'calendar_settings',
    targetId: 'google_url',
    targetLabel: 'Google Calendar URL',
  });

  return res.json({ calendarUrl: calendarDb.calendarUrl, updatedAt: calendarDb.updatedAt });
});

app.post('/api/calendar/events', authMiddleware, async (req, res) => {
  const { event } = req.body || {};
  if (!event || typeof event !== 'object') {
    return res.status(400).json({ message: 'event 객체가 필요합니다.' });
  }
  if (!event.id || !event.title || !event.date) {
    return res.status(400).json({ message: 'id, title, date는 필수입니다.' });
  }

  const calendarDb = await loadCalendarDb();
  if (calendarDb.events.some((item) => String(item.id) === String(event.id))) {
    return res.status(409).json({ message: '이미 존재하는 일정 ID입니다.' });
  }

  calendarDb.events.push(event);
  await saveCalendarDb(calendarDb);
  await recordAuditLog(req, {
    module: 'calendar',
    action: 'CREATE',
    targetType: 'calendar_event',
    targetId: event.id,
    targetLabel: event.title,
    details: { event },
  });

  return res.status(201).json({ event, updatedAt: calendarDb.updatedAt });
});

app.patch('/api/calendar/events/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { updates } = req.body || {};
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ message: 'updates 객체가 필요합니다.' });
  }

  const calendarDb = await loadCalendarDb();
  const index = calendarDb.events.findIndex((item) => String(item.id) === String(id));
  if (index === -1) {
    return res.status(404).json({ message: '일정을 찾을 수 없습니다.' });
  }

  calendarDb.events[index] = {
    ...calendarDb.events[index],
    ...updates,
  };
  await saveCalendarDb(calendarDb);
  await recordAuditLog(req, {
    module: 'calendar',
    action: 'UPDATE',
    targetType: 'calendar_event',
    targetId: calendarDb.events[index].id,
    targetLabel: calendarDb.events[index].title,
    details: { updates },
  });

  return res.json({ event: calendarDb.events[index], updatedAt: calendarDb.updatedAt });
});

app.delete('/api/calendar/events/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const calendarDb = await loadCalendarDb();
  const deletedEvent = calendarDb.events.find((item) => String(item.id) === String(id));
  const nextEvents = calendarDb.events.filter((item) => String(item.id) !== String(id));

  if (nextEvents.length === calendarDb.events.length) {
    return res.status(404).json({ message: '일정을 찾을 수 없습니다.' });
  }

  calendarDb.events = nextEvents;
  await saveCalendarDb(calendarDb);
  await recordAuditLog(req, {
    module: 'calendar',
    action: 'DELETE',
    targetType: 'calendar_event',
    targetId: id,
    targetLabel: deletedEvent?.title || null,
  });

  return res.json({ ok: true, updatedAt: calendarDb.updatedAt });
});

app.put('/api/calendar/events/bulk', authMiddleware, async (req, res) => {
  const { events } = req.body || {};
  if (!Array.isArray(events)) {
    return res.status(400).json({ message: 'events 배열이 필요합니다.' });
  }

  const calendarDb = await loadCalendarDb();
  calendarDb.events = events;
  await saveCalendarDb(calendarDb);
  await recordAuditLog(req, {
    module: 'calendar',
    action: 'BULK_SYNC',
    targetType: 'calendar_event',
    targetId: 'bulk',
    targetLabel: 'calendarEvents',
    details: { count: events.length },
  });

  return res.json({
    ok: true,
    count: events.length,
    updatedAt: calendarDb.updatedAt,
  });
});

app.get('/api/dashboard-summary', authMiddleware, async (req, res) => {
  const childrenDb = await loadChildrenDb();
  const staffDb = await loadStaffDb();
  const meetingsDb = await loadMeetingsDb();
  const programsDb = await loadProgramsDb();
  const calendarDb = await loadCalendarDb();

  const today = new Date();
  const todayKey = today.toISOString().split('T')[0];
  const currentYear = today.getFullYear();
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  const children = Array.isArray(childrenDb.children) ? childrenDb.children : [];
  const meetings = Array.isArray(meetingsDb.meetings) ? meetingsDb.meetings : [];
  const programs = Array.isArray(programsDb.programs) ? programsDb.programs : [];
  const events = Array.isArray(calendarDb.events) ? calendarDb.events : [];
  const staff = Array.isArray(staffDb.staff) ? staffDb.staff : [];

  const activeChildren = children.filter((child) => child.yearlyData?.[currentYear]);
  const presentChildren = activeChildren.filter((child) => child.attendance?.[todayKey]?.status === 'PRESENT');
  const absentChildren = activeChildren.filter((child) => child.attendance?.[todayKey]?.status === 'ABSENT');

  const attendanceList = activeChildren
    .filter((child) => child.attendance?.[todayKey])
    .sort((a, b) => {
      const aTime = a.attendance?.[todayKey]?.time || '';
      const bTime = b.attendance?.[todayKey]?.time || '';
      return aTime.localeCompare(bTime);
    })
    .slice(0, 3)
    .map((child) => {
      const yearData = child.yearlyData?.[currentYear] || {};
      const attendance = child.attendance?.[todayKey];
      const isPresent = attendance?.status === 'PRESENT';
      return {
        name: child.name,
        school: `${yearData.school || '학교 정보 없음'} ${yearData.grade ? yearData.grade : ''}`.trim(),
        time: attendance?.time || '-',
        status: isPresent ? '등원완료' : '결석',
        tone: isPresent ? 'present' : 'absent',
      };
    });

  const logMeetings = meetings.filter((meeting) => meeting.type === 'LOG');
  const pendingLogs = logMeetings.filter((meeting) => meeting.status !== '최종확정');
  const completedLogs = logMeetings.filter((meeting) => meeting.status === '최종확정');
  const inProgressPrograms = programs.filter((program) => program.status === '진행중');
  const completedPrograms = programs.filter((program) => program.status === '실시완료');
  const upcomingEvents = events
    .filter((event) => {
      const eventDate = new Date(event.date);
      return eventDate >= new Date(todayKey) && eventDate < weekEnd;
    });
  const upcomingNotices = [...events]
    .filter((event) => new Date(event.date) >= new Date(todayKey))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)
    .map((event) => `${event.date} ${event.title}`);

  const missingObservations = children.filter((child) => {
    const logs = child.logs?.[currentYear];
    return child.yearlyData?.[currentYear] && (!logs?.observation || logs.observation.length === 0);
  }).length;
  const pendingPrograms = programs.filter((program) => program.status === '예정').length;

  return res.json({
    todayLabel: formatKoreanDate(today),
    stats: {
      attendance: {
        present: presentChildren.length,
        total: activeChildren.length,
        absent: absentChildren.length,
      },
      meetings: {
        pending: pendingLogs.length,
        completionRate: logMeetings.length ? Math.round((completedLogs.length / logMeetings.length) * 100) : 0,
      },
      programs: {
        inProgress: inProgressPrograms.length,
        completionRate: programs.length ? Math.round((completedPrograms.length / programs.length) * 100) : 0,
      },
      calendar: {
        weeklyCount: upcomingEvents.length,
      },
      staff: {
        active: staff.filter((member) => member.status === '재직').length,
        total: staff.length,
      },
    },
    attendanceList,
    actionItems: [
      pendingLogs.length > 0 ? `운영일지 미확정 ${pendingLogs.length}건` : null,
      missingObservations > 0 ? `관찰일지 미작성 ${missingObservations}건` : null,
      pendingPrograms > 0 ? `예정 프로그램 ${pendingPrograms}건` : null,
    ].filter(Boolean),
    weeklySnapshot: [
      {
        label: '출결 안정도',
        value: activeChildren.length ? `${Math.round((presentChildren.length / activeChildren.length) * 100)}%` : '0%',
        tone: 'emerald',
      },
      {
        label: '기록 작성률',
        value: `${logMeetings.length ? Math.round((completedLogs.length / logMeetings.length) * 100) : 0}%`,
        tone: 'blue',
      },
      {
        label: '프로그램 완료율',
        value: `${programs.length ? Math.round((completedPrograms.length / programs.length) * 100) : 0}%`,
        tone: 'amber',
      },
    ],
    noticeItems: upcomingNotices.length > 0
      ? upcomingNotices
      : ['등록된 일정이 아직 없습니다.', '프로그램과 회의록이 서버 데이터와 연동되었습니다.', '운영 현황이 실시간으로 반영됩니다.'],
  });
});

app.get('/api/admin/audit-logs', authMiddleware, adminOnly, async (req, res) => {
  const auditDb = await loadAuditDb();
  const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);
  const moduleFilter = String(req.query.module || '').trim();
  const actorFilter = String(req.query.actor || '').trim();

  let logs = Array.isArray(auditDb.logs) ? auditDb.logs : [];
  if (moduleFilter) {
    logs = logs.filter((log) => log.module === moduleFilter);
  }
  if (actorFilter) {
    logs = logs.filter((log) => log.actorId === actorFilter);
  }

  return res.json({
    logs: logs.slice(0, limit),
    updatedAt: auditDb.updatedAt || null,
  });
});

app.post('/api/admin/migrate/local-data', authMiddleware, adminOnly, async (req, res) => {
  const {
    children,
    scanLogs,
    staff,
    meetings,
    programs,
    calendarUrl,
    events,
  } = req.body || {};

  const summary = {
    children: 0,
    scanLogs: 0,
    staff: 0,
    meetings: 0,
    programs: 0,
    events: 0,
    calendarUrlUpdated: false,
  };

  if (Array.isArray(children) || Array.isArray(scanLogs)) {
    const childrenDb = await loadChildrenDb();
    if (Array.isArray(children)) {
      childrenDb.children = children;
      summary.children = children.length;
    }
    if (Array.isArray(scanLogs)) {
      childrenDb.scanLogs = scanLogs.slice(0, 200);
      summary.scanLogs = childrenDb.scanLogs.length;
    }
    await saveChildrenDb(childrenDb);
  }

  if (Array.isArray(staff)) {
    const staffDb = await loadStaffDb();
    staffDb.staff = staff;
    await saveStaffDb(staffDb);
    summary.staff = staff.length;
  }

  if (Array.isArray(meetings)) {
    const meetingsDb = await loadMeetingsDb();
    meetingsDb.meetings = meetings;
    await saveMeetingsDb(meetingsDb);
    summary.meetings = meetings.length;
  }

  if (Array.isArray(programs)) {
    const programsDb = await loadProgramsDb();
    programsDb.programs = programs;
    await saveProgramsDb(programsDb);
    summary.programs = programs.length;
  }

  if (typeof calendarUrl === 'string' || Array.isArray(events)) {
    const calendarDb = await loadCalendarDb();
    if (typeof calendarUrl === 'string' && calendarUrl.trim()) {
      calendarDb.calendarUrl = calendarUrl;
      summary.calendarUrlUpdated = true;
    }
    if (Array.isArray(events)) {
      calendarDb.events = events;
      summary.events = events.length;
    }
    await saveCalendarDb(calendarDb);
  }

  await recordAuditLog(req, {
    module: 'admin',
    action: 'LOCAL_DATA_MIGRATION',
    targetType: 'migration',
    targetId: 'browser_local_storage',
    targetLabel: 'localStorage -> server',
    details: summary,
  });

  return res.json({ ok: true, summary });
});

app.get('/api/admin/users', authMiddleware, adminOnly, (req, res) => {
  return res.json({
    users: req.authDb.users.map((u) => stripSensitiveUser(req.authDb, u)),
  });
});

app.post('/api/admin/users', authMiddleware, adminOnly, async (req, res) => {
  const { id, password, name, role = 'NON_STAFF', permissions } = req.body || {};
  const authDb = req.authDb;

  if (!id || !password || !name) {
    return res.status(400).json({ message: 'id, password, name은 필수입니다.' });
  }

  if (authDb.users.some((u) => u.id === id)) {
    return res.status(409).json({ message: '이미 존재하는 id입니다.' });
  }

  if (!['ADMIN', 'NON_STAFF'].includes(role)) {
    return res.status(400).json({ message: 'role은 ADMIN 또는 NON_STAFF만 가능합니다.' });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const newUser = {
    id,
    passwordHash,
    role,
    name,
    permissions: role === 'ADMIN'
      ? {}
      : (permissions || authDb.roleTemplates.NON_STAFF || defaultPermissions),
    active: true,
  };

  authDb.users.push(newUser);
  await saveAuthDb(authDb);
  await recordAuditLog(req, {
    module: 'admin',
    action: 'USER_CREATE',
    targetType: 'system_user',
    targetId: newUser.id,
    targetLabel: newUser.name,
    details: { role: newUser.role, active: newUser.active },
  });

  return res.status(201).json({ user: stripSensitiveUser(authDb, newUser) });
});

app.patch('/api/admin/users/:id/permissions', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body || {};
  const authDb = req.authDb;
  const user = authDb.users.find((u) => u.id === id);

  if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
  if (user.role === 'ADMIN') {
    return res.status(400).json({ message: '관리자 계정에는 세부 권한을 설정하지 않습니다.' });
  }
  if (!permissions || typeof permissions !== 'object') {
    return res.status(400).json({ message: 'permissions 객체가 필요합니다.' });
  }

  user.permissions = permissions;
  await saveAuthDb(authDb);
  await revokeSessionsByUserId(user.id);
  await recordAuditLog(req, {
    module: 'admin',
    action: 'USER_PERMISSION_UPDATE',
    targetType: 'system_user',
    targetId: user.id,
    targetLabel: user.name,
    details: { permissions },
  });

  return res.json({ user: stripSensitiveUser(authDb, user) });
});

app.patch('/api/admin/users/:id/password', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { password } = req.body || {};
  const authDb = req.authDb;
  const user = authDb.users.find((u) => u.id === id);

  if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
  if (!password || String(password).length < 6) {
    return res.status(400).json({ message: '비밀번호는 6자 이상이어야 합니다.' });
  }

  user.passwordHash = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
  delete user.password;
  await saveAuthDb(authDb);
  await revokeSessionsByUserId(user.id);
  await recordAuditLog(req, {
    module: 'admin',
    action: 'USER_PASSWORD_RESET',
    targetType: 'system_user',
    targetId: user.id,
    targetLabel: user.name,
  });

  return res.json({ ok: true });
});

app.patch('/api/admin/users/:id/active', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { active } = req.body || {};
  const authDb = req.authDb;
  const user = authDb.users.find((u) => u.id === id);

  if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
  if (typeof active !== 'boolean') {
    return res.status(400).json({ message: 'active(boolean) 값이 필요합니다.' });
  }
  if (user.id === req.currentUser.id && !active) {
    return res.status(400).json({ message: '현재 로그인한 계정은 비활성화할 수 없습니다.' });
  }

  user.active = active;
  await saveAuthDb(authDb);
  if (!active) await revokeSessionsByUserId(user.id);
  await recordAuditLog(req, {
    module: 'admin',
    action: 'USER_ACTIVE_TOGGLE',
    targetType: 'system_user',
    targetId: user.id,
    targetLabel: user.name,
    details: { active },
  });

  return res.json({ user: stripSensitiveUser(authDb, user) });
});

app.get('/api/admin/role-permissions/non-staff', authMiddleware, adminOnly, async (req, res) => {
  return res.json({
    permissions: req.authDb.roleTemplates?.NON_STAFF || defaultPermissions,
  });
});

app.put('/api/admin/role-permissions/non-staff', authMiddleware, adminOnly, async (req, res) => {
  const { permissions } = req.body || {};
  const authDb = req.authDb;
  if (!permissions || typeof permissions !== 'object') {
    return res.status(400).json({ message: 'permissions 객체가 필요합니다.' });
  }

  authDb.roleTemplates = authDb.roleTemplates || {};
  authDb.roleTemplates.NON_STAFF = permissions;
  await saveAuthDb(authDb);
  await recordAuditLog(req, {
    module: 'admin',
    action: 'ROLE_PERMISSION_UPDATE',
    targetType: 'role_template',
    targetId: 'NON_STAFF',
    targetLabel: 'NON_STAFF',
    details: { permissions },
  });

  return res.json({ permissions: authDb.roleTemplates.NON_STAFF });
});

app.listen(PORT, () => {
  console.log(`Groupware auth API running on http://localhost:${PORT}`);
});
