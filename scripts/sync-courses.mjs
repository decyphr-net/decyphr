#!/usr/bin/env node
import { createHash } from 'crypto';
import { rm, mkdir, readdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

const repoRoot = process.cwd();
const sourceRepo = process.env.COURSE_CONTENT_REPO_PATH
  ? path.resolve(process.env.COURSE_CONTENT_REPO_PATH)
  : path.resolve(repoRoot, '..', 'irish-week', 'src', 'content', 'ga');
const sourceRoot = path.join(sourceRepo, 'courses');
const outRoot = path.join(repoRoot, 'apps', 'courses', 'src', 'content');
const outLessons = path.join(outRoot, 'lessons');

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

function buildBlocks(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];

  let paragraph = [];
  let list = [];

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

  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
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
      flushParagraph();
      list.push(listItem[1].trim());
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      flushList();
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
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

  await rm(outLessons, { recursive: true, force: true });
  await mkdir(outLessons, { recursive: true });

  const courseMap = new Map();
  const lessonVersions = [];

  for (const filePath of files) {
    const relativeToCourses = path.relative(sourceRoot, filePath);
    const raw = await readFile(filePath, 'utf-8');
    const { meta, body } = parseFrontmatter(raw);

    const parentSlug = relativeToCourses.split(path.sep)[0] || '';
    const fileBase = path.basename(filePath, '.md');
    const fileOrderMatch = fileBase.match(/^(\d+)-/);

    meta.courseSlug = String(meta.courseSlug || parentSlug);
    meta.lessonSlug = String(meta.lessonSlug || fileBase.replace(/^\d+-/, ''));
    meta.order = Number(meta.order || (fileOrderMatch ? Number(fileOrderMatch[1]) : 1));
    meta.lang = String(meta.lang || 'ga');
    meta.estimatedMinutes = Number(meta.estimatedMinutes || 10);

    ensureRequired(meta, filePath);

    const blocks = buildBlocks(body);
    const version = lessonVersion(meta, body);
    lessonVersions.push(version);

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
      lexicon_include: ensureStringArray(meta.lexicon_include),
      lexicon_exclude: ensureStringArray(meta.lexicon_exclude),
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
        summary: meta.courseSummary ? String(meta.courseSummary) : undefined,
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

  console.log(`Synced ${files.length} markdown lesson(s) into ${outRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
