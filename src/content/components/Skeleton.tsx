import { h } from "preact";

const styles = `
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;
  width: 100%;
}
.skeleton-line {
  background: linear-gradient(90deg,
    rgba(255, 255, 255, 0.1) 25%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.1) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  height: 16px;
}
.skeleton-line.short {
  width: 60%;
}
.skeleton-line.medium {
  width: 80%;
}
`;

export function Skeleton() {
  return (
    <div className="skeleton-wrapper">
      <style>{styles}</style>
      <div className="skeleton-line short" style={{ height: "20px", marginBottom: "8px" }} />
      <div className="skeleton-line" />
      <div className="skeleton-line medium" />
      <div className="skeleton-line short" />
    </div>
  );
}
