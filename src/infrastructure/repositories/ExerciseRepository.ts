import { appDb, ExerciseDTO } from '../database/db';
import { db } from '../../services/db';

export class ExerciseRepository {
  async getAll(): Promise<ExerciseDTO[]> {
    try {
      // 1. Intentar cargar desde Supabase (biblioteca compartida entre entrenadores)
      const remote = await db.getExercises();
      if (remote && remote.length > 0) {
        // Actualizar caché local IndexedDB
        await appDb.exercises.bulkPut(remote).catch(err => console.warn('Error caching exercises in Dexie:', err));
        return remote;
      }
    } catch (err) {
      console.warn('Error fetching exercises from Supabase, falling back to IndexedDB:', err);
    }
    // 2. Si Supabase está vacío o sin conexión, usar caché local IndexedDB
    return await appDb.exercises.orderBy('createdAt').reverse().toArray();
  }

  async getById(id: string): Promise<ExerciseDTO | undefined> {
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
    // Guardar en caché local primero (offline-first)
    await appDb.exercises.put(exercise);
    try {
      // Sincronizar en Supabase para que ambos entrenadores compartan la biblioteca
      await db.saveExercise(exercise);
    } catch (err) {
      console.error('Error syncing exercise to Supabase:', err);
    }
  }

  async delete(id: string): Promise<void> {
    await appDb.exercises.delete(id);
    try {
      await db.deleteExercise(id);
    } catch (err) {
      console.error('Error deleting exercise from Supabase:', err);
    }
  }
}

export const exerciseRepository = new ExerciseRepository();
