use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn build_segments(text: &str) -> js_sys::Array {
    let arr = js_sys::Array::new();
    for line in text.split('\n') {
        let trimmed = line.trim();
        if !trimmed.is_empty() {
            arr.push(&JsValue::from_str(trimmed));
        }
    }
    arr
}
