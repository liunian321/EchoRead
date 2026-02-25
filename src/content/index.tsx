import { h, render } from "preact";

/**
 * 这是 Content Script 的入口. 核心要点：
 * 1. 使用 Shadow DOM 隔离组件样式
 * 2. 只有划词高频交互在本文档进行
 */

// 1. 设置 Shadow DOM 宿主并挂载
const ECHO_READ_ROOT_ID = "echoread-extension-root";

function initShadowRoot() {
  let root = document.getElementById(ECHO_READ_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = ECHO_READ_ROOT_ID;
    document.documentElement.appendChild(root);
  }

  const shadow = root.attachShadow({ mode: "closed" });
  const mountPoint = document.createElement("div");
  shadow.appendChild(mountPoint);

  return mountPoint;
}

// 模拟的划词弹出 UI
function QuickTranslateBubble({ selectionText }: { selectionText: string }) {
  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        right: "10px",
        padding: "12px 16px",
        background: "rgba(30, 30, 30, 0.8)",
        backdropFilter: "blur(10px)",
        color: "white",
        borderRadius: "8px",
        zIndex: 2147483647,
        fontFamily: "system-ui",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        fontSize: "14px",
      }}
    >
      正在检测划词翻译: {selectionText.slice(0, 10)}...
    </div>
  );
}

const mountNode = initShadowRoot();
let currentSelection = "";

document.addEventListener("selectionchange", () => {
  // 用 requestAnimationFrame 防抖或批量处理 UI 避免重绘卡顿
  requestAnimationFrame(() => {
    const text = window.getSelection()?.toString().trim() || "";
    if (text && text !== currentSelection) {
      currentSelection = text;
      render(<QuickTranslateBubble selectionText={text} />, mountNode);

      // 可以通过 sendMessage 传给 SW 进行翻译
      chrome.runtime.sendMessage(
        {
          type: "TRANSLATE_TEXT",
          payload: { text },
        },
        (response) => {
          console.log("Background 回复:", response);
        },
      );
    } else if (!text && currentSelection) {
      currentSelection = "";
      render(null, mountNode); // 清除组件
    }
  });
});
