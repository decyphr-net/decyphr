import {
  buildGlossIndex,
  buildMicroChunks,
  buildPedagogyView,
  nextMicroChunkId,
  resolveGloss,
  resolveGlossWithContext,
} from './courses.micro';
import { LessonBlock, LessonContent } from './courses.types';

describe('courses.micro', () => {
  const blocks: LessonBlock[] = [
    { id: 'h1', type: 'heading', level: 2, text: 'Comhra beag' },
    {
      id: 'd1',
      type: 'dialogue',
      turns: [
        {
          speaker: 'Barista',
          text: 'Dia dhuit, cad ba mhaith leat?',
          pronunciation: 'dee-a ghwitch',
          translation: 'Hello, what would you like?',
        },
      ],
    },
    { id: 'p1', type: 'paragraph', text: 'Seo míniú gearr ar an bhfrása.' },
    {
      id: 'd2',
      type: 'dialogue',
      turns: [
        {
          speaker: 'Customer',
          text: 'Ba mhaith liom caife, le do thoil.',
          translation: 'I would like coffee, please.',
        },
      ],
    },
  ];

  const lesson: LessonContent = {
    courseSlug: 'cafe',
    courseTitle: 'Coffee Shop Encounters',
    lessonSlug: 'cafe-first-encounters-lesson-1-1-conversation',
    lessonTitle: 'Conversation',
    order: 1,
    lang: 'ga',
    estimatedMinutes: 10,
    markdown: '',
    blocks,
    contentVersion: 'v1',
  };

  it('builds deterministic chunks and respects boundaries', () => {
    const chunks = buildMicroChunks(blocks, ['p1']);
    expect(chunks.map((chunk) => chunk.id)).toEqual(['chunk-1', 'chunk-2', 'chunk-3', 'chunk-4']);
    expect(chunks[0].blockIds).toEqual(['h1']);
    expect(chunks[1].blockIds).toEqual(['d1']);
    expect(chunks[2].blockIds).toEqual(['p1']);
    expect(chunks[3].blockIds).toEqual(['d2']);
  });

  it('finds the next incomplete chunk', () => {
    const chunks = buildMicroChunks(blocks);
    const next = nextMicroChunkId(chunks, [chunks[0].id]);
    expect(next).toBe(chunks[1].id);
  });

  it('resolves known gloss from dialogue', () => {
    const glossary = buildGlossIndex(lesson);
    const gloss = resolveGloss(glossary, 'dia');
    expect(gloss.token).toBe('dia');
    expect(gloss.translation).toBeNull();
    expect(gloss.shortNote).toBeNull();
  });

  it('returns graceful fallback for unknown token', () => {
    const glossary = buildGlossIndex(lesson);
    const gloss = resolveGloss(glossary, 'unknown', 'unknown token');
    expect(gloss.lemma).toBe('unknown');
    expect(gloss.translation).toBeNull();
    expect(gloss.shortNote).toBeNull();
    expect(gloss.examples).toEqual(['unknown token']);
  });

  it('builds pedagogy view with core flow and optional depth', () => {
    const pedagogy = buildPedagogyView(lesson);
    expect(pedagogy.defaultMode).toBe('full');
    expect(pedagogy.pedagogyFocus).toBe('spoken_survival');
    expect(pedagogy.core_flow.length).toBeGreaterThan(0);
    expect(pedagogy.core_flow[0].phraseId).toContain(lesson.lessonSlug);
    expect(pedagogy.core_flow[0].tokens.length).toBeGreaterThan(0);
    expect(Array.isArray(pedagogy.micro_notes)).toBe(true);
    expect(Array.isArray(pedagogy.deep_notes)).toBe(true);
  });

  it('uses line context to resolve translation for repeated token', () => {
    const contextualBlocks: LessonBlock[] = [
      {
        id: 'line-1',
        type: 'dialogue',
        turns: [
          {
            speaker: 'Barista',
            text: 'Sin trí euro. Cárta nó airgead tirim?',
            translation: "That's three euro. Card or cash?",
          },
        ],
      },
      {
        id: 'line-2',
        type: 'dialogue',
        turns: [
          {
            speaker: 'Customer',
            text: 'Cárta',
            translation: 'Card',
          },
        ],
      },
    ];

    const glossary = buildGlossIndex({
      ...lesson,
      blocks: contextualBlocks,
      tokenGlosses: [{ token: 'cárta', translation: 'Card' }],
    });
    const withContext = resolveGlossWithContext(contextualBlocks, glossary, 'cárta', 'Cárta', 'line-2');
    expect(withContext.translation).toBe('Card');

    const withoutContext = resolveGlossWithContext(contextualBlocks, glossary, 'cárta');
    expect(withoutContext.translation).toBe('Card');
  });

  it('uses explicit tokenGloss translation from frontmatter', () => {
    const glossary = buildGlossIndex({
      ...lesson,
      tokenGlosses: [{ token: 'cad', translation: 'what' }],
    });
    const gloss = resolveGloss(glossary, 'cad');
    expect(gloss.translation).toBe('what');
  });

  it('prefers explicit phrase gloss when token appears inside that phrase', () => {
    const phraseBlocks: LessonBlock[] = [
      {
        id: 'line-thanks',
        type: 'dialogue',
        turns: [
          {
            speaker: 'Customer',
            text: 'Go raibh maith agat! Slán',
            translation: 'Thank you! Goodbye',
          },
        ],
      },
    ];

    const glossary = buildGlossIndex({
      ...lesson,
      blocks: phraseBlocks,
      tokenGlosses: [
        { token: 'go', translation: 'that / to' },
        { token: 'raibh', translation: 'was' },
        { token: 'go raibh maith agat', translation: 'thank you' },
      ],
    });

    const gloss = resolveGlossWithContext(
      phraseBlocks,
      glossary,
      'raibh',
      'Go raibh maith agat! Slán',
      'line-thanks',
    );

    expect(gloss.translation).toBe('thank you');
  });
});
