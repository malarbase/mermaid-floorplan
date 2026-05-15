import { Command } from 'commander';
import {
  c,
  printError,
  printHeader,
  printInfo,
  printSuccess,
  printWarning,
} from '../lib/colors.js';
import { convexRun } from '../lib/convex-cli.js';

export function createAdminCommand(): Command {
  const cmd = new Command('admin').description('Platform administration');

  cmd
    .command('list-users')
    .description('List all users')
    .action(() => {
      printHeader('User List');
      printWarning('This command requires a Convex query. Implement in floorplan-app/convex/');
    });

  cmd
    .command('promote <user-id>')
    .description('Promote user to admin')
    .action((userId: string) => {
      printInfo(`Promoting user ${c.code(userId)} to admin...`);
      try {
        convexRun('admin:promoteUser', { adminKey: process.env.CONVEX_SELF_HOSTED_ADMIN_KEY });
        printSuccess('User promoted');
      } catch {
        printError('Failed to promote user. Ensure Convex is running.');
      }
    });

  cmd
    .command('ban <user-id>')
    .description('Ban a user')
    .option('--reason <reason>', 'Ban reason', 'violation')
    .option('--duration <duration>', 'Ban duration', 'permanent')
    .action((userId: string, opts: { reason: string; duration: string }) => {
      printInfo(`Banning user ${c.code(userId)} (${opts.reason}, ${opts.duration})`);
      printWarning('Ban functionality requires Convex mutation implementation.');
    });

  cmd
    .command('stats')
    .description('Show platform stats')
    .action(() => {
      printHeader('Platform Stats');
      printWarning('Stats require Convex queries. Implement in floorplan-app/convex/');
    });

  cmd
    .command('feature <project-id>')
    .description('Feature a project')
    .action((projectId: string) => {
      printInfo(`Featuring project ${c.code(projectId)}...`);
      try {
        convexRun('admin:featureProject', { adminKey: process.env.CONVEX_SELF_HOSTED_ADMIN_KEY });
        printSuccess('Project featured');
      } catch {
        printError('Failed to feature project.');
      }
    });

  return cmd;
}
