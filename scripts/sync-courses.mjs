#!/usr/bin/env node
import { createHash } from 'crypto';
import { rm, mkdir, readdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

const repoRoot = process.cwd();
const sourceRoot = process.env.COURSE_CONTENT_REPO_PATH
  ? path.resolve(process.env.COURSE_CONTENT_REPO_PATH)
  : path.resolve(repoRoot, '..', 'irish-week', 'src', 'content', 'ga', 'courses');
const outRoot = path.join(repoRoot, 'apps', 'courses', 'src', 'content');
const outLessons = path.join(outRoot, 'lessons');
const defaultCourseSlug = slugify(path.basename(sourceRoot)) || 'course';
const sourceRootBase = path.basename(sourceRoot).toLowerCase();
const sourceRootIsCollection = sourceRootBase === 'course' || sourceRootBase === 'courses';

const REQUIRED_FIELDS = [
  'courseSlug',
  'courseTitle',
  'lessonSlug',
  'lessonTitle',
  'order',
  'lang',
  'estimatedMinutes',
];

function parseScalar(raw) {
  const value = raw.trim();
  if (!value) return '';
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => parseScalar(item));
  }
  return value;
}

function parseFrontmatter(raw) {
  if (!raw.startsWith('---\n')) {
    return { meta: {}, body: raw };
  }

  const end = raw.indexOf('\n---\n', 4);
  if (end < 0) {
    return { meta: {}, body: raw };
  }

  const frontmatter = raw.slice(4, end).split('\n');
  const body = raw.slice(end + 5);
  const meta = {};

  for (let i = 0; i < frontmatter.length; i += 1) {
    const line = frontmatter[i];
    if (!line || /^\s*#/.test(line)) continue;

    const keyMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!keyMatch) continue;

    const key = keyMatch[1];
    const inline = keyMatch[2];

    if (inline !== '') {
      meta[key] = parseScalar(inline);
      continue;
    }

    const listValues = [];
    let j = i + 1;
    while (j < frontmatter.length) {
      const listMatch = frontmatter[j].match(/^\s*-\s+(.*)$/);
      if (!listMatch) break;
      listValues.push(parseScalar(listMatch[1]));
      j += 1;
    }

    if (listValues.length > 0) {
      meta[key] = listValues;
      i = j - 1;
    } else {
      meta[key] = '';
    }
  }

  return { meta, body };
}

function slugify(input) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function blockId(type, text, index) {
  const base = slugify(text || `${type}-${index + 1}`) || `${type}-${index + 1}`;
  return `${base}-${index + 1}`;
}

function humanizeSlug(input) {
  return String(input)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function defaultLessonSlug(relativePath, fallback) {
  const normalized = relativePath.replace(/\.md$/i, '').split(path.sep).join('-');
  return slugify(normalized) || slugify(fallback) || 'lesson';
}

function buildBlocks(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];

  let paragraph = [];
  let list = [];
  let dialogueTurns = [];

  const flushParagraph = () => {
    const text = paragraph.join(' ').trim();
    if (!text) return;
    const id = blockId('paragraph', text, blocks.length);
    blocks.push({ id, type: 'paragraph', text });
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) return;
    const id = blockId('list', list[0], blocks.length);
    blocks.push({ id, type: 'list', items: [...list] });
    list = [];
  };

  const flushDialogue = () => {
    if (!dialogueTurns.length) return;
    const id = blockId('dialogue', dialogueTurns[0].text || dialogueTurns[0].speaker, blocks.length);
    blocks.push({ id, type: 'dialogue', turns: [...dialogueTurns] });
    dialogueTurns = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
      flushDialogue();
      blocks.push({
        id: blockId('heading', heading[2], blocks.length),
        type: 'heading',
        level: heading[1].length,
        text: heading[2].trim(),
      });
      continue;
    }

    const listItem = line.match(/^\s*-\s+(.*)$/);
    if (listItem) {
      const speaker = listItem[1].trim();
      const quoteLines = [];
      let j = i + 1;
      while (j < lines.length) {
        const quote = lines[j].match(/^\s*>\s?(.*)$/);
        if (!quote) break;
        quoteLines.push(quote[1].trim());
        j += 1;
      }

      if (speaker && quoteLines.length > 0) {
        flushParagraph();
        flushList();
        const [text = '', pronunciation, translation, ...rest] = quoteLines;
        const translationText = [translation, ...rest].filter(Boolean).join(' ').trim() || undefined;
        dialogueTurns.push({
          speaker,
          text,
          pronunciation: pronunciation || undefined,
          translation: translationText,
        });
        i = j - 1;
        continue;
      }

      flushParagraph();
      flushDialogue();
      list.push(listItem[1].trim());
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      flushList();
      flushDialogue();
      continue;
    }

    flushList();
    flushDialogue();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushDialogue();
  return blocks;
}

function lessonVersion(meta, markdown) {
  return createHash('sha256')
    .update(JSON.stringify(meta))
    .update('\n')
    .update(markdown)
    .digest('hex')
    .slice(0, 16);
}

async function walkMdFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkMdFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

function ensureStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function parseTokenGlossEntry(entry) {
  if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
    const token = String(entry.token || '').trim();
    if (!token) return null;
    return {
      token,
      baseWord: entry.baseWord ? String(entry.baseWord).trim() : undefined,
      translation: entry.translation ? String(entry.translation).trim() : undefined,
      pronunciation: entry.pronunciation ? String(entry.pronunciation).trim() : undefined,
      usage: entry.usage ? String(entry.usage).trim() : undefined,
      examples: ensureStringArray(entry.examples),
    };
  }

  const raw = String(entry || '').trim();
  if (!raw) return null;

  if (raw.includes('=>')) {
    const [tokenPart, translationPart] = raw.split('=>').map((item) => item.trim());
    if (!tokenPart) return null;
    return {
      token: tokenPart,
      translation: translationPart || undefined,
    };
  }

  const [token, translation, pronunciation, usage, baseWord] = raw.split('|').map((item) => item.trim());
  if (!token) return null;

  return {
    token,
    baseWord: baseWord || undefined,
    translation: translation || undefined,
    pronunciation: pronunciation || undefined,
    usage: usage || undefined,
  };
}

function parseTokenGlosses(rawValue) {
  const out = [];
  const seen = new Set();

  const pushEntry = (candidate) => {
    const entry = parseTokenGlossEntry(candidate);
    if (!entry) return;
    const key = entry.token.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(entry);
  };

  if (rawValue == null) return out;

  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim();
    if (!trimmed) return out;
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          for (const item of parsed) pushEntry(item);
        } else {
          for (const [token, details] of Object.entries(parsed || {})) {
            if (details && typeof details === 'object' && !Array.isArray(details)) {
              pushEntry({ token, ...details });
            } else {
              pushEntry({ token, translation: String(details || '') });
            }
          }
        }
        return out;
      } catch {
        // Fall back to pipe/arrow parsing.
      }
    }
    pushEntry(trimmed);
    return out;
  }

  if (Array.isArray(rawValue)) {
    for (const item of rawValue) {
      pushEntry(item);
    }
    return out;
  }

  if (typeof rawValue === 'object') {
    for (const [token, details] of Object.entries(rawValue)) {
      if (details && typeof details === 'object' && !Array.isArray(details)) {
        pushEntry({ token, ...details });
      } else {
        pushEntry({ token, translation: String(details || '') });
      }
    }
  }

  return out;
}

function lexiconTokensFromBlocks(blocks) {
  const seen = new Set();
  const tokens = [];

  for (const block of blocks) {
    if (block.type !== 'dialogue' || !Array.isArray(block.turns)) continue;
    for (const turn of block.turns) {
      const words = String(turn.text || '')
        .toLowerCase()
        .split(/[^\p{L}\p{N}'’-]+/u)
        .map((token) => token.trim())
        .filter((token) => token.length > 1)
        .filter((token) => !/^\d+$/.test(token));

      for (const token of words) {
        if (seen.has(token)) continue;
        seen.add(token);
        tokens.push(token);
        if (tokens.length >= 120) return tokens;
      }
    }
  }

  return tokens;
}

function ensureRequired(meta, filePath) {
  for (const field of REQUIRED_FIELDS) {
    if (meta[field] === undefined || meta[field] === null || meta[field] === '') {
      throw new Error(`Missing required frontmatter field '${field}' in ${filePath}`);
    }
  }
}

async function main() {
  let files = [];
  try {
    files = await walkMdFiles(sourceRoot);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      console.warn(`No source courses directory found at ${sourceRoot}. Writing empty manifest.`);
      files = [];
    } else {
      throw error;
    }
  }

  // Ensure module/course overview docs seed metadata before lesson files.
  files.sort((a, b) => {
    const aBase = path.basename(a, '.md').toLowerCase();
    const bBase = path.basename(b, '.md').toLowerCase();
    const aIsOverview = aBase === 'overview' ? 0 : 1;
    const bIsOverview = bBase === 'overview' ? 0 : 1;
    if (aIsOverview !== bIsOverview) return aIsOverview - bIsOverview;
    return a.localeCompare(b);
  });

  await rm(outLessons, { recursive: true, force: true });
  await mkdir(outLessons, { recursive: true });

  const courseMap = new Map();
  const courseDefaults = new Map();
  const lessonVersions = [];
  let lessonCount = 0;

  for (const filePath of files) {
    const relativeToCourses = path.relative(sourceRoot, filePath);
    const pathSegments = relativeToCourses.split(path.sep).filter(Boolean);
    const raw = await readFile(filePath, 'utf-8');
    const { meta, body } = parseFrontmatter(raw);

    const parentSlug = relativeToCourses.split(path.sep)[0] || '';
    const fileBase = path.basename(filePath, '.md');
    const fileOrderMatch = fileBase.match(/^(\d+)-/);
    const isOverviewDoc = String(meta.type || '').toLowerCase() === 'overview' || fileBase.toLowerCase() === 'overview';
    const inferredModuleSlug = sourceRootIsCollection
      ? (pathSegments[0] || defaultCourseSlug)
      : defaultCourseSlug;
    const inferredCourseSlug = String(meta.courseSlug || inferredModuleSlug || parentSlug || defaultCourseSlug);

    if (isOverviewDoc) {
      courseDefaults.set(inferredCourseSlug, {
        courseTitle: String(meta.courseTitle || meta.title || humanizeSlug(inferredCourseSlug)),
        courseSummary: meta.courseSummary ? String(meta.courseSummary) : undefined,
      });
      continue;
    }

    const defaultCourse = courseDefaults.get(inferredCourseSlug);
    meta.courseSlug = inferredCourseSlug;
    meta.courseTitle = String(meta.courseTitle || defaultCourse?.courseTitle || humanizeSlug(meta.courseSlug));
    meta.lessonSlug = String(meta.lessonSlug || defaultLessonSlug(relativeToCourses, fileBase));
    meta.lessonTitle = String(meta.lessonTitle || meta.title || humanizeSlug(meta.lessonSlug));
    meta.order = Number(meta.order || (fileOrderMatch ? Number(fileOrderMatch[1]) : 1));
    meta.lang = String(meta.lang || 'ga');
    meta.estimatedMinutes = Number(meta.estimatedMinutes || 10);

    ensureRequired(meta, filePath);

    const blocks = buildBlocks(body);
    const version = lessonVersion(meta, body);
    lessonVersions.push(version);
    lessonCount += 1;

    const derivedLexiconInclude = lexiconTokensFromBlocks(blocks);
    const lessonJson = {
      courseSlug: String(meta.courseSlug),
      courseTitle: String(meta.courseTitle),
      lessonSlug: String(meta.lessonSlug),
      lessonTitle: String(meta.lessonTitle),
      order: Number(meta.order),
      lang: String(meta.lang),
      estimatedMinutes: Number(meta.estimatedMinutes),
      summary: meta.summary ? String(meta.summary) : undefined,
      tags: ensureStringArray(meta.tags),
      resumeBlocks: ensureStringArray(meta.resumeBlocks),
      lexicon_include: ensureStringArray(meta.lexicon_include).length
        ? ensureStringArray(meta.lexicon_include)
        : derivedLexiconInclude,
      lexicon_exclude: ensureStringArray(meta.lexicon_exclude),
      tokenGlosses: parseTokenGlosses(meta.tokenGlosses),
      pedagogy: {
        defaultMode: String(meta.defaultMode || 'full'),
        pedagogyFocus: String(meta.pedagogyFocus || 'spoken_survival'),
        unitDeckSlug: meta.unitDeckSlug ? String(meta.unitDeckSlug) : undefined,
        autoTrackPhrasebook: meta.autoTrackPhrasebook !== false,
        autoTrackLexicon: meta.autoTrackLexicon !== false,
      },
      markdown: body,
      blocks,
      contentVersion: version,
    };

    const lessonRelPath = path.join('lessons', lessonJson.courseSlug, `${lessonJson.lessonSlug}.json`);
    const lessonOutPath = path.join(outRoot, lessonRelPath);

    await mkdir(path.dirname(lessonOutPath), { recursive: true });
    await writeFile(lessonOutPath, JSON.stringify(lessonJson, null, 2), 'utf-8');

    if (!courseMap.has(lessonJson.courseSlug)) {
      courseMap.set(lessonJson.courseSlug, {
        courseSlug: lessonJson.courseSlug,
        courseTitle: lessonJson.courseTitle,
        lang: lessonJson.lang,
        summary: meta.courseSummary ? String(meta.courseSummary) : defaultCourse?.courseSummary,
        lessons: [],
      });
    }

    courseMap.get(lessonJson.courseSlug).lessons.push({
      lessonSlug: lessonJson.lessonSlug,
      lessonTitle: lessonJson.lessonTitle,
      order: lessonJson.order,
      estimatedMinutes: lessonJson.estimatedMinutes,
      summary: lessonJson.summary,
      tags: lessonJson.tags,
      contentVersion: lessonJson.contentVersion,
      file: lessonRelPath,
    });
  }

  const courses = [...courseMap.values()].map((course) => ({
    ...course,
    lessons: course.lessons.sort((a, b) => a.order - b.order),
  }));

  const manifestVersion = createHash('sha256')
    .update(lessonVersions.sort().join('|'))
    .digest('hex')
    .slice(0, 16);

  const manifest = {
    generatedAt: new Date().toISOString(),
    contentVersion: manifestVersion,
    courses,
  };

  await writeFile(path.join(outRoot, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(`Synced ${lessonCount} markdown lesson(s) into ${outRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
