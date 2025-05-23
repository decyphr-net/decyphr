import * as Card from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * A single token breakdown from a translated sentence.
 */
type Token = {
  correctedWord: string;
  translatedWord: string;
  pos_tag: string;
  lemma: string;
  level: string;
};

/**
 * Represents a full translation entry, including original text,
 * final translation, and detailed token-by-token breakdown.
 */
type Translation = {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  createdAt?: string;
  breakdown: Token[];
};

type Props = {
  translation: Translation;
};

/**
 * TranslationCard displays a single translated sentence along with
 * an interactive breakdown of each word, including part of speech,
 * translation, lemma, and difficulty level.
 *
 * @param translation - A structured translation object
 * @returns JSX card component with popovers per word
 */
export default function TranslationCard({ translation }: Props) {
  return (
    <Card.Card className="w-full mb-2 max-w-4xl">
      <Card.CardHeader>
        <Card.CardTitle>{translation.originalText}</Card.CardTitle>
        <Card.CardDescription className="flex flex-wrap gap-x-1">
          {translation.breakdown.map((token, index) => (
            <Popover key={index}>
              <PopoverTrigger className="cursor-pointer underline decoration-dotted">
                {token.correctedWord}
              </PopoverTrigger>
              <PopoverContent className="text-sm space-y-1">
                <ul>
                  <li><strong>Translation:</strong> {token.translatedWord}</li>
                  <li><strong>Level:</strong> {token.level}</li>
                  <li><strong>POS:</strong> {token.pos_tag}</li>
                  <li><strong>Lemma:</strong> {token.lemma}</li>
                </ul>
              </PopoverContent>
            </Popover>
          ))}
        </Card.CardDescription>
      </Card.CardHeader>
      <Card.CardContent className="text-lg font-medium">
        {translation.translatedText}
      </Card.CardContent>
    </Card.Card>
  );
}
