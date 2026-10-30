const fs = require('fs');
const file = 'server/Localization/AppLocalizer.cs';
let content = fs.readFileSync(file, 'utf8');

const mapping = [
  {
    target: '["agent.action_cancelled"] = "Action cancelled.",',
    replace: '["agent.action_cancelled"] = "Action cancelled.",\r\n            ["agent.action_undone"] = "Action has been undone and changes reverted.",\r\n            ["error.action_already_undone"] = "This action has already been undone.",\r\n            ["error.undo_window_expired"] = "The 15-minute undo window has expired for this action.",'
  },
  {
    target: '["agent.action_cancelled"] = "Đã hủy thao tác.",',
    replace: '["agent.action_cancelled"] = "Đã hủy thao tác.",\r\n            ["agent.action_undone"] = "Thao tác đã được hoàn tác và dữ liệu đã được phục hồi.",\r\n            ["error.action_already_undone"] = "Thao tác này đã được hoàn tác trước đó.",\r\n            ["error.undo_window_expired"] = "Đã hết thời hạn hoàn tác 15 phút cho thao tác này.",'
  },
  {
    target: '["agent.action_cancelled"] = "Operación cancelada.",',
    replace: '["agent.action_cancelled"] = "Operación cancelada.",\r\n            ["agent.action_undone"] = "La acción se ha deshecho y los cambios se han revertido.",\r\n            ["error.action_already_undone"] = "Esta acción ya ha sido deshecha.",\r\n            ["error.undo_window_expired"] = "El plazo de 15 minutos para deshacer ha expirado.",'
  },
  {
    target: '["agent.action_cancelled"] = "Action annulée.",',
    replace: '["agent.action_cancelled"] = "Action annulée.",\r\n            ["agent.action_undone"] = "L\'action a été annulée et les modifications rétablies.",\r\n            ["error.action_already_undone"] = "Cette action a déjà été annulée.",\r\n            ["error.undo_window_expired"] = "Le délai d\'annulation de 15 minutes a expiré pour cette action.",'
  },
  {
    target: '["agent.action_cancelled"] = "Vorgang abgebrochen.",',
    replace: '["agent.action_cancelled"] = "Vorgang abgebrochen.",\r\n            ["agent.action_undone"] = "Die Aktion wurde rückgängig gemacht und die Änderungen zurückgesetzt.",\r\n            ["error.action_already_undone"] = "Diese Aktion wurde bereits rückgängig gemacht.",\r\n            ["error.undo_window_expired"] = "Das 15-Minuten-Zeitfenster zum Rückgängigmachen ist abgelaufen.",'
  },
  {
    target: '["agent.action_cancelled"] = "Ação cancelada.",',
    replace: '["agent.action_cancelled"] = "Ação cancelada.",\r\n            ["agent.action_undone"] = "A ação foi desfeita e as alterações foram revertidas.",\r\n            ["error.action_already_undone"] = "Esta ação já foi desfeita.",\r\n            ["error.undo_window_expired"] = "A janela de cancelamento de 15 minutos expirou.",'
  },
  {
    target: '["agent.action_cancelled"] = "Tindakan dibatalkan.",',
    replace: '["agent.action_cancelled"] = "Tindakan dibatalkan.",\r\n            ["agent.action_undone"] = "Tindakan telah dibatalkan dan perubahan telah dipulihkan.",\r\n            ["error.action_already_undone"] = "Tindakan ini sudah dibatalkan sebelumnya.",\r\n            ["error.undo_window_expired"] = "Batas waktu 15 menit untuk membatalkan tindakan telah berakhir.",'
  }
];

let replaced = 0;
for (const item of mapping) {
  if (content.includes(item.target)) {
    content = content.replace(item.target, item.replace);
    replaced++;
  } else {
    console.warn('Target not found:', item.target);
  }
}

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated AppLocalizer with', replaced, 'cultures');
