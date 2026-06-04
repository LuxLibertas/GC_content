use wasm_bindgen::prelude::*;
use js_sys::Float64Array;
use serde::Serialize;

#[derive(Serialize)]
pub struct Statistics {
    pub total_length: usize,
    pub gc_count: usize,
    pub at_count: usize,
    pub gc_percent: f64,
    pub at_percent: f64,
    pub n_count: usize,
    pub longest_gc_run: usize,
    pub longest_at_run: usize,
}

fn clean_sequence(sequence: &str) -> Vec<u8> {
    sequence
        .to_uppercase()
        .bytes()
        .filter(|b| matches!(b, b'A' | b'T' | b'G' | b'C' | b'N'))
        .collect()
}

#[wasm_bindgen]
pub fn calculate_gc_windows(sequence: &str, window_size: usize) -> Float64Array {
    let bases = clean_sequence(sequence);
    if bases.len() < window_size || window_size == 0 {
        return Float64Array::new_with_length(0);
    }

    let num_windows = bases.len() - window_size + 1;
    let mut results = vec![0f64; num_windows];

    let mut gc_in_window: usize = bases[..window_size]
        .iter()
        .filter(|&&b| b == b'G' || b == b'C')
        .count();

    results[0] = gc_in_window as f64 / window_size as f64 * 100.0;

    for i in 1..num_windows {
        let leaving = bases[i - 1];
        let entering = bases[i + window_size - 1];
        if leaving == b'G' || leaving == b'C' {
            gc_in_window -= 1;
        }
        if entering == b'G' || entering == b'C' {
            gc_in_window += 1;
        }
        results[i] = gc_in_window as f64 / window_size as f64 * 100.0;
    }

    let arr = Float64Array::new_with_length(num_windows as u32);
    for (i, &v) in results.iter().enumerate() {
        arr.set_index(i as u32, v);
    }
    arr
}

#[wasm_bindgen]
pub fn calculate_statistics(sequence: &str) -> JsValue {
    let bases = clean_sequence(sequence);
    let total_length = bases.len();

    let mut gc_count = 0usize;
    let mut at_count = 0usize;
    let mut n_count = 0usize;
    let mut longest_gc_run = 0usize;
    let mut longest_at_run = 0usize;
    let mut cur_gc = 0usize;
    let mut cur_at = 0usize;

    for &b in &bases {
        match b {
            b'G' | b'C' => {
                gc_count += 1;
                cur_gc += 1;
                cur_at = 0;
                if cur_gc > longest_gc_run {
                    longest_gc_run = cur_gc;
                }
            }
            b'A' | b'T' => {
                at_count += 1;
                cur_at += 1;
                cur_gc = 0;
                if cur_at > longest_at_run {
                    longest_at_run = cur_at;
                }
            }
            b'N' => {
                n_count += 1;
                cur_gc = 0;
                cur_at = 0;
            }
            _ => {}
        }
    }

    let gc_percent = if total_length > 0 {
        let v = gc_count as f64 / total_length as f64 * 100.0;
        (v * 100.0).round() / 100.0
    } else {
        0.0
    };

    let at_percent = if total_length > 0 {
        let v = at_count as f64 / total_length as f64 * 100.0;
        (v * 100.0).round() / 100.0
    } else {
        0.0
    };

    let stats = Statistics {
        total_length,
        gc_count,
        at_count,
        gc_percent,
        at_percent,
        n_count,
        longest_gc_run,
        longest_at_run,
    };

    serde_wasm_bindgen::to_value(&stats).unwrap_or(JsValue::NULL)
}
