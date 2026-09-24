import { db } from './src/services/db';

async function test() {
  console.log('Fetching...');
  let plan = await db.getSeasonPlan();
  console.log('Fetched:', plan);

  plan['test_date'] = { test: 'yes' };
  
  console.log('Saving...');
  await db.saveSeasonPlan(plan);
  console.log('Saved');

  let plan2 = await db.getSeasonPlan();
  console.log('Fetched after save:', plan2);
}

test().catch(console.error);
