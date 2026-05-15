import { confirm, input, select } from '@inquirer/prompts';

export async function promptDomain(): Promise<string> {
  return input({
    message: 'Enter the production domain:',
    validate: (v) => v.length > 0 || 'Domain is required',
  });
}

export async function promptEmail(): Promise<string> {
  return input({
    message: 'Enter the super admin email:',
    validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Invalid email address',
  });
}

export async function promptConfirm(message: string): Promise<boolean> {
  return confirm({ message });
}

export async function promptSelect<T>(
  message: string,
  choices: { name: string; value: T }[],
): Promise<T> {
  return select({ message, choices });
}
