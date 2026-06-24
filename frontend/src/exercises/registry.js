// The exercise plugin registry. Adding a new exercise type is a single import:
// create a module that default-exports { id, name, needs, usesLLM, Component }
// and add it here.
import MultipleChoice from "./MultipleChoice";
import TypeAnswer from "./TypeAnswer";
import MatchPairs from "./MatchPairs";
import PickImage from "./PickImage";
import FillBlank from "./FillBlank";
import Unscramble from "./Unscramble";
import ListenChoose from "./ListenChoose";
import TrueFalse from "./TrueFalse";

export const exercises = [
  MultipleChoice,
  TypeAnswer,
  MatchPairs,
  PickImage,
  FillBlank,
  Unscramble,
  ListenChoose,
  TrueFalse,
];

/** Exercises that can run given the dataset size (some need several items). */
export function availableExercises(poolSize) {
  return exercises.filter((ex) => poolSize >= ex.needs && poolSize >= 2);
}
