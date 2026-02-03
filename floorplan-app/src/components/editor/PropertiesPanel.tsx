import { createSignal, createEffect, onMount, For } from "solid-js";

interface PropertyDef {
  name: string;
  label: string;
  type: "text" | "number" | "readonly";
  step?: number;
  min?: number;
  max?: number;
}

const PROPERTY_DEFS: Record<string, PropertyDef[]> = {
  room: [
    { name: "name", label: "Name", type: "text" },
    { name: "x", label: "X", type: "number", step: 0.5 },
    { name: "y", label: "Y", type: "number", step: 0.5 },
    { name: "width", label: "Width", type: "number", step: 0.5, min: 0.5 },
    { name: "height", label: "Height", type: "number", step: 0.5, min: 0.5 },
  ],
  furniture: [
    { name: "name", label: "Name", type: "text" },
    { name: "x", label: "X", type: "number", step: 0.5 },
    { name: "y", label: "Y", type: "number", step: 0.5 },
    { name: "rotation", label: "Rotation", type: "number", step: 15, min: 0, max: 360 },
  ],
};

interface PropertiesPanelProps {
  core: any;
  onPropertyChange?: (property: string, value: any) => void;
}

export default function PropertiesPanel(props: PropertiesPanelProps) {
  const [selectedEntity, setSelectedEntity] = createSignal<any>(null);
  const [properties, setProperties] = createSignal<Record<string, any>>({});

  onMount(() => {
    const selectionManager = props.core.getSelectionManager?.();
    if (!selectionManager) return;

    selectionManager.on?.('selectionChange', (event: any) => {
      const selected = event.selected;
      if (!selected || selected.length === 0) {
        setSelectedEntity(null);
        setProperties({});
        return;
      }

      const entity = selected[0];
      setSelectedEntity(entity);

      const entityData: Record<string, any> = {
        name: entity.entityId || "",
        x: entity.userData?.position?.x ?? 0,
        y: entity.userData?.position?.z ?? 0,
      };

      if (entity.entityType === "room") {
        entityData.width = entity.userData?.size?.x ?? 0;
        entityData.height = entity.userData?.size?.z ?? 0;
      } else if (entity.entityType === "furniture") {
        entityData.rotation = entity.userData?.rotation ?? 0;
      }

      setProperties(entityData);
    });
  });

  const handlePropertyChange = (property: string, value: any) => {
    setProperties((prev) => ({ ...prev, [property]: value }));
    props.onPropertyChange?.(property, value);
  };

  const entity = selectedEntity();
  if (!entity) {
    return (
      <div class="flex flex-col p-4 bg-base-100/95 backdrop-blur-sm border-l border-base-300">
        <div class="text-sm font-medium text-base-content/70">
          Properties
        </div>
        <div class="mt-4 text-xs text-base-content/60">
          No selection
        </div>
      </div>
    );
  }

  const defs = PROPERTY_DEFS[entity.entityType] || [];

  return (
    <div class="flex flex-col gap-3 p-4 bg-base-100/95 backdrop-blur-sm border-l border-base-300">
      <div class="text-sm font-medium text-base-content/70">
        {entity.entityType}: {entity.entityId}
      </div>

      <For each={defs}>
        {(def) => (
          <div class="form-control">
            <label class="label">
              <span class="label-text text-xs">{def.label}</span>
            </label>
            {def.type === "readonly" ? (
              <span class="text-sm text-base-content/80">
                {properties()[def.name] ?? "—"}
              </span>
            ) : def.type === "number" ? (
              <input
                type="number"
                class="input input-sm input-bordered"
                value={properties()[def.name] ?? ""}
                step={def.step}
                min={def.min}
                max={def.max}
                onChange={(e) =>
                  handlePropertyChange(def.name, parseFloat(e.target.value))
                }
              />
            ) : (
              <input
                type="text"
                class="input input-sm input-bordered"
                value={properties()[def.name] ?? ""}
                onChange={(e) => handlePropertyChange(def.name, e.target.value)}
              />
            )}
          </div>
        )}
      </For>
    </div>
  );
}
