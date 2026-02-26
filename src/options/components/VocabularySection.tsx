import { useState, useEffect } from "preact/hooks";

export function VocabularySection() {
  const [vocabulary, setVocabulary] = useState<Record<string, any>[]>([]);

  useEffect(() => {
    chrome.storage.local.get(["vocabulary"], (res) => {
      setVocabulary(
        Array.isArray(res.vocabulary)
          ? (res.vocabulary as Record<string, any>[])
          : [],
      );
    });
  }, []);

  const handleDelete = (index: number) => {
    const newVocab = [...vocabulary];
    newVocab.splice(index, 1);
    setVocabulary(newVocab);
    chrome.storage.local.set({ vocabulary: newVocab });
  };

  const handleClearAll = () => {
    if (confirm("确定要清空生词本吗？此操作无法撤销。")) {
      setVocabulary([]);
      chrome.storage.local.set({ vocabulary: [] });
    }
  };

  const exportVocabulary = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(vocabulary, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "echoread_vocabulary.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="section-card animate-in">
      <div
        className="section-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2 className="section-title">生词本</h2>
          <p className="section-desc">您在翻译时保存的单词和短句。</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="echo-btn echo-btn-ghost echo-btn-sm"
            onClick={exportVocabulary}
            disabled={vocabulary.length === 0}
            style={{ padding: "6px 12px" }}
          >
            导出 JSON
          </button>
          <button
            className="echo-btn echo-btn-ghost echo-btn-sm"
            onClick={handleClearAll}
            disabled={vocabulary.length === 0}
            style={{ padding: "6px 12px", color: "var(--danger)" }}
          >
            清空
          </button>
        </div>
      </div>

      <div
        className="section-content"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          maxHeight: "60vh",
          overflowY: "auto",
          paddingRight: "8px",
        }}
      >
        {vocabulary.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "var(--text-tertiary)",
            }}
          >
            生词本为空，试试在翻译划词弹窗中点击收藏按钮吧。
          </div>
        ) : (
          vocabulary.map((item, index) => (
            <div
              key={index}
              className="setting-row"
              style={{ alignItems: "flex-start", padding: "16px" }}
            >
              <div className="setting-content" style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      color: "#f5f5f7",
                    }}
                  >
                    {item.original}
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--text-tertiary)",
                      background: "rgba(255,255,255,0.05)",
                      padding: "2px 6px",
                      borderRadius: "10px",
                    }}
                  >
                    {item.detectedLang?.toUpperCase()}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    color: "var(--text-secondary)",
                    lineHeight: "1.5",
                    marginBottom: "8px",
                  }}
                >
                  {item.translation}
                </div>
                {item.url && (
                  <div style={{ fontSize: "11px" }}>
                    <a
                      href={item.url}
                      target="_blank"
                      style={{
                        color: "var(--accent-solid)",
                        textDecoration: "none",
                      }}
                    >
                      原文来源
                    </a>
                    <span
                      style={{
                        marginLeft: "10px",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              <button
                className="echo-btn echo-btn-ghost echo-btn-sm"
                onClick={() => handleDelete(index)}
                style={{
                  marginLeft: "16px",
                  padding: "6px",
                  color: "var(--danger)",
                }}
                title="删除"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
