import { CopyButton } from '~/components/ui/CopyButton';
import { generatePermalink } from '~/lib/permalink';

export interface CopyPermalinkButtonProps {
  /** Project owner's username */
  username: string;
  /** Project slug */
  projectSlug: string;
  /** Content hash of the snapshot */
  hash: string;
  /** Button size */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Button variant */
  variant?: 'ghost' | 'outline' | 'primary' | 'secondary';
  /** Show label text */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
  /** Additional CSS classes */
  class?: string;
  /** Callback when copy succeeds */
  onCopy?: () => void;
  /** Callback when copy fails */
  onError?: () => void;
}

/**
 * CopyPermalinkButton - A button that copies a snapshot permalink to the clipboard.
 *
 * Thin wrapper around `CopyButton` that generates a permalink URL from
 * the given username, project slug, and content hash.
 *
 * @example
 * <CopyPermalinkButton
 *   username="alice"
 *   projectSlug="beach-house"
 *   hash="a1b2c3d4"
 *   size="sm"
 *   showLabel
 * />
 */
export function CopyPermalinkButton(props: CopyPermalinkButtonProps) {
  const getUrl = () => generatePermalink(props.username, props.projectSlug, props.hash, true);

  return (
    <CopyButton
      textToCopy={getUrl}
      size={props.size}
      variant={props.variant}
      showLabel={props.showLabel}
      label={props.label ?? 'Copy Link'}
      class={props.class}
      onCopy={props.onCopy}
      onError={props.onError}
    />
  );
}

export default CopyPermalinkButton;
