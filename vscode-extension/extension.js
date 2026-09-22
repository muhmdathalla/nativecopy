/**
 * NativeCopy VS Code Extension
 * Live Real-Time Cursor Insertion & Cloud Clipboard Synchronizer
 */

const vscode = require('vscode');
const https = require('https');
const http = require('http');
const url = require('url');

let sseRequest = null;
let pollingTimer = null;
let statusBarItem = null;
let isConnected = false;

function activate(context) {
  console.log('[NativeCopy] Extension activated');

  // 1. Create Status Bar Item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'nativecopy.connect';
  context.subscriptions.push(statusBarItem);
  updateStatusBar(false, 'Disconnected');
  statusBarItem.show();

  // 2. Register Commands
  const connectCmd = vscode.commands.registerCommand('nativecopy.connect', async () => {
    const config = vscode.workspace.getConfiguration('nativecopy');
    const currentUrl = config.get('serverUrl') || 'https://nativecopy.vercel.app';
    const currentToken = config.get('token') || '';

    const serverUrl = await vscode.window.showInputBox({
      prompt: 'Enter NativeCopy Server URL:',
      value: currentUrl,
      placeHolder: 'https://nativecopy.vercel.app or http://192.168.1.10:8080'
    });
    if (serverUrl === undefined) return;

    const token = await vscode.window.showInputBox({
      prompt: 'Enter your NativeCopy Account Token (get it from web dashboard profile/login):',
      value: currentToken,
      placeHolder: 'Paste token here...',
      password: true
    });
    if (token === undefined) return;

    await config.update('serverUrl', serverUrl.trim().replace(/\/+$/, ''), vscode.ConfigurationTarget.Global);
    await config.update('token', token.trim(), vscode.ConfigurationTarget.Global);

    vscode.window.showInformationMessage('NativeCopy settings saved! Reconnecting...');
    startConnection();
  });

  const sendSelectionCmd = vscode.commands.registerCommand('nativecopy.sendSelection', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor open.');
      return;
    }

    const selection = editor.selection;
    const text = editor.document.getText(selection.isEmpty ? undefined : selection);
    if (!text || !text.trim()) {
      vscode.window.showWarningMessage('No text selected in editor.');
      return;
    }

    const config = vscode.workspace.getConfiguration('nativecopy');
    const serverUrl = config.get('serverUrl') || 'https://nativecopy.vercel.app';
    const token = config.get('token') || '';

    if (!token) {
      vscode.window.showErrorMessage('Please connect your NativeCopy account first (Ctrl+Shift+P > NativeCopy: Connect).');
      return;
    }

    const lang = editor.document.languageId || 'plaintext';
    const fileName = editor.document.fileName ? editor.document.fileName.split(/[\\/]/).pop() : 'VS Code Snippet';

    try {
      await makeApiRequest(serverUrl, '/api/snippets', 'POST', token, {
        title: `Code from ${fileName}`,
        content: text,
        language: lang,
        isPinned: false
      });
      vscode.window.showInformationMessage(`⚡ Sent ${text.length} chars to NativeCopy cloud clipboard!`);
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to send code: ${err.message}`);
    }
  });

  const insertLatestCmd = vscode.commands.registerCommand('nativecopy.insertLatest', async () => {
    const config = vscode.workspace.getConfiguration('nativecopy');
    const serverUrl = config.get('serverUrl') || 'https://nativecopy.vercel.app';
    const token = config.get('token') || '';

    if (!token) {
      vscode.window.showErrorMessage('Please connect NativeCopy account first.');
      return;
    }

    try {
      const res = await makeApiRequest(serverUrl, '/api/snippets', 'GET', token);
      if (res && res.snippets && res.snippets.length > 0) {
        const latest = res.snippets[0];
        insertTextIntoActiveEditor(latest.content, `Latest Snippet (${latest.title})`);
      } else {
        vscode.window.showInformationMessage('No snippets found in your cloud clipboard.');
      }
    } catch (err) {
      vscode.window.showErrorMessage(`Error fetching snippets: ${err.message}`);
    }
  });

  const toggleAutoInsertCmd = vscode.commands.registerCommand('nativecopy.toggleAutoInsert', async () => {
    const config = vscode.workspace.getConfiguration('nativecopy');
    const current = config.get('autoInsert', true);
    await config.update('autoInsert', !current, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(`NativeCopy Auto-Insert is now ${!current ? 'ENABLED ⚡' : 'DISABLED ⏸️'}`);
  });

  context.subscriptions.push(connectCmd, sendSelectionCmd, insertLatestCmd, toggleAutoInsertCmd);

  // 3. Listen for configuration changes
  vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('nativecopy')) {
      startConnection();
    }
  });

  // 4. Start Sync Connection
  startConnection();
}

function updateStatusBar(connected, statusText) {
  if (!statusBarItem) return;
  if (connected) {
    statusBarItem.text = `$(zap) NativeCopy: Live`;
    statusBarItem.tooltip = `NativeCopy Live Remote Typing Connected\nClick to change settings`;
    statusBarItem.backgroundColor = undefined;
  } else {
    statusBarItem.text = `$(plug) NativeCopy: ${statusText}`;
    statusBarItem.tooltip = `NativeCopy Disconnected - Click to configure account token`;
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }
}

function insertTextIntoActiveEditor(text, label = 'Mobile stream') {
  const config = vscode.workspace.getConfiguration('nativecopy');
  if (!config.get('autoInsert', true)) {
    console.log('[NativeCopy] Auto-insert disabled in settings, skipping.');
    return;
  }

  const editor = vscode.window.activeTextEditor;
  if (editor) {
    editor.edit(editBuilder => {
      if (!editor.selection.isEmpty) {
        editBuilder.replace(editor.selection, text);
      } else {
        editBuilder.insert(editor.selection.active, text);
      }
    }).then(success => {
      if (success) {
        vscode.window.setStatusBarMessage(`⚡ NativeCopy: Inserted text at active cursor (${text.length} chars)`, 4000);
      }
    });
  } else {
    // If no file open, open a new untitled document with the text
    vscode.workspace.openTextDocument({ content: text, language: 'plaintext' }).then(doc => {
      vscode.window.showTextDocument(doc);
      vscode.window.setStatusBarMessage(`⚡ NativeCopy: Opened text from ${label} in new tab`, 4000);
    });
  }
}

function startConnection() {
  stopConnection();

  const config = vscode.workspace.getConfiguration('nativecopy');
  const serverUrl = (config.get('serverUrl') || 'https://nativecopy.vercel.app').replace(/\/+$/, '');
  const token = config.get('token') || '';

  if (!token) {
    updateStatusBar(false, 'Set Token');
    return;
  }

  updateStatusBar(false, 'Connecting...');

  // Start Real-Time SSE Stream
  try {
    const parsed = url.parse(`${serverUrl}/api/events?token=${encodeURIComponent(token)}`);
    const protocol = parsed.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.path,
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Authorization': `Bearer ${token}`
      },
      timeout: 0
    };

    sseRequest = protocol.request(reqOptions, res => {
      if (res.statusCode === 200) {
        isConnected = true;
        updateStatusBar(true, 'Live');
        console.log('[NativeCopy] Connected to SSE event stream.');

        let buffer = '';
        res.on('data', chunk => {
          buffer += chunk.toString();
          const lines = buffer.split('\n\n');
          buffer = lines.pop(); // Keep partial line

          for (const block of lines) {
            for (const line of block.split('\n')) {
              if (line.startsWith('data: ')) {
                try {
                  const rawJson = line.substring(6).trim();
                  const eventData = JSON.parse(rawJson);
                  handleIncomingEvent(eventData);
                } catch (e) {}
              }
            }
          }
        });

        res.on('end', () => {
          isConnected = false;
          updateStatusBar(false, 'Reconnecting...');
          setTimeout(startConnection, 4000);
        });
      } else {
        isConnected = false;
        updateStatusBar(false, 'Auth Error');
      }
    });

    sseRequest.on('error', err => {
      console.log('[NativeCopy] SSE error:', err.message);
      isConnected = false;
      updateStatusBar(false, 'Offline');
    });

    sseRequest.end();
  } catch (err) {
    console.error('[NativeCopy] Failed to connect:', err);
    updateStatusBar(false, 'Offline');
  }

  // Backup auto-reconnect timer
  pollingTimer = setInterval(() => {
    if (!isConnected) {
      startConnection();
    }
  }, 10000);
}

function stopConnection() {
  if (sseRequest) {
    try { sseRequest.abort(); } catch (e) {}
    sseRequest = null;
  }
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  isConnected = false;
}

function handleIncomingEvent(event) {
  if (!event || !event.type) return;

  // 1. Direct Live Remote Typing Event (From Phone or Web Live Paste Button)
  if (event.type === 'vscode_remote_insert') {
    const payload = event.payload || {};
    const content = payload.content || '';
    if (content) {
      insertTextIntoActiveEditor(content, payload.sender || 'Mobile Device');
    }
  }

  // 2. Snippet Created
  if (event.type === 'snippet_created') {
    const snip = event.payload || {};
    vscode.window.setStatusBarMessage(`⚡ NativeCopy: New snippet created: "${snip.title}"`, 3000);
  }
}

function makeApiRequest(serverUrl, apiPath, method = 'GET', token = '', bodyData = null) {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(`${serverUrl}${apiPath}`);
    const protocol = parsed.protocol === 'https:' ? https : http;

    const payload = bodyData ? JSON.stringify(bodyData) : null;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    if (payload) {
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = protocol.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function deactivate() {
  stopConnection();
}

module.exports = {
  activate,
  deactivate
};
