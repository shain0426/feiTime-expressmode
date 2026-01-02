export interface Scores {
  acidity: number;
  sweetness: number;
  body: number;
  aftertaste: number;
  clarity: number;
}
export type QuestionFromApi = {
  order: number;
  options: OptionFromApi[];
};
export type OptionFromApi = {
  key: string;
  acidity: number;
  sweetness: number;
  body: number;
  aftertaste: number;
  clarity: number;
};
export type Answer = {
  questionOrder: number;
  optionKey: string;
};
