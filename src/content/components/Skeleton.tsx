const styles = `
@keyframes shimmer {
  0% { opacity: 0.5; }
  50% { opacity: 0.8; }
  100% { opacity: 0.5; }
}
.skeleton-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
  width: 100%;
}
.skeleton-line {
  background: rgba(255, 255, 255, 0.08);
  animation: shimmer 2s infinite ease-in-out;
  border-radius: 6px;
  height: 14px;
}
.skeleton-line.short {
  width: 45%;
}
.skeleton-line.medium {
  width: 75%;
}
`;

export function Skeleton() {
  return (
    <div className="skeleton-wrapper">
      <style>{styles}</style>
      <div
        className="skeleton-line short"
        style={{ height: "20px", marginBottom: "8px" }}
      />
      <div className="skeleton-line" />
      <div className="skeleton-line medium" />
      <div className="skeleton-line short" />
    </div>
  );
}
