import * as Card from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function TranslationCard({ translation }) {
  return (
    <Card.Card className="w-full mb-2 max-w-4xl">
      <Card.CardHeader>
        <Card.CardTitle>{translation.originalText}</Card.CardTitle>
        <Card.CardDescription>
          {translation.breakdown.map((token, index) => (
            <Popover key={index}>
              <PopoverTrigger className="cursor-pointer underline decoration-dotted">
                {token.correctedWord}&nbsp;
              </PopoverTrigger>
              <PopoverContent>
                <ul>
                  <li>Translation: {token.translatedWord}</li>
                  <li>Level: {token.level}</li>
                  <li>POS: {token.pos_tag}</li>
                  <li>Lemma: {token.lemma}</li>
                </ul>
              </PopoverContent>
            </Popover>
          ))}
        </Card.CardDescription>
      </Card.CardHeader>
      <Card.CardContent>{translation.translatedText}</Card.CardContent>
    </Card.Card>
  );
}
