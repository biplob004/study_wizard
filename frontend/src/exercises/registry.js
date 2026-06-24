// The exercise plugin registry. Adding a new exercise type is a single import:
// create a module that default-exports { id, name, needs, usesLLM, Component }
// and add it here.
import MatchPairs from "./MatchPairs";
import PickImage from "./PickImage";
import Unscramble from "./Unscramble";
import ListenChoose from "./ListenChoose";

export const exercises = [
  MatchPairs,
  PickImage,
  Unscramble,
  ListenChoose,
];

/** Exercises that can run given the dataset size (some need several items). */
export function availableExercises(poolSize) {
  return exercises.filter((ex) => poolSize >= ex.needs && poolSize >= 2);
}
