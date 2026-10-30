const fs = require('fs');
const file = 'server/Services/AiActionService.cs';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'using var write = actionWriteLock != null ? await actionWriteLock.WaitAsync(tenantId, ct) : null;',
  'await using var write = await FinancialWriteScope.BeginAsync(db, tenantId);'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed write scope in AiActionService.cs');
