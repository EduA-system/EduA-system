# Hướng dẫn thêm thí nghiệm mô phỏng vật lý

Tài liệu này dùng cho khu vực `fe/components/simulations`. Mục tiêu là thêm thí nghiệm mới mà vẫn giữ đúng luồng chạy hiện tại:

```text
presets -> engines -> renderers -> shared
```

Trong đa số trường hợp, chỉ cần thêm một file trong `presets/`. Chỉ tạo thêm `engines/` hoặc `renderers/` khi thí nghiệm dùng mô hình vật lý hoặc cách hiển thị chưa có sẵn.

## 1. Hiểu 4 thư mục chính

### `presets/`

Đây là nơi khai báo thí nghiệm cụ thể cho thư viện. Một preset gồm:

- thông tin hiển thị: `id`, `title`, `domain`, `grade`, `desc`, `objective`, `sgkRef`;
- danh sách tham số cho panel điều khiển: `params`;
- hàm `applyParams(p)` để biến tham số thành một `Scene`;
- các phần phụ trợ như `analysis`, `quickPresets`, `bodyLabels`, `annotations`.

Preset không nên chứa engine vật lý phức tạp. Preset chỉ chọn mô hình, gán số, và dựng scene.

### `engines/`

Đây là nơi đặt mô hình vật lý và công thức tính toán.

Hiện có các engine:

- `engines/mechanics`: cơ học 2D, dùng `bodies`, `forces`, `constraints`, tích phân ODE.
- `engines/wave`: giao thoa sóng nước 2D, biên độ là hàm giải tích theo `(x, y, t)`.
- `engines/string-wave`: sóng 1D trên dây, sóng truyền và sóng dừng.
- `engines/wave-field`: giao thoa ánh sáng/khe Young đầy đủ, tính trường/vân từ công thức sóng.
- `engines/point-charge-field`: điện phổ hai điện tích điểm, tính trường Coulomb và truy vết đường sức.

Nếu thí nghiệm mới dùng được một engine hiện có, không tạo engine mới.

### `renderers/`

Đây là nơi vẽ scene ra màn hình. Renderer nhận scene từ preset và hiển thị bằng Konva hoặc Canvas.

Hiện có:

- `renderers/mechanics/scene-konva-2d.tsx`
- `renderers/wave/scene-konva-wave-2d.tsx`
- `renderers/string-wave/scene-konva-string-wave.tsx`
- `renderers/wave-field/scene-canvas-wave-field.tsx`
- `renderers/point-charge-field/scene-canvas-point-charge-field.tsx`

Không đưa công thức vật lý chính vào renderer, trừ phần chuyển đổi toạ độ hoặc tính toán hiển thị nhẹ. Công thức lõi nên nằm trong `engines/`.

### `shared/`

Chứa phần dùng chung:

- `param-panel.tsx`: định nghĩa tham số và panel điều khiển.
- `landmarks-panel.tsx`: panel phân tích/mốc giá trị.
- `scene-types.ts`: kiểu annotation/readout dùng chung.
- `konva-zoom.ts`, `zoom-controls.tsx`, `use-container-size.ts`: helper hiển thị.

Chỉ thêm vào `shared/` nếu đoạn code được ít nhất hai loại renderer/preset dùng chung.

## 2. Quy trình thêm thí nghiệm mới

### Bước 1: Chọn engine phù hợp

Trước khi code, xác định thí nghiệm thuộc loại nào:

| Loại thí nghiệm | Dùng engine | Khi nào dùng |
| --- | --- | --- |
| Vật rơi, ném xiên, con lắc, lò xo, va chạm, mặt nghiêng, lực điện giữa vật | `mechanics` | Có vật thể, lực, ràng buộc, cần mô phỏng theo thời gian |
| Giao thoa sóng nước từ hai nguồn | `wave` | Biên độ là hàm sóng 2D, không cần vật thể |
| Sóng trên dây, sóng dừng | `string-wave` | Sóng 1D theo trục dây |
| Giao thoa ánh sáng/khe Young | `wave-field` | Cần vân sáng/tối, cường độ, màn quan sát |
| Điện phổ hai điện tích điểm | `point-charge-field` | Cần đường sức hoặc hạt điện phổ quanh điện tích |

Nếu không khớp loại nào, xem mục "Khi nào cần engine mới".

### Bước 2: Tạo file preset mới

Tạo file mới trong `fe/components/simulations/presets/`, đặt tên kebab-case theo tiếng Việt không dấu, ví dụ:

```text
luc-huong-tam.ts
con-lac-lo-xo-ngang.ts
khuc-xa-anh-sang.ts
```

Mỗi file export một biến `Preset`.

Ví dụ preset cơ học tối giản:

```ts
import type { Preset } from "./types";

export const lucKeoVat: Preset = {
  id: "luc-keo-vat",
  title: "Lực kéo vật",
  domain: "Cơ học",
  grade: 10,
  desc: "Vật chuyển động trên mặt phẳng ngang dưới tác dụng của lực kéo không đổi.",
  objective: "Quan sát quan hệ giữa lực, khối lượng và gia tốc.",
  sgkRef: "Vật lí 10",
  params: [
    { key: "mass", label: "Khối lượng", unit: "kg", min: 0.1, max: 10, step: 0.1, default: 1 },
    { key: "force", label: "Lực kéo", unit: "N", min: 0, max: 50, step: 1, default: 10 },
  ],
  applyParams: (p) => {
    const mass = p.mass ?? 1;
    const force = p.force ?? 10;

    return {
      bodies: [{ id: "box", x: 0, y: 0.2, vx: 0, vy: 0, mass, radius: 0.15 }],
      forces: [
        { kind: "gravity", g: 9.8 },
        { kind: "applied", body: "box", fx: force, fy: 0 },
      ],
      constraints: [{ kind: "surface", x: 0, y: 0, angle: 0, length: 6, friction: 0 }],
    };
  },
};
```

### Bước 3: Đăng ký preset vào `presets/index.ts`

Thêm import:

```ts
import { lucKeoVat } from "./luc-keo-vat";
```

Thêm vào mảng `PRESETS`:

```ts
export const PRESETS: Preset[] = [
  // ...
  lucKeoVat,
];
```

Nếu quên bước này, thí nghiệm không xuất hiện trên trang mô phỏng dù file đã tồn tại.

### Bước 4: Kiểm tra route `/mo-phong-vat-ly`

Trang `fe/app/mo-phong-vat-ly/page.tsx` tự chọn renderer theo `preset.kind`.

Quy ước:

- không có `kind` hoặc `kind: "mechanics"` -> renderer cơ học;
- `kind: "wave"` -> renderer sóng nước;
- `kind: "string-wave"` -> renderer sóng dây;
- `kind: "wave-field"` -> renderer trường sóng/khe Young;
- `kind: "point-charge-field"` -> renderer điện phổ.

Nếu chỉ thêm preset dùng engine có sẵn, thường không cần sửa `page.tsx`.

## 3. Viết preset cơ học đúng cách

Preset cơ học trả về `Scene` từ `engines/mechanics/types.ts`:

```ts
type Scene = {
  bodies: Body[];
  forces: Force[];
  constraints: Constraint[];
  restitution?: number;
};
```

### Body

Mỗi vật có:

- `id`: định danh duy nhất, dùng để gắn lực/ràng buộc;
- `x`, `y`: vị trí ban đầu, đơn vị mét;
- `vx`, `vy`: vận tốc ban đầu, đơn vị m/s;
- `mass`: kg;
- `fixed: true`: mốc cố định;
- `radius`: bán kính va chạm, nếu cần va chạm vật-vật.

Quy ước trục:

- `x` ngang;
- `y` hướng lên;
- đơn vị SI: mét, giây, kg, Newton.

### Force

Các lực hiện có:

- `gravity`: trọng lực.
- `spring`: lò xo Hooke giữa hai body.
- `drag`: lực cản tỉ lệ vận tốc.
- `applied`: lực ngoài không đổi.
- `coulomb`: lực Coulomb giữa hai điện tích.

Không tự tính gia tốc trong preset nếu engine đã có loại lực tương ứng. Hãy khai báo force để engine cộng lực và tích phân.

### Constraint

Các ràng buộc hiện có:

- `rod`: thanh cứng, giữ khoảng cách chính xác, phù hợp con lắc.
- `rope`: dây chỉ kéo, có thể chùng.
- `surface`: mặt phẳng/sàn/mặt nghiêng, có ma sát.

Ràng buộc không phải lực. Nếu thí nghiệm cần giữ khoảng cách, dùng `constraint`, không mô phỏng bằng lò xo rất cứng.

### Collision

Nếu muốn vật va chạm nhau:

- body phải có `radius`;
- scene có thể đặt `restitution`;
- `restitution: 1` là đàn hồi hoàn toàn;
- `restitution: 0` là va chạm mềm.

## 4. Viết preset cho các engine đặc biệt

### `wave`

Dùng cho giao thoa sóng nước 2D. Preset phải có:

```ts
kind: "wave"
```

`applyParams` trả về `WaveScene` gồm:

- `sources`: đúng 2 nguồn;
- `wavelength`;
- `frequency`;
- `fieldRadius`.

### `string-wave`

Dùng cho sóng trên dây. Preset phải có:

```ts
kind: "string-wave"
```

`applyParams` trả về `StringWaveScene` gồm:

- `mode: "traveling"` hoặc `"standing"`;
- `length`;
- `amplitude`;
- `wavelength`;
- `frequency`;
- `direction` nếu là sóng truyền;
- `harmonic` nếu là sóng dừng.

### `wave-field`

Dùng cho giao thoa ánh sáng/khe Young. Preset phải có:

```ts
kind: "wave-field"
```

Nên đặt công thức cường độ, bước sóng, khoảng vân trong `engines/wave-field/physics.ts` nếu cần tái dùng.

### `point-charge-field`

Dùng cho điện phổ hai điện tích điểm. Preset phải có:

```ts
kind: "point-charge-field"
```

`charges` dùng Coulomb thật. Nếu UI nhập nC hoặc µC, phải đổi đơn vị trong `applyParams`.

Ví dụ:

```ts
const q1 = (p.q1nC ?? 5) * 1e-9;
```

## 5. Tham số UI

Mỗi tham số trong `params` là `PresetParam`:

```ts
{
  key: "mass",
  label: "Khối lượng",
  unit: "kg",
  min: 0.1,
  max: 10,
  step: 0.1,
  default: 1,
}
```

Quy tắc:

- `key` phải ổn định, không đổi tuỳ tiện vì UI dùng để lưu giá trị.
- `default` phải nằm trong `[min, max]`.
- `step` đủ nhỏ để học sinh thấy thay đổi, nhưng không quá nhỏ gây khó kéo slider.
- `label` và `unit` dùng tiếng Việt.
- Trong `applyParams`, luôn dùng `p.key ?? defaultValue`.

Không đọc trực tiếp từ `params.default` trong `applyParams`; khai báo rõ default gần công thức để công thức dễ đọc.

## 6. Phân tích, mốc giá trị và nút nhanh

### `analysis.landmarks`

Dùng khi thí nghiệm có trạng thái đặc biệt như:

- vị trí cân bằng;
- biên dao động;
- thời điểm chạm đất;
- thời điểm va chạm;
- giá trị lý thuyết cần so sánh.

Ví dụ:

```ts
analysis: {
  landmarks: [
    {
      key: "impact",
      label: "Chạm đất",
      description: "Thời điểm vật chạm mặt đất.",
      atTime: (p) => Math.sqrt((2 * (p.height ?? 5)) / 9.8),
      values: (p) => [{ label: "Độ cao ban đầu", value: String(p.height ?? 5), unit: "m" }],
    },
  ],
},
```

### `quickPresets`

Dùng để tạo các tình huống mẫu dễ bấm:

```ts
quickPresets: [
  { label: "Mặt nhẵn", params: { friction: 0 } },
  { label: "Có ma sát", params: { friction: 0.2 } },
],
```

Không lạm dụng `quickPresets`. Chỉ thêm khi nó giúp người học thấy ngay hai hoặc ba trường hợp khác nhau.

## 7. Chú thích trực quan

Preset cơ học có thể thêm:

- `bodyLabels`: nhãn bám theo vật;
- `bodySigns`: dấu ngắn ở tâm vật, ví dụ `+`, `-`;
- `bodyColors`: màu riêng cho từng vật;
- `annotations`: mũi tên, nhãn, hình chữ nhật, đường cong tĩnh;
- `minimalOverlay`: ẩn bớt trục/nhãn debug để giống sơ đồ SGK.

Chú thích chỉ phục vụ hiển thị, không được ảnh hưởng vật lý.

Ví dụ:

```ts
bodyLabels: { ball: "m" },
bodyColors: { ball: "#60a5fa" },
annotations: () => [
  { kind: "arrow", x1: -1, y1: 0.5, x2: 1, y2: 0.5, color: "#ef4444", arrowAt: "end" },
  { kind: "label", x: 1.1, y: 0.5, text: "F", color: "#ef4444" },
],
```

## 8. Khi nào cần engine mới

Chỉ thêm thư mục mới trong `engines/` khi thí nghiệm không thể mô tả bằng engine hiện có.

Ví dụ cần engine mới:

- quang hình học: tia sáng, gương, thấu kính;
- mạch điện: điện trở, nguồn, tụ điện, dòng điện theo thời gian;
- nhiệt học: khí lý tưởng, piston, quá trình đẳng nhiệt/đẳng áp;
- từ trường: lực Lorentz, chuyển động hạt trong từ trường;
- vật rắn quay: mô-men lực, góc quay, mô-men quán tính.

Khi tạo engine mới, cần làm đủ:

1. Tạo `engines/<ten-engine>/types.ts`.
2. Tách công thức thuần vào các file như `physics.ts`, `coordinates.ts`, `math.ts`.
3. Tạo renderer tương ứng trong `renderers/<ten-engine>/`.
4. Thêm loại preset mới vào `presets/types.ts`.
5. Cập nhật `fe/app/mo-phong-vat-ly/page.tsx` để dynamic import renderer mới.
6. Tạo ít nhất một preset dùng engine mới.
7. Chạy `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`.

Không nhét engine mới vào preset hoặc renderer để làm nhanh, vì sau đó rất khó tái dùng và kiểm tra.

## 9. Khi nào cần renderer mới

Tạo renderer mới khi:

- scene mới có cấu trúc khác hoàn toàn scene hiện có;
- cần Canvas thay vì Konva vì số điểm/pixel lớn;
- cần tương tác đặc biệt như kéo điện tích, vẽ trường, pan/zoom riêng;
- renderer hiện có phải bị sửa quá nhiều điều kiện `if`.

Không tạo renderer mới nếu chỉ cần đổi màu, nhãn, mũi tên hoặc vài annotation. Những việc đó nên xử lý trong preset.

## 10. Checklist trước khi xong

Trước khi coi là hoàn thành, kiểm tra:

- File preset mới nằm trong `presets/`.
- Preset đã được import và thêm vào `PRESETS`.
- `id` không trùng preset khác.
- `kind` đúng với engine cần dùng.
- `params` có `default`, `min`, `max`, `step` hợp lý.
- `applyParams` dùng `p.key ?? default`.
- Đơn vị vật lý rõ ràng, ưu tiên SI trong engine.
- Không đặt công thức vật lý lõi trong renderer.
- Không tạo engine/renderer mới nếu engine/renderer cũ đáp ứng được.
- Chạy được:

```powershell
cd fe
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

## 11. Lỗi thường gặp

### Thí nghiệm không hiện trên web

Nguyên nhân thường gặp:

- quên thêm preset vào `PRESETS`;
- `id` bị trùng;
- file export sai tên so với import.

### Renderer không chạy đúng

Nguyên nhân thường gặp:

- `kind` sai hoặc thiếu;
- `applyParams` trả về scene không đúng type;
- dùng sai đơn vị, ví dụ nhập nC nhưng không đổi sang Coulomb.

### Vật cơ học bay hoặc nổ số

Nguyên nhân thường gặp:

- lò xo quá cứng so với khối lượng;
- lực quá lớn vì sai đơn vị;
- `mass` quá nhỏ;
- ràng buộc bị khai báo sai `id` body;
- dùng lò xo cứng thay cho `rod` hoặc `surface`.

### Slider đổi nhưng cảnh không đổi

Nguyên nhân thường gặp:

- `key` trong `params` khác `p.key` trong `applyParams`;
- dùng default cố định nhưng quên đọc `p`;
- quick preset đặt sai tên tham số.

## 12. Nguyên tắc ngắn gọn

- Thêm thí nghiệm mới: ưu tiên thêm `preset`.
- Thêm công thức mới: đặt trong `engines`.
- Thêm cách vẽ mới: đặt trong `renderers`.
- Dùng chung nhiều nơi: đặt trong `shared`.
- Preset khai báo scene, engine tính vật lý, renderer chỉ vẽ.
