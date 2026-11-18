import { appDb, ExerciseDTO } from '../database/db';
import { db } from '../../services/db';
import { requireAuthUserId } from '../../services/authSession';

export class ExerciseRepository {
  async getAll(): Promise<ExerciseDTO[]> {
    await requireAuthUserId();
    try {
      const remote = await db.getExercises();
      if (remote && remote.length > 0) {
        await appDb.exercises.bulkPut(remote).catch(err => console.warn('Error caching exercises in Dexie:', err));
        return remote;
      }
    } catch (err) {
      console.warn('Error fetching exercises from Supabase, falling back to IndexedDB:', err);
    }
    return await appDb.exercises.orderBy('createdAt').reverse().toArray();
  }

  async getById(id: string): Promise<ExerciseDTO | undefined> {
    await requireAuthUserId();
    const local = await appDb.exercises.get(id);
    if (local) return local;
    try {
      const all = await db.getExercises();
      return all.find(e => e.id === id);
    } catch {
      return undefined;
    }
  }

  async save(exercise: ExerciseDTO): Promise<void> {
    await requireAuthUserId();
    await appDb.exercises.put(exercise);
    await db.saveExercise(exercise);
  }

  async delete(id: string): Promise<void> {
    await requireAuthUserId();
    await appDb.exercises.delete(id);
    await db.deleteExercise(id);
  }
}

export const exerciseRepository = new ExerciseRepository();
