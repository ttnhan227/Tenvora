import 'dart:async';
import 'package:flutter/material.dart';

class SearchController extends TextEditingController {
  SearchController(this.onSearch) {
    addListener(_changed);
  }
  final VoidCallback onSearch;
  Timer? _timer;
  String _previous = '';

  void _changed() {
    if (_previous == text) return;
    _previous = text;
    _timer?.cancel();
    _timer = Timer(const Duration(milliseconds: 300), onSearch);
  }

  void searchNow() {
    _timer?.cancel();
    onSearch();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
