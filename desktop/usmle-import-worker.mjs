import { importUsmleFolder } from './usmle-library.mjs';

const send = value => process.parentPort ? process.parentPort.postMessage(value) : console.log(JSON.stringify(value));
const finish = (value, code) => {
  if (!process.parentPort) { send(value); process.exitCode = code; return; }
  // Utility processes keep their parent port alive. Wait for the main process
  // to acknowledge the finished receipt before exiting and releasing resources.
  process.parentPort.once('message', () => process.exit(code));
  send(value);
  setTimeout(() => process.exit(code), 3000);
};
try {
  const index = await importUsmleFolder(process.argv[2], process.argv[3], send);
  finish({ state: 'complete', message: 'Private USMLE library ready.', questions: index.questions.length, resources: index.resources.length, warnings: index.warnings }, 0);
} catch (error) { finish({ state: 'failed', message: error.message }, 1); }
