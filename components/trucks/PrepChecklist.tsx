import { togglePrepStepAction } from "@/lib/actions/trucks";
import type { PrepStep } from "@/types/database";
import { PREP_STEP_LABEL } from "@/types/database";
import { roleLabel } from "@/lib/roles";

async function onTogglePrep(formData: FormData) {
  "use server";
  await togglePrepStepAction(formData);
}

export function PrepChecklist({ steps }: { steps: PrepStep[] }) {
  const order = [
    "mechanical_inspection",
    "service_records",
    "dot_inspection",
    "detailing",
    "clean_title",
  ] as const;

  const sorted = [...steps].sort(
    (a, b) => order.indexOf(a.step) - order.indexOf(b.step),
  );
  const doneCount = sorted.filter((s) => s.done).length;

  return (
    <div>
      <div className="prog h-2.5 rounded-full bg-line overflow-hidden my-2.5">
        <i
          className="block h-full bg-sign"
          style={{ width: `${(doneCount / 5) * 100}%` }}
        />
      </div>
      <p className="sub text-muted text-sm mb-2">{doneCount} of 5 steps done</p>
      <ul className="check list-none m-0 p-0">
        {sorted.map((step) => (
          <li key={step.id} className="border-b border-line">
            <form
              action={onTogglePrep}
              className="flex gap-2.5 items-center py-2 px-1"
            >
              <input type="hidden" name="step_id" value={step.id} />
              <input
                type="hidden"
                name="done"
                value={step.done ? "false" : "true"}
              />
              <button
                type="submit"
                className="flex gap-2.5 items-center w-full text-left"
                aria-pressed={step.done}
              >
                <span
                  className={
                    step.done
                      ? "w-[18px] h-[18px] rounded-full bg-sign text-white grid place-items-center text-[11px] font-bold"
                      : "w-[18px] h-[18px] rounded-full border-[1.5px] border-line"
                  }
                >
                  {step.done ? "✓" : ""}
                </span>
                <span className="flex-1">{PREP_STEP_LABEL[step.step]}</span>
                <small className="text-muted">
                  {roleLabel(step.assigned_role)}
                </small>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
