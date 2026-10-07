import 'package:flutter/material.dart';

/// Locks the owning surface before opening a dialog or starting a write.
/// The dialog stays interactive while the underlying surface cannot start a
/// second operation. Errors and cancellation always release the lock.
mixin ActionGuard<T extends StatefulWidget> on State<T> {
  bool _actionRunning = false;

  Future<void> runAction(Future<void> Function() action) async {
    if (_actionRunning || !mounted) return;
    setState(() => _actionRunning = true);
    try {
      await action();
    } finally {
      if (mounted) setState(() => _actionRunning = false);
    }
  }

  Widget guardActions(Widget child) => Stack(
    children: [
      AbsorbPointer(absorbing: _actionRunning, child: child),
      if (_actionRunning && (ModalRoute.of(context)?.isCurrent ?? true))
        const Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: LinearProgressIndicator(),
        ),
    ],
  );
}
