# Huong dan tao manual test case cho thi nghiem mo phong

Tai lieu nay ghi lai cach tao test case thu cong cho cac thi nghiem trong module `/mo-phong-vat-ly`.

Muc tieu la tao test case theo tung bo tham so dau vao cua thi nghiem. Moi dong trong file Excel la mot lan test voi mot tap input, co ket qua mong doi va ket qua thuc te de doi chieu.

## Khi nao dung mau nay

Dung mau manual test nay cho cac phan khong phu hop unit test:

- Canvas render.
- Duong suc, song, vector, vat the hien thi tren man hinh.
- Play/Pause/Reset.
- Slider/input tham so.
- Keo tha tren canvas.
- Responsive/layout.
- Ket qua quan sat bang mat cua thi nghiem.

Unit test van nen dung cho cong thuc vat ly thuan, engine, preset va cac ham tinh toan.

## Cau truc sheet

Moi thi nghiem nen co mot tab rieng trong file test.

Vi du:

- `Dien pho hai dien tich`
- `Song dung`
- `Roi tu do`
- `Giao thoa anh sang`

Phan dau sheet gom:

| Field | Noi dung |
| --- | --- |
| `Execution Date` | Ngay test |
| `Executor` | Nguoi test |
| `Subject` | Ten thi nghiem |
| `Note` | Mo ta ngan ve pham vi test |

Phan summary gom:

| Field | Y nghia |
| --- | --- |
| `Success` | So case pass |
| `Failed` | So case fail |
| `System Failed` | Loi do he thong/test environment |
| `Ignore` | Case bo qua |
| `Total Test Cases` | Tong so case |

## Cot trong bang test case

| Cot | Y nghia |
| --- | --- |
| `No` | So thu tu |
| `Test Case ID` | Ma test case, vi du `SIM-DP-01` |
| `Experiment` | Ten thi nghiem |
| `Input Parameters` | Tap tham so dau vao |
| `Action` | Thao tac test |
| `Expected Result` | Ket qua mong doi |
| `Actual Result` | Ket qua thuc te quan sat |
| `Status` | `Success`, `Failed`, `Untested`, `Ignore` |
| `StartDate` | Thoi diem bat dau test |
| `EndDate` | Thoi diem ket thuc test |
| `Note` | Ghi chu |
| `Defect Type` | Ma loi neu case fail |

## Cach dat Test Case ID

Dung format:

```text
SIM-<SHORT_EXPERIMENT>-<NUMBER>
```

Vi du:

| Thi nghiem | Prefix |
| --- | --- |
| Dien pho hai dien tich | `SIM-DP` |
| Song dung | `SIM-SD` |
| Roi tu do | `SIM-RTD` |
| Giao thoa anh sang | `SIM-GTAS` |

Vi du ma case:

```text
SIM-DP-01
SIM-DP-02
SIM-DP-03
```

## Cach viet Input Parameters

`Input Parameters` la tap tham so dau vao cua thi nghiem.

Nen ghi ro key, gia tri va don vi neu co:

```text
q1=+5nC; q2=-5nC; epsilonR=1; displayMode=Duong suc
```

```text
length=1.2m; harmonic=3; amplitude=0.2m; frequency=2Hz
```

```text
h=10m; g=9.8m/s^2
```

Nen tao case cho cac nhom input:

- Gia tri mac dinh.
- Hai hoac ba tinh huong vat ly quan trong.
- Gia tri bien min/max cua slider.
- Thao tac keo tha neu thi nghiem co canvas interaction.
- Doi display mode neu thi nghiem co nhieu che do hien thi.

## Cach viet Expected Result

`Expected Result` nen mo ta ca hai phan:

1. Hien tuong vat ly dung.
2. UI/canvas khong loi.

Khong can viet qua toan hoc neu day la manual test. Ket qua mong doi co the la mo ta quan sat.

Mau cau:

```text
Duong suc dien xuat phat tu dien tich duong va ket thuc o dien tich am. Mat do duong suc cao hon o vung giua hai dien tich. Canvas hien thi on dinh, khong trang man, khong vo hinh.
```

```text
Vat roi nhanh dan theo phuong thang dung. Khi reset, vat quay ve vi tri ban dau. Canvas khong bi loi va thong so tren panel khong bi mat.
```

```text
Nut song dung yen, bung song dao dong voi bien do lon nhat. Khi doi harmonic, so nut va bung thay doi tuong ung. Canvas van render on dinh.
```

## Cach viet Actual Result

`Actual Result` ghi ket qua thuc te sau khi test.

Neu pass:

```text
Hien thi dung nhu expected.
```

Hoac ro hon:

```text
Duong suc di tu + sang -, canvas cap nhat on dinh sau khi doi tham so.
```

Neu fail:

```text
Khi q1=max va q2=min, canvas bi trang sau khi keo slider.
```

```text
Keo dien tich q1 nhung duong suc khong cap nhat theo vi tri moi.
```

## Defect Type

Co the dung cac ma loi chung cho module mo phong:

| Defect Type | Y nghia |
| --- | --- |
| `SIM-ER-01` | Canvas khong render / trang man |
| `SIM-ER-02` | Ket qua vat ly sai |
| `SIM-ER-03` | Slider/input khong cap nhat mo phong |
| `SIM-ER-04` | Play/Pause/Reset loi |
| `SIM-ER-05` | UI vo layout hoac responsive loi |
| `SIM-ER-06` | Keo tha/tuong tac canvas loi |

Neu case pass thi de trong `Defect Type`.

## Vi du: Dien pho hai dien tich

| Test Case ID | Input Parameters | Action | Expected Result |
| --- | --- | --- | --- |
| `SIM-DP-01` | `q1=+5nC; q2=-5nC; epsilonR=1; displayMode=Duong suc` | Mo thi nghiem va chon cau hinh hai dien tich trai dau. | Duong suc dien xuat phat tu dien tich duong va ket thuc o dien tich am. Mat do duong suc cao hon o vung giua hai dien tich. Canvas hien thi on dinh, khong trang man, khong vo hinh. |
| `SIM-DP-02` | `q1=+5nC; q2=+5nC; epsilonR=1` | Doi q2 sang cung dau duong voi q1. | Duong suc dien toa ra tu ca hai dien tich duong. Khong co duong suc noi truc tiep giua hai dien tich. Vung giua hai dien tich the hien xu huong day nhau cua dien truong. |
| `SIM-DP-03` | `q1=-5nC; q2=-5nC; epsilonR=1` | Doi ca hai dien tich sang dau am. | Duong suc dien huong vao ca hai dien tich am. Khong co duong suc di ra tu dien tich am. Hinh anh dien pho doi xung khi hai dien tich co cung do lon. |
| `SIM-DP-04` | `q1=+10nC; q2=-5nC; epsilonR=1` | Tang do lon q1 lon hon q2. | Vung dien truong quanh q1 manh hon quanh q2. Duong suc van co chieu tu dien tich duong sang dien tich am. Canvas van render on dinh. |
| `SIM-DP-05` | `q1=+5nC; q2=-5nC; epsilonR=5` | Tang hang so dien moi epsilonR. | Cuong do dien truong giam so voi epsilonR=1 neu UI the hien do manh bang vector/mau/do sang. Chieu duong suc khong doi. Khong phat sinh loi hien thi. |
| `SIM-DP-06` | `q1=+5nC; q2=-5nC; keo q1 sang vi tri moi` | Keo dien tich q1 trong canvas roi tha. | Dien tich di chuyen theo thao tac keo. Duong suc dien va vung dien truong cap nhat theo vi tri moi. Khong crash, khong dung hinh. |
| `SIM-DP-07` | `q1=+5nC; q2=-5nC; khoang cach hai dien tich nho` | Keo hai dien tich lai gan nhau. | Dien truong vung giua hai dien tich manh hon. Canvas van hien thi on dinh, khong xuat hien NaN/Infinity, khong mat duong suc. |
| `SIM-DP-08` | `q1=+5nC; q2=-5nC; khoang cach hai dien tich lon` | Keo hai dien tich ra xa nhau. | Tuong tac giua hai dien tich yeu hon; dien pho quanh moi dien tich tach biet hon. Canvas van render dung va khong mat nhan/ky hieu. |
| `SIM-DP-09` | `q1=min/max; q2=min/max; epsilonR=min/max` | Keo cac slider toi gia tri bien min/max. | Mo phong cap nhat theo gia tri moi. Khong trang man, khong vo hinh, khong mat duong suc, khong loi giao dien. |
| `SIM-DP-10` | `q1=+5nC; q2=-5nC; displayMode=Dien the/Vector neu co` | Doi che do hien thi trong thi nghiem. | Che do hien thi thay doi dung theo lua chon. Noi dung canvas van phan anh cung cau hinh dien tich; panel tham so khong bi reset ngoai y muon. |

## Checklist truoc khi ket thuc mot tab manual test

- Moi case co `Input Parameters` ro rang.
- `Expected Result` co ca vat ly dung va UI/canvas on dinh.
- `Actual Result` duoc dien sau khi test that.
- `Status` duoc cap nhat thanh `Success` hoac `Failed`.
- Case fail co `Note` va `Defect Type`.
- Summary tren dau sheet duoc cap nhat dung so luong pass/fail/ignore.
