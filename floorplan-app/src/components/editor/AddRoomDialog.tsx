import { createSignal } from "solid-js";

interface AddRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { name: string; type: string; width: number; height: number }) => void;
}

const ROOM_TYPES = [
  "bedroom",
  "kitchen",
  "livingroom",
  "bathroom",
  "dining",
  "hallway",
  "office",
  "storage",
];

export default function AddRoomDialog(props: AddRoomDialogProps) {
  const [formData, setFormData] = createSignal({
    name: "",
    type: "bedroom",
    width: 4,
    height: 4,
  });

  const handleSubmit = () => {
    const data = formData();
    if (!data.name.trim()) return;
    
    props.onConfirm(data);
    setFormData({ name: "", type: "bedroom", width: 4, height: 4 });
    props.onClose();
  };

  return (
    <dialog class="modal" classList={{ "modal-open": props.isOpen }}>
      <div class="modal-box">
        <h3 class="font-bold text-lg">Add Room</h3>
        
        <div class="py-4 space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Room Name</span>
            </label>
            <input
              type="text"
              class="input input-bordered"
              value={formData().name}
              onInput={(e) =>
                setFormData({ ...formData(), name: e.target.value })
              }
              placeholder="e.g., Master Bedroom"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Room Type</span>
            </label>
            <select
              class="select select-bordered"
              value={formData().type}
              onChange={(e) =>
                setFormData({ ...formData(), type: e.target.value })
              }
            >
              {ROOM_TYPES.map((type) => (
                <option value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Width (feet)</span>
            </label>
            <input
              type="number"
              class="input input-bordered"
              value={formData().width}
              min={1}
              step={0.5}
              onInput={(e) =>
                setFormData({ ...formData(), width: parseFloat(e.target.value) })
              }
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Height (feet)</span>
            </label>
            <input
              type="number"
              class="input input-bordered"
              value={formData().height}
              min={1}
              step={0.5}
              onInput={(e) =>
                setFormData({ ...formData(), height: parseFloat(e.target.value) })
              }
            />
          </div>
        </div>

        <div class="modal-action">
          <button class="btn" onClick={props.onClose}>
            Cancel
          </button>
          <button
            class="btn btn-primary"
            onClick={handleSubmit}
            disabled={!formData().name.trim()}
          >
            Add
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button onClick={props.onClose}>close</button>
      </form>
    </dialog>
  );
}
