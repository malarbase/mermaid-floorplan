import { useNavigate } from '@solidjs/router';
import { createSignal, Show } from 'solid-js';
import { CreateVersionModal } from './CreateVersionModal';
import { VersionList } from './VersionList';

// Version type from Convex schema
interface Version {
  _id: string;
  name: string;
  snapshotId: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

interface VersionManagerProps {
  /** Project ID */
  projectId: string;
  /** Username for URLs */
  username: string;
  /** Project slug for URLs */
  projectSlug: string;
  /** Default version name */
  defaultVersion?: string;
  /** Currently active version */
  activeVersion?: string;
  /** Whether to show compact view */
  compact?: boolean;
  /** Whether user can create new versions */
  canCreateVersion?: boolean;
  /** Callback when version is selected */
  onVersionSelect?: (version: Version) => void;
  /** Callback when new version is created */
  onVersionCreated?: (versionId: string, versionName: string) => void;
  /** Whether to navigate after creating a version */
  navigateOnCreate?: boolean;
}

/**
 * Complete version management component that combines:
 * - VersionList: Display all project versions
 * - CreateVersionModal: Create new versions (branches)
 *
 * Use this component when you need full version management functionality.
 */
export function VersionManager(props: VersionManagerProps) {
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const navigate = useNavigate();

  const handleVersionCreated = (versionId: string, versionName: string) => {
    props.onVersionCreated?.(versionId, versionName);

    // Navigate to new version if enabled
    if (props.navigateOnCreate !== false) {
      navigate(`/u/${props.username}/${props.projectSlug}/v/${versionName}`);
    }
  };

  const handleVersionSelect = (version: Version) => {
    if (props.onVersionSelect) {
      props.onVersionSelect(version);
    } else {
      // Default behavior: navigate to version
      navigate(`/u/${props.username}/${props.projectSlug}/v/${version.name}`);
    }
  };

  return (
    <>
      <VersionList
        projectId={props.projectId}
        username={props.username}
        projectSlug={props.projectSlug}
        defaultVersion={props.defaultVersion}
        activeVersion={props.activeVersion}
        compact={props.compact}
        showCreateButton={props.canCreateVersion}
        onCreateNew={() => setShowCreateModal(true)}
        onVersionSelect={handleVersionSelect}
      />

      <Show when={props.canCreateVersion}>
        <CreateVersionModal
          isOpen={showCreateModal()}
          onClose={() => setShowCreateModal(false)}
          projectId={props.projectId}
          fromVersion={props.activeVersion || props.defaultVersion}
          username={props.username}
          projectSlug={props.projectSlug}
          onSuccess={handleVersionCreated}
        />
      </Show>
    </>
  );
}

export default VersionManager;
