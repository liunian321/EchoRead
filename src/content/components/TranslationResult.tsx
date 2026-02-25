import { h } from "preact";
import { TranslationResult as ITranslationResult } from "../types";

export function TranslationResult({ data }: { data: ITranslationResult }) {
  const playAudio = () => {
    if (data.pronunciation) {
       const audio = new Audio(data.pronunciation);
       audio.play().catch(e => console.error("Audio playback failed", e));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
       {/* Header: Lang -> Lang + Audio */}
       <div style={{
         display: "flex",
         alignItems: "center",
         justifyContent: "space-between",
         marginBottom: "8px",
         fontSize: "12px",
         opacity: 0.7,
         letterSpacing: "0.5px"
       }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontWeight: 600 }}>{data.detectedLang.toUpperCase()}</span>
            <span style={{ fontSize: "10px" }}>▶</span>
            <span style={{ fontWeight: 600 }}>{data.targetLang.toUpperCase()}</span>
          </div>

          {data.pronunciation && (
             <button
               onClick={playAudio}
               title="Play pronunciation"
               style={{
                 background: "rgba(255,255,255,0.1)",
                 border: "none",
                 borderRadius: "50%",
                 width: "24px",
                 height: "24px",
                 display: "flex",
                 alignItems: "center",
                 justifyContent: "center",
                 cursor: "pointer",
                 color: "#fff",
                 transition: "background 0.2s"
               }}
               onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.2)")}
               onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
             >
               <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
               </svg>
             </button>
          )}
       </div>

       {/* Phonetic */}
       {data.phonetic && (
         <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", marginBottom: "8px", fontFamily: "monospace" }}>
           [{data.phonetic}]
         </div>
       )}

       {/* Translation */}
       <div style={{ fontSize: "16px", fontWeight: "600", lineHeight: "1.4", marginBottom: "16px", color: "#fff" }}>
          {data.translation}
       </div>

       {/* Definitions */}
       {data.definitions && data.definitions.length > 0 && (
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: "12px",
            marginTop: "4px",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}>
             {data.definitions.map((def, i) => (
                <div key={i} style={{ fontSize: "13px", lineHeight: "1.4" }}>
                   <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                      <span style={{
                        color: "#81C784",
                        fontWeight: "bold",
                        fontStyle: "italic",
                        fontSize: "12px",
                        background: "rgba(129, 199, 132, 0.1)",
                        padding: "1px 4px",
                        borderRadius: "4px"
                      }}>{def.partOfSpeech}</span>
                      <span style={{ color: "rgba(255,255,255,0.9)" }}>{def.definition}</span>
                   </div>
                   {def.example && (
                     <div style={{
                       fontSize: "12px",
                       color: "rgba(255,255,255,0.5)",
                       marginTop: "4px",
                       paddingLeft: "8px",
                       borderLeft: "2px solid rgba(255,255,255,0.1)"
                     }}>
                       {def.example}
                     </div>
                   )}
                </div>
             ))}
          </div>
       )}
    </div>
  );
}
