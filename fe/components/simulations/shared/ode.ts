// Solver ODE — chuyển từ phydic/src/core/solvers (sprint-6 §4).
// rk4 là solver chính cho hệ dao động; euler giữ làm baseline.

/** Trạng thái ODE: vector các số, khoá là tên biến trạng thái (vd {x, v}). */
export type StateVec = Record<string, number>

/** Trả về `base + delta * scale` theo từng thành phần (cùng tập khoá). */
function addScaled<S extends StateVec>(base: S, delta: S, scale: number): S {
  const out = {} as Record<string, number>
  for (const k in base) {
    out[k] = base[k]! + delta[k]! * scale
  }
  return out as S
}

/**
 * Một bước RK4: tích phân `s' = f(s)` qua khoảng `dt` (hệ autonomous).
 * Bảo toàn năng lượng tốt — dùng cho con lắc, lò xo, ném xiên.
 */
export function rk4<S extends StateVec>(s: S, dt: number, f: (s: S) => S): S {
  const k1 = f(s)
  const k2 = f(addScaled(s, k1, dt / 2))
  const k3 = f(addScaled(s, k2, dt / 2))
  const k4 = f(addScaled(s, k3, dt))
  const out = {} as Record<string, number>
  for (const key in s) {
    out[key] =
      s[key]! + (dt / 6) * (k1[key]! + 2 * k2[key]! + 2 * k3[key]! + k4[key]!)
  }
  return out as S
}

/**
 * Một bước Euler tiến: `s_next = s + dt * f(s)`.
 * Rẻ nhưng trôi năng lượng với hệ dao động — chỉ làm baseline so sánh.
 */
export function euler<S extends StateVec>(s: S, dt: number, f: (s: S) => S): S {
  const k = f(s)
  const out = {} as Record<string, number>
  for (const key in s) {
    out[key] = s[key]! + dt * k[key]!
  }
  return out as S
}
