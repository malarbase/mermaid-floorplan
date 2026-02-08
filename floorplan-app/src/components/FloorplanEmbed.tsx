import { FloorplanContainer } from "./viewer/FloorplanContainer";

export interface FloorplanEmbedProps {
  /** DSL content to render */
  dsl: string;
  /** Whether editing is enabled */
  editable?: boolean;
  /** Container ID (auto-generated if not provided) */
  containerId?: string;
  /** Whether to show the full UI (toolbar, command palette, etc.) */
  withUI?: boolean;
  /** Callback when DSL changes (for editable mode) */
  onDslChange?: (dsl: string) => void;
  /** Callback when save is requested */
  onSave?: (dsl: string) => void;
}

/**
 * FloorplanEmbed component - Wraps the new FloorplanContainer for backward compatibility.
 * 
 * This component delegates all logic to FloorplanContainer, which handles:
 * - Dynamic import of viewer/editor cores
 * - Mode detection (Basic/Advanced/Editor)
 * - UI initialization
 * - Error handling and loading states
 */
export function FloorplanEmbed(props: FloorplanEmbedProps) {
  return (
    <FloorplanContainer
      dsl={props.dsl}
      containerId={props.containerId}
      editable={props.editable}
      withUI={props.withUI}
      onDslChange={props.onDslChange}
      onSave={props.onSave}
    />
  );
}

export default FloorplanEmbed;
