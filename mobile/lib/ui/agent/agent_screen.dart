import 'package:flutter/material.dart';

import '../../core/utils/formatters.dart';
import '../../domain/models.dart';
import '../../state/app_controller.dart';
import '../widgets/common.dart';

class AgentScreen extends StatefulWidget {
  const AgentScreen({super.key});

  @override
  State<AgentScreen> createState() => _AgentScreenState();
}

class _AgentScreenState extends State<AgentScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final List<AgentMessage> _messages = [];
  String? _conversationId;
  bool _busy = false;

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send([String? suggested]) async {
    final text = (suggested ?? _input.text).trim();
    if (text.isEmpty || _busy) return;
    _input.clear();
    setState(() {
      _messages.add(
        AgentMessage(
          id: DateTime.now().microsecondsSinceEpoch.toString(),
          role: 'user',
          content: text,
          createdAt: DateTime.now(),
        ),
      );
      _busy = true;
    });
    _toBottom();

    try {
      final body = await AppScope.of(
        context,
      ).repository.agentChat(text, conversationId: _conversationId);
      _conversationId = jsonString(body['conversationId']) ?? _conversationId;
      final response =
          body['message'] is Map
              ? AgentMessage.fromJson(Json.from(body['message'] as Map))
              : AgentMessage.fromJson(body);
      if (mounted) setState(() => _messages.add(response));
    } catch (error) {
      if (mounted) showMessage(context, readableError(error), error: true);
    } finally {
      if (mounted) {
        setState(() => _busy = false);
        _toBottom();
      }
    }
  }

  void _toBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 260),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _confirm(AgentProposal proposal, bool confirmed) async {
    if (proposal.actionId == null) return;
    try {
      final result = await AppScope.of(
        context,
      ).repository.confirmAction(proposal.actionId!, confirmed);
      if (mounted) {
        setState(() => _messages.add(AgentMessage.fromJson(result)));
      }
    } catch (error) {
      if (mounted) showMessage(context, readableError(error), error: true);
    }
  }

  Future<void> _loadConversation(String id) async {
    setState(() => _busy = true);
    try {
      final body = await AppScope.of(context).repository.conversation(id);
      final messages =
          jsonList(body['messages']).map(AgentMessage.fromJson).toList();
      if (mounted) {
        setState(() {
          _conversationId = id;
          _messages
            ..clear()
            ..addAll(messages);
        });
      }
    } catch (error) {
      if (mounted) showMessage(context, readableError(error), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _deleteConversation(BuildContext sheetContext, String id) async {
    await AppScope.of(context).repository.deleteConversation(id);
    if (sheetContext.mounted) Navigator.pop(sheetContext);
    if (_conversationId == id && mounted) {
      setState(() {
        _conversationId = null;
        _messages.clear();
      });
    }
  }

  Future<void> _history() async {
    try {
      final items = await AppScope.of(context).repository.conversations();
      if (!mounted) return;
      await showModalBottomSheet<void>(
        context: context,
        useSafeArea: true,
        builder:
            (sheetContext) => Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          tr(
                            context,
                            'Conversation history',
                            'Lịch sử trò chuyện',
                          ),
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(sheetContext),
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Expanded(
                    child:
                        items.isEmpty
                            ? EmptyState(
                              icon: Icons.chat_bubble_outline,
                              title: tr(
                                context,
                                'No conversations',
                                'Chưa có cuộc trò chuyện',
                              ),
                              message: '',
                            )
                            : ListView.separated(
                              itemCount: items.length,
                              separatorBuilder: (_, _) => const Divider(),
                              itemBuilder: (_, index) {
                                final item = items[index];
                                final id = '${item['id'] ?? ''}';
                                return ListTile(
                                  title: Text(
                                    '${item['title'] ?? tr(context, 'Conversation', 'Cuộc trò chuyện')}',
                                  ),
                                  subtitle: Text(
                                    '${item['lastMessage'] ?? ''}',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  trailing: IconButton(
                                    onPressed:
                                        () => _deleteConversation(
                                          sheetContext,
                                          id,
                                        ),
                                    icon: const Icon(Icons.delete_outline),
                                  ),
                                  onTap: () {
                                    Navigator.pop(sheetContext);
                                    _loadConversation(id);
                                  },
                                );
                              },
                            ),
                  ),
                ],
              ),
            ),
      );
    } catch (error) {
      if (mounted) showMessage(context, readableError(error), error: true);
    }
  }

  void _newChat() {
    setState(() {
      _conversationId = null;
      _messages.clear();
      _input.clear();
    });
  }

  Widget _emptyState(BuildContext context) {
    final suggestions = [
      tr(
        context,
        'How is my business doing this month?',
        'Tình hình kinh doanh tháng này?',
      ),
      tr(context, 'Which customers still owe me?', 'Khách hàng nào còn nợ?'),
      tr(
        context,
        'Show products that are low in stock.',
        'Sản phẩm nào sắp hết hàng?',
      ),
    ];
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const SizedBox(height: 16),
        Icon(
          Icons.auto_awesome,
          size: 44,
          color: Theme.of(context).colorScheme.primary,
        ),
        const SizedBox(height: 16),
        Text(
          tr(context, 'Ask about your business', 'Hỏi về doanh nghiệp của bạn'),
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 8),
        Text(
          tr(
            context,
            'The agent can summarize data and prepare actions. You confirm before anything changes.',
            'Trợ lý có thể tóm tắt dữ liệu và chuẩn bị thao tác. Bạn luôn xác nhận trước khi thay đổi.',
          ),
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 24),
        ...suggestions.map(
          (suggestion) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: OutlinedButton(
              onPressed: () => _send(suggestion),
              child: Text(suggestion),
            ),
          ),
        ),
      ],
    );
  }

  Widget _messageList(BuildContext context) {
    return ListView.builder(
      controller: _scroll,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      itemCount: _messages.length + (_busy ? 1 : 0),
      itemBuilder: (_, index) {
        if (index == _messages.length) {
          return const Align(
            alignment: Alignment.centerLeft,
            child: Padding(
              padding: EdgeInsets.all(12),
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          );
        }
        final message = _messages[index];
        final isUser = message.role == 'user';
        return Align(
          alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(13),
            constraints: BoxConstraints(
              maxWidth: MediaQuery.sizeOf(context).width * .84,
            ),
            decoration: BoxDecoration(
              color:
                  isUser
                      ? Theme.of(context).colorScheme.primary
                      : Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(16),
              border:
                  isUser
                      ? null
                      : Border.all(color: Theme.of(context).dividerColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  message.content,
                  style: TextStyle(
                    color:
                        isUser ? Theme.of(context).colorScheme.onPrimary : null,
                  ),
                ),
                if (message.proposal != null)
                  _proposalCard(context, message.proposal!),
                if (!isUser)
                  TextButton.icon(
                    onPressed: () => _report(message),
                    icon: const Icon(Icons.flag_outlined, size: 16),
                    label: Text(
                      tr(context, 'Report reply', 'Báo cáo câu trả lời'),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _report(AgentMessage message) async {
    final reason = await showDialog<String>(
      context: context,
      builder:
          (dialogContext) => SimpleDialog(
            title: Text(
              tr(context, 'Report AI reply', 'Báo cáo câu trả lời AI'),
            ),
            children: [
              for (final item in [
                (
                  'Harmful or inappropriate',
                  'Nội dung có hại hoặc không phù hợp',
                ),
                (
                  'Incorrect business information',
                  'Thông tin kinh doanh không đúng',
                ),
                ('Privacy concern', 'Vấn đề quyền riêng tư'),
              ])
                SimpleDialogOption(
                  onPressed: () => Navigator.pop(dialogContext, item.$1),
                  child: Text(tr(context, item.$1, item.$2)),
                ),
              SimpleDialogOption(
                onPressed: () => Navigator.pop(dialogContext),
                child: Text(tr(context, 'Cancel', 'Hủy')),
              ),
            ],
          ),
    );
    if (reason == null || !mounted) return;
    try {
      await AppScope.of(context).repository.reportAiMessage(message.id, reason);
      if (mounted) {
        showMessage(
          context,
          tr(
            context,
            'Report received. Thank you.',
            'Đã nhận báo cáo. Cảm ơn bạn.',
          ),
        );
      }
    } catch (error) {
      if (mounted) showMessage(context, readableError(error), error: true);
    }
  }

  Widget _proposalCard(BuildContext context, AgentProposal proposal) {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.secondary.withValues(alpha: .1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            proposal.summary,
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
          if (proposal.requiresConfirmation) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _confirm(proposal, false),
                    child: Text(tr(context, 'Reject', 'Từ chối')),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton(
                    onPressed: () => _confirm(proposal, true),
                    child: Text(tr(context, 'Confirm', 'Xác nhận')),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(
            children: [
              TextButton.icon(
                onPressed: _history,
                icon: const Icon(Icons.history),
                label: Text(tr(context, 'History', 'Lịch sử')),
              ),
              const Spacer(),
              TextButton.icon(
                onPressed: _newChat,
                icon: const Icon(Icons.add),
                label: Text(tr(context, 'New chat', 'Cuộc trò chuyện mới')),
              ),
            ],
          ),
        ),
        Expanded(
          child:
              _messages.isEmpty ? _emptyState(context) : _messageList(context),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: TextField(
                    controller: _input,
                    minLines: 1,
                    maxLines: 4,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _send(),
                    decoration: InputDecoration(
                      hintText: tr(context, 'Ask Tenvora…', 'Hỏi Tenvora…'),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  onPressed: _busy ? null : _send,
                  icon: const Icon(Icons.arrow_upward),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
