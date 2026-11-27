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

  async cloneToPrivate(source: ExerciseDTO, thumbnailUrl?: string): Promise<ExerciseDTO> {
    const sourceScenes = source.scenes || source.frames || [];
    const clonedId = crypto.randomUUID();
    const cloned: ExerciseDTO = {
      ...source,
      id: clonedId,
      createdAt: Date.now(),
      isCommunityOfficial: false,
      isSharedToCommunity: false,
      thumbnailUrl: thumbnailUrl ?? source.thumbnailUrl ?? '',
      boardState: source.boardState || sourceScenes[0]?.state,
      scenes: sourceScenes.map(s => ({ ...s })),
      frames: undefined,
    };
    await this.save(cloned);
    return cloned;
  }

  async toggleCommunityShare(exercise: ExerciseDTO, authorName?: string): Promise<ExerciseDTO> {
    const nextShared = !Boolean(exercise.isSharedToCommunity);
    const updated: ExerciseDTO = {
      ...exercise,
      isSharedToCommunity: nextShared,
      authorName: nextShared ? (authorName || exercise.authorName || 'Entrenador AM Manager') : exercise.authorName,
    };
    await this.save(updated);
    return updated;
  }
}

export const exerciseRepository = new ExerciseRepository();
