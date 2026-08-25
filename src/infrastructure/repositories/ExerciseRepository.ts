import { appDb, ExerciseDTO } from '../database/db';

export class ExerciseRepository {
  async getAll(): Promise<ExerciseDTO[]> {
    return await appDb.exercises.orderBy('createdAt').reverse().toArray();
  }

  async getById(id: string): Promise<ExerciseDTO | undefined> {
    return await appDb.exercises.get(id);
  }

  async save(exercise: ExerciseDTO): Promise<void> {
    await appDb.exercises.put(exercise);
  }

  async delete(id: string): Promise<void> {
    await appDb.exercises.delete(id);
  }
}

export const exerciseRepository = new ExerciseRepository();
