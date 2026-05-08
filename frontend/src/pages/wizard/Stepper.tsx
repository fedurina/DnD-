import { STEPS } from "./types";

export function Stepper({ step }: { step: number }) {
  return (
    <div className="stepper">
      {STEPS.map((label, i) => {
        const cls =
          i === step
            ? "stepper-step is-active"
            : i < step
              ? "stepper-step is-done"
              : "stepper-step";
        return (
          <div key={label} className={cls}>
            <span className="stepper-step-num">{i + 1}</span>
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
