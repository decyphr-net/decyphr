export function buildSimpleTranslationPrompt(
  text: string,
  sourceLang: string,
  targetLang: string,
): string {
  return `
Translate the following from ${sourceLang} to ${targetLang}:

"${text}"

Return ONLY valid JSON.
Do NOT use markdown.
Do NOT wrap the response in triple backticks.

The JSON must have exactly these keys:
- original
- translated
- sourceLang
- targetLang

Output must begin with { and end with }.
`.trim();
}