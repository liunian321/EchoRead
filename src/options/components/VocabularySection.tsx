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
    <div className="animate-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="options-section-title mb-1!">生词本</h2>
          <p className="options-section-desc">您在翻译时保存的单词和短句。</p>
        </div>
        <div className="flex gap-[10px]">
          <button
            className="echo-btn echo-btn-ghost echo-btn-sm px-3 py-[6px]"
            onClick={exportVocabulary}
            disabled={vocabulary.length === 0}
          >
            导出 JSON
          </button>
          <button
            className="echo-btn echo-btn-ghost echo-btn-sm px-3 py-[6px] text-(--danger)!"
            onClick={handleClearAll}
            disabled={vocabulary.length === 0}
          >
            清空
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-2">
        {vocabulary.length === 0 ? (
          <div className="text-center py-10 text-(--text-tertiary)">
            生词本为空，试试在翻译划词弹窗中点击收藏按钮吧。
          </div>
        ) : (
          vocabulary.map((item, index) => (
            <div key={index} className="setting-row items-start p-4">
              <div className="setting-content flex-1">
                <div className="flex justify-between mb-2">
                  <div className="text-[15px] font-semibold text-(--text-primary)">
                    {item.original}
                  </div>
                  <span className="text-[11px] text-(--text-tertiary) bg-white/5 px-[6px] py-[2px] rounded-[10px]">
                    {item.detectedLang?.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-(--text-secondary) leading-relaxed mb-2">
                  {item.translation}
                </div>
                {item.url && (
                  <div className="text-[11px]">
                    <a
                      href={item.url}
                      target="_blank"
                      className="text-(--accent-solid) no-underline"
                    >
                      原文来源
                    </a>
                    <span className="ml-[10px] text-(--text-tertiary)">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              <button
                className="echo-btn echo-btn-ghost echo-btn-sm ml-4 p-[6px] text-(--danger)!"
                onClick={() => handleDelete(index)}
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
