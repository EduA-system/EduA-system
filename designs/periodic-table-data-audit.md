# Kiểm chứng dữ liệu bảng tuần hoàn

## Phạm vi và nguồn chuẩn

| Nhóm dữ liệu | Nguồn chuẩn | Quy tắc |
| --- | --- | --- |
| Số hiệu, ký hiệu, tên, nhóm/chu kỳ | [IUPAC Periodic Table](https://iupac.org/what-we-do/periodic-table-of-elements/) | IUPAC là nguồn quyết định cho danh tính nguyên tố. |
| Khối lượng nguyên tử và đồng vị | [CIAAW](https://ciaaw.org/atomic-weights.htm), [NIST isotopic compositions](https://physics.nist.gov/cgi-bin/Compositions/stand_alone.pl?isotype=all) | Không suy neutron từ atomic weight; dùng đồng vị minh họa riêng. |
| Cấu hình electron, năng lượng ion hóa | [NIST ASD](https://www.nist.gov/pml/atomic-spectra-database) | Kiểm tra trạng thái cơ bản của nguyên tử trung hòa. |
| Trạng thái, nhiệt độ chuyển pha, density, Pauling EN, electron affinity, atomic radius | [PubChem Periodic Table](https://pubchem.ncbi.nlm.nih.gov/periodic-table/) | Ghi rõ định nghĩa/đơn vị của từng trường; atomic radius là van der Waals nếu lấy từ PubChem. |

## Kết quả baseline

`npm run audit:periodic-table` kiểm tra 118 record hiện tại: số hiệu/symbol duy nhất, proton và electron của nguyên tử trung hòa, tổng electron của cấu hình, và đối chiếu neutron với đồng vị minh họa. Lệnh `npm run audit:periodic-table -- --format=csv` xuất CSV các giá trị neutron cần duyệt.

Baseline hiện tại có **0 lỗi cấu trúc** và **31 giá trị neutron cần duyệt**. Những nguyên tố không có thành phần đồng vị tự nhiên đặc trưng được đánh dấu `requiresIsotopeSelection`; audit không suy diễn số neutron cho chúng.

Các trường vật lý hiện vẫn là dữ liệu legacy: chỉ thay thế sau khi reviewer xác nhận giá trị, điều kiện đo và nguồn PubChem/NIST cho từng nguyên tố. Giá trị thiếu dữ liệu phải là `null`, không được nội suy.

## Thay đổi dữ liệu dự kiến

`representative-isotopes.ts` là bộ dữ liệu chuẩn bị để duyệt, chưa được nối vào UI. Nó lưu số khối và neutron của một đồng vị minh họa. Khi áp dụng, thay nhãn `Neutron` bằng `Đồng vị minh họa` (ví dụ `Cu-63: 29 proton, 34 neutron`), đồng thời truyền neutron từ đồng vị này vào mô hình 3D.

Mô hình nguyên tử vẫn phải được mô tả là hình minh họa giáo khoa: vòng electron không phải quỹ đạo vật lý và không diễn tả phân bố xác suất lượng tử.
