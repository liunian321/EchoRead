export function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      className={`relative w-[46px] h-[28px] rounded-full shrink-0 cursor-pointer transition-colors duration-200 ease-out border-none outline-none ${
        value ? "bg-(--success)" : "bg-[#d1d1d6] dark:bg-[#39393d]"
      }`}
      onClick={() => onChange(!value)}
      type="button"
    >
      <div
        className={`absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow-sm transition-transform duration-200 ease-out flex items-center justify-center ${
          value ? "translate-x-[21px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}
