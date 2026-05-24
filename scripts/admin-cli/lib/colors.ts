import chalk from 'chalk';

export const c = {
  header: chalk.bold.cyan,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red.bold,
  info: chalk.blue,
  dim: chalk.gray,
  bold: chalk.bold,
  code: chalk.magenta,
};

export function printHeader(text: string) {
  console.log(c.header(`\n${text}\n${'='.repeat(text.length)}`));
}

export function printSuccess(text: string) {
  console.log(c.success(`✓ ${text}`));
}

export function printWarning(text: string) {
  console.log(c.warning(`⚠ ${text}`));
}

export function printError(text: string) {
  console.error(c.error(`✗ ${text}`));
}

export function printInfo(text: string) {
  console.log(c.info(`ℹ ${text}`));
}
