const fs = require('fs');
const file = 'server/Controllers/AiAssistantController.cs';
let content = fs.readFileSync(file, 'utf8');

const isCrlf = content.includes('\r\n');
const eol = isCrlf ? '\r\n' : '\n';

const snippet = `    [HttpPost("actions/{actionId:guid}/undo")]${eol}    [Authorize(Roles = "TenantAdmin,OperationsManager")]${eol}    public async Task<IActionResult> UndoAction(Guid actionId, CancellationToken ct)${eol}    {${eol}        var result = await _actionService.UndoAsync(${eol}            User.GetTenantId(), User.GetUserId(), actionId, User.GetUserRole(), ct);${eol}        return result.ToActionResult();${eol}    }${eol}${eol}`;

const pivot = 'public async Task<IActionResult> ConfirmAction(';
const endPivot = 'return result.ToActionResult();' + eol + '    }';

const idx = content.indexOf(endPivot, content.indexOf(pivot));
if (idx === -1) {
  console.error('Pivot not found');
  process.exit(1);
}

const insertionPoint = idx + endPivot.length;
content = content.slice(0, insertionPoint) + eol + eol + snippet + content.slice(insertionPoint + eol.length);
fs.writeFileSync(file, content, 'utf8');
console.log('Successfully inserted UndoAction');
