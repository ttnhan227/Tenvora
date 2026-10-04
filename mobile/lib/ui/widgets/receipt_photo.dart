import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/utils/formatters.dart';

class ReceiptPhoto extends StatefulWidget {
  const ReceiptPhoto({
    super.key,
    required this.value,
    required this.vietnamese,
    this.onChanged,
    this.enabled = true,
    this.pickImage,
  });
  final String? value;
  final bool vietnamese;
  final ValueChanged<String>? onChanged;
  final bool enabled;
  final Future<XFile?> Function(ImageSource)? pickImage;
  @override
  State<ReceiptPhoto> createState() => _ReceiptPhotoState();
}

class _ReceiptPhotoState extends State<ReceiptPhoto> {
  bool _picking = false;
  String label(String en, String vi) => widget.vietnamese ? vi : en;
  Future<void> _pick(ImageSource source) async {
    setState(() => _picking = true);
    try {
      final file =
          await (widget.pickImage?.call(source) ??
              ImagePicker().pickImage(
                source: source,
                imageQuality: 75,
                maxWidth: 1800,
              ));
      if (file == null) return;
      final bytes = await file.readAsBytes();
      final mime =
          bytes.length >= 4 && bytes[0] == 137 && bytes[1] == 80
              ? 'image/png'
              : bytes.length >= 12 &&
                  ascii.decode(bytes.sublist(0, 4), allowInvalid: true) ==
                      'RIFF'
              ? 'image/webp'
              : 'image/jpeg';
      if (mounted) {
        widget.onChanged?.call('data:$mime;base64,${base64Encode(bytes)}');
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              label(
                'Could not open photo. Please try again and allow camera or photo access.',
                'Không mở được ảnh. Vui lòng thử lại và cho phép truy cập ảnh hoặc máy ảnh.',
              ),
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _picking = false);
    }
  }

  Widget _image() {
    final bytes = dataUrlBytes(widget.value);
    final fallback = Center(
      child: Text(label('Photo unavailable', 'Không hiển thị được ảnh')),
    );
    return bytes == null
        ? fallback
        : Image.memory(
          bytes,
          fit: BoxFit.contain,
          errorBuilder: (_, _, _) => fallback,
        );
  }

  void _view() => Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder:
          (_) => Scaffold(
            appBar: AppBar(title: Text(label('Receipt photo', 'Ảnh hóa đơn'))),
            body: Center(
              child: InteractiveViewer(
                minScale: 0.5,
                maxScale: 5,
                child: _image(),
              ),
            ),
          ),
    ),
  );
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      if (widget.value != null) ...[
        Semantics(
          button: true,
          label: label('View receipt photo', 'Xem ảnh hóa đơn'),
          child: InkWell(
            onTap: _view,
            child: SizedBox(height: 200, child: _image()),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label('Tap photo to enlarge', 'Chạm ảnh để phóng to'),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
      ],
      if (widget.onChanged != null)
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            OutlinedButton.icon(
              onPressed:
                  widget.enabled && !_picking
                      ? () => _pick(ImageSource.camera)
                      : null,
              icon: const Icon(Icons.camera_alt_outlined),
              label: Text(label('Take photo', 'Chụp ảnh')),
            ),
            OutlinedButton.icon(
              onPressed:
                  widget.enabled && !_picking
                      ? () => _pick(ImageSource.gallery)
                      : null,
              icon: const Icon(Icons.photo_library_outlined),
              label: Text(label('Choose photo', 'Chọn ảnh')),
            ),
          ],
        ),
      if (_picking) const LinearProgressIndicator(),
    ],
  );
}
