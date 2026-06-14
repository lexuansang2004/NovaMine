# NovaMine: Trợ Lý Tài Chính Thông Minh – Quyền Riêng Tư Tuyệt Đối

**NovaMine** không chỉ là một ứng dụng ghi chép thu chi thông thường. Đây là một hệ thống quản lý tài chính cá nhân được thiết kế để tối ưu sự tiện lợi thông qua công nghệ AI, đồng thời đặt quyền riêng tư dữ liệu của người dùng lên hàng đầu.

---

## 1. Trải nghiệm nhập liệu “rảnh tay” với công nghệ AI

NovaMine giúp loại bỏ rào cản lười ghi chép bằng một quy trình nhập liệu nhanh, trực quan và tiện lợi.

### Chụp ảnh hóa đơn

Người dùng bắt đầu mỗi giao dịch bằng cách chụp một tấm hình. Sau khi chụp, ứng dụng sẽ tự động tạo màn hình nhập liệu từ hình ảnh đã ghi nhận.

### Điều khiển bằng giọng nói

Thay vì phải nhập liệu thủ công, người dùng chỉ cần bật micro và nói. NovaMine hỗ trợ nhận diện:

* Tên loại phí
* Số tiền
* Đơn vị VNĐ

Điều này giúp quá trình ghi chép thu chi diễn ra nhanh hơn, tự nhiên hơn và phù hợp với thói quen sử dụng hằng ngày.

### Xác nhận thông minh

Mỗi mục dữ liệu đều có cơ chế kiểm tra riêng:

* **Thử lại**
* **Xác nhận**

Dữ liệu chỉ được lưu khi người dùng đã xác nhận nội dung là chính xác.

---

## 2. Triết lý Local-first – Dữ liệu là của bạn

Điểm khác biệt lớn nhất của NovaMine nằm ở triết lý **Local-first**: dữ liệu tài chính cá nhân phải thuộc quyền kiểm soát của chính người dùng.

### Lưu trữ cục bộ

Toàn bộ thông tin giao dịch và hình ảnh được lưu trực tiếp trên thiết bị của người dùng thông qua các công nghệ như:

* IndexedDB
* Dexie.js
* OPFS - Origin Private File System

Không có dữ liệu tài chính hay hình ảnh cá nhân nào bị tự động gửi lên máy chủ đám mây của bên thứ ba.

### Tốc độ vượt trội

Nhờ lưu trữ local, NovaMine có thể hoạt động nhanh, ổn định và không phụ thuộc hoàn toàn vào internet.

Lợi ích chính:

* Không cần backend trong giai đoạn MVP
* Không tốn chi phí server
* Truy xuất dữ liệu nhanh
* Phù hợp với mô hình ứng dụng cá nhân

### Kiểm soát toàn diện

Người dùng có thể tự quản lý dữ liệu của mình thông qua các tính năng:

* Export Backup
* Import dữ liệu
* Dọn dẹp ảnh cũ
* Theo dõi dung lượng đã sử dụng
* Quản lý dữ liệu ngay trên thiết bị cá nhân

---

## 3. Quản lý tài chính chi tiết và trực quan

NovaMine được thiết kế để giúp người dùng hiểu rõ dòng tiền của mình thông qua dữ liệu có cấu trúc và dễ truy vấn.

### Báo cáo đa chiều

Dữ liệu được tối ưu theo các khóa thời gian như:

* `dateKey`
* `hourKey`

Nhờ đó, ứng dụng có thể hỗ trợ:

* Xem lịch sử giao dịch
* Lọc giao dịch theo ngày, tuần, tháng
* Tìm kiếm theo loại phí
* Tổng hợp thu nhập
* Tổng hợp chi tiêu
* Phân tích dòng tiền theo thời gian

### Lưu trữ thông tin đa dạng

Mỗi giao dịch không chỉ bao gồm số tiền, mà còn có thể đi kèm nhiều thông tin hỗ trợ:

* Hình ảnh hóa đơn
* Loại giao dịch: Thu nhập hoặc Chi tiêu
* Tên loại phí
* Số tiền VNĐ
* Ghi chú
* Vị trí địa lý
* Thời gian phát sinh giao dịch
* Lịch sử nhập liệu bằng giọng nói

### Tự động hóa thông minh

NovaMine hỗ trợ xử lý hình ảnh ngay trên thiết bị:

* Tạo thumbnail để hiển thị nhanh
* Nén ảnh tối ưu dung lượng
* Ưu tiên định dạng WebP hoặc JPEG
* Giữ chất lượng đủ tốt để đọc nội dung hóa đơn

Điều này giúp tiết kiệm bộ nhớ mà vẫn đảm bảo trải nghiệm sử dụng mượt mà.

---

## 4. Người bạn đồng hành bền vững

NovaMine được xây dựng với mục tiêu trở thành một công cụ quản lý tài chính cá nhân bền vững, an toàn và dễ mở rộng.

### Soft Delete

Ứng dụng hỗ trợ cơ chế **Soft Delete**, giúp bảo vệ người dùng khỏi việc xóa nhầm dữ liệu quan trọng.

Thay vì xóa vĩnh viễn ngay lập tức, dữ liệu sẽ được đánh dấu là đã xóa, giúp người dùng có cơ hội khôi phục khi cần.

### Sẵn sàng mở rộng

NovaMine được định hướng phát triển theo từng giai đoạn:

* Giai đoạn 1: React Web Test
* Giai đoạn 2: PWA hoặc Expo
* Giai đoạn 3: Mở rộng báo cáo, backup, restore và tối ưu trải nghiệm mobile

Nền tảng công nghệ hiện đại giúp NovaMine có thể hoạt động trên nhiều môi trường khác nhau, từ Web đến Mobile.

---

## Công nghệ dự kiến

* React
* Vite
* TypeScript
* IndexedDB
* Dexie.js
* OPFS
* Web Camera API
* Web Speech API
* Geolocation API
* PWA
* Expo trong giai đoạn mở rộng mobile

---

## Tầm nhìn sản phẩm

NovaMine hướng đến việc biến quản lý tiền bạc từ một thói quen khô khan thành một trải nghiệm nhanh, thông minh, an toàn và thú vị hơn.

> **NovaMine – Biến việc quản lý tiền bạc trở thành một thói quen thú vị, an toàn và thông minh hơn bao giờ hết.**
