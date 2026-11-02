import fs from 'node:fs';
import path from 'node:path';
import type {Reporter,TestCase,TestResult} from '@playwright/test/reporter';

// Preserve finished cases if an external runner session is interrupted.
export default class Stage5CheckpointReporter implements Reporter {
  private rows: object[] = [];
  onTestEnd(test:TestCase,result:TestResult) {
    this.rows.push({title:test.title,file:path.relative(process.cwd(),test.location.file),status:result.status,duration_ms:result.duration,error:result.errors.map(error=>error.message||'').join('\n'),run:process.env.STAGE5_RUN||'audit'});
    const root=process.env.STAGE5_ARTIFACT_ROOT||path.resolve('reports/stage5');
    fs.mkdirSync(root,{recursive:true});
    const target=path.join(root,`${process.env.STAGE5_RUN||'audit'}-checkpoint.json`);
    fs.writeFileSync(target+'.tmp',JSON.stringify(this.rows,null,2));
    fs.renameSync(target+'.tmp',target);
  }
}
