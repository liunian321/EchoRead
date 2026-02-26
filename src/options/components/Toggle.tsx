export function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      className={`toggle ${value ? "on" : "off"}`}
      onClick={() => onChange(!value)}
      type="button"
    >
      <div className="toggle-knob" />
    </button>
  );
}
