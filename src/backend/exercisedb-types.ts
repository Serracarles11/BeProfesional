export type ExerciseDbRelatedExercise = {
  exerciseId: string
  name: string
}

export type ExerciseDbEnrichment = {
  source: 'exercisedb'
  exerciseId: string
  name: string
  overview: string
  instructions: string[]
  imageUrl: string | null
  gifUrl: string | null
  videoUrl: string | null
  bodyParts: string[]
  targetMuscles: string[]
  secondaryMuscles: string[]
  equipments: string[]
  exerciseType: string | null
  exerciseTips: string[]
  variations: string[]
  keywords: string[]
  relatedExercises: ExerciseDbRelatedExercise[]
}

export type ExerciseCatalogSearchResult = {
  source: 'local' | 'exercisedb'
  exerciseId: string | null
  localId: string | null
  name: string
  subtitle: string
  imageUrl: string | null
  bodyParts: string[]
  targetMuscles: string[]
  equipments: string[]
  exerciseType: string | null
}
