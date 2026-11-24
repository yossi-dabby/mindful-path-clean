import { Actor, ActorError } from 'base44:runtime/actors';
import { reserveTrainingUsage, trainingUsage, TrainingLimitError } from './limits.js';

// The platform has exactly one live actor per user id. Serializing the complete
// read/check/write operation here covers all function instances and browser tabs.
// Counters live on the existing User record and survive actor sleep/redeploy.
export default class TrainingUsage extends Actor {
  static callable = ['usage'];
  pending = Promise.resolve();

  usage(args, context) {
    if (context?.identity?.type !== 'service') throw new ActorError(403, 'Forbidden');
    if (!args || Object.keys(args).length !== 1 || !['status','reserve'].includes(args.action) ||
        typeof this.instanceId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(this.instanceId)) {
      throw new ActorError(400, 'Invalid usage request');
    }
    const run = this.pending.then(async () => {
      try {
        const users = this.client.asServiceRole.entities.User;
        const quota = args.action === 'reserve'
          ? await reserveTrainingUsage(users, this.instanceId)
          : await trainingUsage(users, this.instanceId);
        return { ok: true, quota };
      } catch (error) {
        if (!(error instanceof TrainingLimitError)) throw error;
        return {
          ok: false, status: error.status, code: error.code,
          ...(error.quota ? { quota: error.quota } : {}),
          ...(error.retryAfter ? { retryAfter: error.retryAfter } : {}),
        };
      }
    });
    // A failed persistence request must not poison the queue. Never return a
    // reservation until the durable write has completed successfully.
    this.pending = run.then(() => undefined, () => undefined);
    return run;
  }

  handleConnect(conn) { conn.reject(4003, 'Server calls only'); }
  handleMessage() {}
  handleClose() {}
  handleTick() {}
}
