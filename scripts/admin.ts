import 'dotenv/config';
import { db } from '../src/lib/db';
const username = process.argv[2]?.toLowerCase();
if (!username) throw new Error('Usage: npm run admin -- <existing-username>');
async function main() {
  await db.user.update({ where: { username }, data: { role: 'ADMIN' } });
  await db.audit.create({ data: { actorId: 'operator-cli', action: 'PROMOTE_ADMIN', reference: username! } });
  console.log('Admin role assigned to existing account.');
}
main().catch(() => { console.error('Unable to promote account. Check the username and database.'); process.exitCode = 1; }).finally(() => db.$disconnect());
