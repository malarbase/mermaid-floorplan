#!/usr/bin/env node
import { Command } from 'commander';
import { createAdminCommand } from './admin-cli/commands/admin.js';
import { createConfigCommand } from './admin-cli/commands/config.js';
import { createDeployCommand } from './admin-cli/commands/deploy.js';
import { createDnsCommand } from './admin-cli/commands/dns.js';
import { createEnvCommand } from './admin-cli/commands/env.js';

const program = new Command('admin-cli').description('Floorplan App Admin CLI').version('0.1.0');

program.addCommand(createConfigCommand());
program.addCommand(createEnvCommand());
program.addCommand(createDnsCommand());
program.addCommand(createAdminCommand());
program.addCommand(createDeployCommand());

program.parse();
