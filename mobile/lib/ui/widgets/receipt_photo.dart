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
  String? _pickError;
  String label(String en, String vi) => widget.vietnamese ? vi : en;
  Future<void> _pick(ImageSource source) async {
    setState(() {
      _picking = true;
      _pickError = null;
    });
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
      if (mounted) widget.onChanged?.call(imageDataUrl(bytes));
    } catch (_) {
      if (mounted) {
        setState(
          () =>
              _pickError =
                  source == ImageSource.camera
                      ? label(
                        'Could not open the camera. Check camera permission or choose a photo instead.',
                        'Không mở được máy ảnh. Hãy kiểm tra quyền máy ảnh hoặc chọn ảnh có sẵn.',
                      )
                      : label(
                        'Could not select a photo. Try again or take a photo instead.',
                        'Không chọn được ảnh. Hãy thử lại hoặc chụp ảnh mới.',
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
      if (_pickError != null)
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Semantics(
            liveRegion: true,
            child: Text(
              _pickError!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
        ),
      if (_picking) const LinearProgressIndicator(),
    ],
  );
}
