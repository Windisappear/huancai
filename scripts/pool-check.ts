import 'dotenv/config';
import { db } from '../src/lib/db';
import { checkAccount } from '../src/lib/pool-admin';
import { providerSecret } from '../src/lib/provider-secrets';
async function main() {
  for (const a of await db.providerAccount.findMany()) {
    if (!providerSecret(a.secretEnv)) { console.log(`${a.id}: 未配置密钥`); continue; }
    try { const result = await checkAccount(a.id); console.log(`${a.id}: 鉴权成功，可用模型 ${result.modelCount}；未执行生图`); }
    catch { console.log(`${a.id}: 检查未通过，请在后台查看；未执行生图`); }
  }
}
main().catch(() => { console.error('号池检查未完成'); process.exitCode = 1; }).finally(() => db.$disconnect());
