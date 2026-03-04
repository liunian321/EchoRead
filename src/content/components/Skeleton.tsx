const SKELETON_CSS = `
  @keyframes echoReadShimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes echoReadPulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.7; }
  }

  .er-skeleton {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 6px 0;
    width: 100%;
    animation: echoReadPulse 2.5s ease-in-out infinite;
  }

  .er-skeleton-line {
    height: 12px;
    border-radius: 6px;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.04) 0%,
      rgba(255, 255, 255, 0.1) 40%,
      rgba(255, 255, 255, 0.04) 80%
    );
    background-size: 200% 100%;
    animation: echoReadShimmer 2s ease-in-out infinite;
  }

  .er-skeleton-title {
    height: 16px;
    width: 35%;
    border-radius: 8px;
    margin-bottom: 4px;
  }

  .er-skeleton-full { width: 100%; }
  .er-skeleton-long { width: 82%; }
  .er-skeleton-mid  { width: 60%; }
  .er-skeleton-short { width: 40%; }
`;

export function Skeleton() {
  return (
    <div className="er-skeleton">
      <style>{SKELETON_CSS}</style>
      <div className="er-skeleton-line er-skeleton-title" />
      <div className="er-skeleton-line er-skeleton-full" />
      <div className="er-skeleton-line er-skeleton-long" />
      <div className="er-skeleton-line er-skeleton-mid" />
    </div>
  );
}
