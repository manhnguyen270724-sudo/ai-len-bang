# Ai Lên Bảng?

Công cụ lớp học React + TypeScript + Vite, hoạt động ở trình duyệt, không backend/đăng nhập. Ba sân chơi SVG/CSS: UFO, hoàng thượng và cơn lốc deadline.

## Chạy local

Yêu cầu Node.js 22+ (đã kiểm tra bằng Node 24).

```powershell
npm.cmd ci
npm.cmd run dev
```

Mở URL Vite in ra, thông thường http://127.0.0.1:5173. Dùng `npm` thay `npm.cmd` trên macOS/Linux. Trên Windows, `.cmd` tránh lỗi execution policy của PowerShell.

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

## Sử dụng

- Lần đầu có lớp mẫu 12 sinh viên. Chọn **+** để tạo lớp riêng; **Quản lý** để thêm/sửa/xóa hoặc điểm danh.
- Dán mỗi dòng `Tên` hoặc `Mã | Tên`. Tên trùng không bị gộp; mỗi sinh viên có UUID riêng.
- Chọn một/nhiều người dùng danh sách có mặt và tùy chọn không gọi lại. Khi hết người, mở Lịch sử → Đặt lại lịch sử gọi.
- Chia nhóm dùng tất cả người có mặt, độc lập lịch sử gọi. Chia theo số nhóm hoặc số người tối đa, chênh lệch tối đa một người.
- Danh sách nhóm nằm dưới kết quả, có thể đổi tên. Bốc thăm nhóm dùng nhóm đã chia hoặc danh sách tên nhóm nhập thủ công. Đặt lại lượt nhóm độc lập lịch sử gọi sinh viên.
- Thay đổi danh sách/điểm danh làm nhóm cũ bị cảnh báo, cần chia lại trước khi bốc thăm. Không âm thầm sửa thành viên nhóm cũ.
- Buổi mới có xác nhận, giữ danh sách lớp nhưng đặt lại điểm danh, nhóm và lịch sử.
- Kết quả chốt một lần trước hoạt cảnh 10 giây (8 giây chạy tán loạn, 2 giây cuối tiếp cận và bắt người). Bỏ qua không bốc lại; giảm chuyển động công bố sau 120 ms.
- Sao lưu JSON gồm lớp, danh sách, buổi hiện tại; nhập có xem trước. Mặc định tạo lớp mới, tùy chọn thay thế lớp trùng cần xác nhận.

## Dữ liệu và giới hạn

Dữ liệu phiên bản 1 lưu tại localStorage `ai-len-bang.v1`. Không gửi danh sách tới dịch vụ bên ngoài. Font Google Fonts có fallback hệ thống, không nhận dữ liệu sinh viên. Xóa dữ liệu trình duyệt hoặc đổi origin/cổng không mang theo danh sách: hãy xuất JSON định kỳ.

Giới hạn nhập: 5 MB/tệp, 100 lớp, 2.000 sinh viên/lớp; tên tối đa 150 ký tự, mã 60 ký tự. Hiển thị tối đa 24 nhân vật để giảm tải nhưng chọn trên toàn bộ người đủ điều kiện. Lưu tối đa 1.000 lượt/buổi, lịch sử giữ bản chụp tên. Buổi mới xóa buổi trước, chưa có kho lưu trữ nhiều buổi: xuất JSON trước khi bắt đầu buổi mới nếu cần giữ.

Nếu localStorage lỗi, ứng dụng báo chưa lưu. Dữ liệu hỏng không bị ghi đè cho đến khi người dùng xác nhận cho phép lưu lại. Thay đổi trong bộ nhớ vẫn dùng được và có thể xuất JSON. Không hỗ trợ đồng bộ nhiều tab/thiết bị. Fullscreen, Clipboard và Web Audio tùy khả năng trình duyệt; có xử lý lỗi.

Hoạt cảnh chia nhóm diễn đồng thời trong một lượt ngắn, với các bến nhóm màu; chưa có chuyến đón riêng nối tiếp cho từng nhóm. Các nhân vật mô phỏng không quyết định xác suất.

## Cấu trúc

- `src/core.ts`: mô hình dữ liệu, Fisher–Yates + Crypto rejection sampling, chia nhóm, parse/validate và lưu trữ.
- `src/Scene.tsx`: nhân vật SVG, vật thể và sân chơi ba concept.
- `src/main.tsx`: giao diện và thao tác lớp/buổi, điều phối kết quả/hoạt cảnh, sao lưu.
- `src/style.css`: giao diện responsive, keyframes, reduced motion.
- `src/core.test.ts`: test logic biên và lưu trữ.

## Vercel

Chưa push hoặc deploy. Khi sẵn sàng, đưa mã nguồn vào Git theo quy trình nhánh của bạn và Import Project trên Vercel. Framework **Vite**, Build Command `npm run build`, Output Directory `dist`, Node.js 22 hoặc 24. Đã có `vercel.json`. Không cần biến môi trường hay backend. Hoặc dùng Vercel CLI trong workspace sau khi bạn chủ động cho phép triển khai.

## Checklist test local trước deploy

- [ ] Tạo hai lớp, dán danh sách có tên trùng/mã, sửa/xóa và chuyển lớp rồi reload.
- [ ] Đánh dấu một người vắng: người đó không có trong kết quả chọn hoặc chia nhóm.
- [ ] Chạy cả ba concept; chọn nhiều người, bỏ qua, bấm nhanh liên tục, reload trong lúc chạy.
- [ ] Không gọi lại đến hết danh sách; đặt lại lịch sử. Kiểm tra kết quả/lịch sử không đổi khi chuyển concept.
- [ ] Chia nhóm theo hai cách, kiểm tra đủ người/cân bằng, đổi tên, bốc thăm, không chọn lại và đặt lại lượt nhóm.
- [ ] Đổi điểm danh sau chia nhóm và xác nhận cảnh báo; chia lại để tiếp tục.
- [ ] Xuất JSON, thử nhập tệp sai, nhập bản hợp lệ thành lớp mới, thử thay thế có xác nhận.
- [ ] Test mobile, bàn phím Tab/Escape, reduced motion, toàn màn hình, âm thanh và sao chép.
- [ ] Bắt đầu buổi mới và kiểm tra danh sách giữ nguyên, lịch sử/nhóm bị xóa theo xác nhận.
