import { useState } from "preact/hooks";

export default function App() {
  const [enabled, setEnabled] = useState(true);

  return (
    <div style={{ padding: "16px", width: "250px", fontFamily: "system-ui" }}>
      <h2 style={{ fontSize: "18px", margin: "0 0 12px 0" }}>EchoRead 翻译</h2>
      <button
        onClick={() => setEnabled(!enabled)}
        style={{
          width: "100%",
          padding: "8px",
          backgroundColor: enabled ? "#4CAF50" : "#f44336",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        {enabled ? "插件已启用" : "插件已禁用"}
      </button>
      <p style={{ fontSize: "12px", color: "#666", marginTop: "12px" }}>
        划词即可在线翻译体验极速翻译.
      </p>
    </div>
  );
}
