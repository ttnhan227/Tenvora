import 'package:flutter/material.dart';
import '../../core/utils/formatters.dart';
import '../widgets/common.dart';

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr(context, 'Privacy', 'Quyền riêng tư'))),
    body: PagePadding(
      child: ListView(
        children: [
          Text(
            tr(context, 'Tenvora privacy', 'Quyền riêng tư Tenvora'),
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 16),
          Text(
            tr(
              context,
              'Tenvora stores your account email, profile, workspace information, business records, receipt photos, and AI conversations on its hosted server. These records are available to authorized members of your workspace according to their role. Passwords are hashed; sign-in credentials are stored securely on this device.',
              'Tenvora lưu email tài khoản, hồ sơ, thông tin doanh nghiệp, sổ sách, ảnh hóa đơn và hội thoại AI trên máy chủ. Thành viên được cấp quyền có thể xem dữ liệu theo vai trò. Mật khẩu được băm; thông tin đăng nhập được lưu bảo mật trên thiết bị.',
            ),
          ),
          const SizedBox(height: 16),
          Text(
            tr(
              context,
              'Camera and photo access are used only when you choose a receipt or product image. Only the selected image is uploaded. Google sign-in sends a Google identity token to the Tenvora server. AI requests send your question and relevant business context to Google Gemini. Avoid including sensitive information you do not want processed by the AI provider.',
              'Máy ảnh và thư viện ảnh chỉ dùng khi bạn chọn ảnh hóa đơn hoặc sản phẩm. Chỉ ảnh được chọn mới được tải lên. Đăng nhập Google gửi mã định danh tới máy chủ Tenvora. Câu hỏi và ngữ cảnh kinh doanh liên quan được gửi tới Google Gemini. Tránh đưa thông tin nhạy cảm không cần thiết vào câu hỏi AI.',
            ),
          ),
          const SizedBox(height: 16),
          Text(
            tr(
              context,
              'Delete your account from Settings. Your profile, credentials and AI conversations are removed. If you are the only workspace member, the workspace and its business data are also deleted. Shared business records remain for the other members with your actor identity removed. The last administrator of a team must add another administrator first. Deletion from active storage does not instantly erase copies in existing provider backups.',
              'Xóa tài khoản trong Cài đặt để xóa hồ sơ, thông tin đăng nhập và hội thoại AI. Nếu bạn là thành viên duy nhất, doanh nghiệp và dữ liệu kinh doanh cũng bị xóa. Sổ sách dùng chung được giữ cho thành viên khác và bỏ định danh người thao tác của bạn. Quản trị viên cuối cùng cần thêm quản trị viên khác trước. Xóa trên máy chủ đang hoạt động không xóa tức thì bản sao lưu của nhà cung cấp.',
            ),
          ),
          const SizedBox(height: 16),
          const SelectableText('https://tenvora-client.onrender.com/privacy'),
          const SizedBox(height: 8),
          Text(
            tr(
              context,
              'Support and privacy contact',
              'Hỗ trợ và liên hệ quyền riêng tư',
            ),
          ),
          const SelectableText('ccleemon227@gmail.com'),
          const SizedBox(height: 8),
          Text(
            tr(
              context,
              'After uninstalling, use the account-deletion page on the website.',
              'Sau khi gỡ ứng dụng, dùng trang xóa tài khoản trên website.',
            ),
          ),
          const SelectableText(
            'https://tenvora-client.onrender.com/delete-account',
          ),
        ],
      ),
    ),
  );
}
