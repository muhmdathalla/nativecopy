/**
 * NativeCopy VS Code Extension
 * Enterprise Resilient Live Remote Cursor & Cloud Clipboard Sync
 * Features: Sub-millisecond insertion, Dual SSE/Long-Poll Transport, Watchdog Keep-Alive, Event Replay Buffer
 */

const vscode = require('vscode');
const https = require('https');
const http = require('http');
const url = require('url');

// Persistent HTTP/HTTPS Agents with socket keep-alive
const httpAgent = new http.Agent({ keepAlive: true, keepAliveMsecs: 3000, maxSockets: 5 });
const httpsAgent = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000, maxSockets: 5 });

let sseRequest = null;
let watchdogTimer = null;
let reconnectTimer = null;
let backupPollTimer = null;
let statusBarItem = null;
let isConnected = false;
let lastEventId = 0;
let processedEventIds = new Set();
let consecutiveErrors = 0;

function activate(context) {
  console.log('[NativeCopy] Extension activating with resilient sync engine...');

  // 1. Status Bar Indicator
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'nativecopy.connect';
  context.subscriptions.push(statusBarItem);
  updateStatusBar('disconnected', 'Disconnected');
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
      prompt: 'Enter your NativeCopy Account Token (get it from web dashboard):',
      value: currentToken,
      placeHolder: 'Paste token here...',
      password: true
    });
    if (token === undefined) return;

    await config.update('serverUrl', serverUrl.trim().replace(/\/+$/, ''), vscode.ConfigurationTarget.Global);
    await config.update('token', token.trim(), vscode.ConfigurationTarget.Global);

    vscode.window.showInformationMessage('⚡ NativeCopy settings updated! Connecting...');
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
    const serverUrl = (config.get('serverUrl') || 'https://nativecopy.vercel.app').replace(/\/+$/, '');
    const token = config.get('token') || '';

    if (!token) {
      vscode.window.showErrorMessage('Please connect your NativeCopy account first (Cmd+Shift+P > NativeCopy: Connect).');
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
    const serverUrl = (config.get('serverUrl') || 'https://nativecopy.vercel.app').replace(/\/+$/, '');
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

function updateStatusBar(status, label) {
  if (!statusBarItem) return;
  if (status === 'live') {
    statusBarItem.text = `$(zap) NativeCopy: Live`;
    statusBarItem.tooltip = `⚡ NativeCopy: Zero-Latency Live Remote Typing Active\nClick to configure`;
    statusBarItem.backgroundColor = undefined;
  } else if (status === 'connecting') {
    statusBarItem.text = `$(sync~spin) NativeCopy: Syncing...`;
    statusBarItem.tooltip = `Connecting to NativeCopy event stream...`;
    statusBarItem.backgroundColor = undefined;
  } else {
    statusBarItem.text = `$(plug) NativeCopy: ${label || 'Disconnected'}`;
    statusBarItem.tooltip = `Click to connect NativeCopy account`;
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }
}

function insertTextIntoActiveEditor(text, label = 'Mobile stream') {
  const config = vscode.workspace.getConfiguration('nativecopy');
  if (!config.get('autoInsert', true)) {
    console.log('[NativeCopy] Auto-insert disabled in settings.');
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
        vscode.window.setStatusBarMessage(`⚡ NativeCopy: Inserted text (${text.length} chars from ${label})`, 4000);
      }
    });
  } else {
    vscode.workspace.openTextDocument({ content: text, language: 'plaintext' }).then(doc => {
      vscode.window.showTextDocument(doc);
      vscode.window.setStatusBarMessage(`⚡ NativeCopy: Opened text from ${label} in new tab`, 4000);
    });
  }
}

function resetWatchdog() {
  if (watchdogTimer) clearTimeout(watchdogTimer);
  // If no ping/data received within 12 seconds, proactively reset and reconnect
  watchdogTimer = setTimeout(() => {
    console.log('[NativeCopy] Watchdog heartbeat timeout. Reconnecting stream...');
    if (sseRequest) {
      try { sseRequest.destroy(); } catch (e) {}
      sseRequest = null;
    }
    triggerReconnect(0);
  }, 12000);
}

function triggerReconnect(delayMs = 0) {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    startConnection();
  }, delayMs);
}

function startConnection() {
  stopConnection(false);

  const config = vscode.workspace.getConfiguration('nativecopy');
  const serverUrl = (config.get('serverUrl') || 'https://nativecopy.vercel.app').replace(/\/+$/, '');
  const token = config.get('token') || '';

  if (!token) {
    updateStatusBar('disconnected', 'Set Token');
    return;
  }

  updateStatusBar('connecting', 'Connecting...');

  // Start Real-Time SSE Stream with Socket Keep-Alive & Replay Buffer
  try {
    const streamUrl = `${serverUrl}/api/events?token=${encodeURIComponent(token)}&since_id=${lastEventId}`;
    const parsed = url.parse(streamUrl);
    const isHttps = parsed.protocol === 'https:';
    const protocol = isHttps ? https : http;
    const agent = isHttps ? httpsAgent : httpAgent;

    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.path,
      method: 'GET',
      agent: agent,
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'NativeCopy-VSCode/1.0.0'
      },
      timeout: 0
    };

    sseRequest = protocol.request(reqOptions, res => {
      if (res.statusCode === 200) {
        isConnected = true;
        consecutiveErrors = 0;
        updateStatusBar('live', 'Live');
        resetWatchdog();
        stopBackupPoll();

        let buffer = '';
        res.on('data', chunk => {
          resetWatchdog();
          buffer += chunk.toString();
          const lines = buffer.split('\n\n');
          buffer = lines.pop();

          for (const block of lines) {
            for (const line of block.split('\n')) {
              if (line.startsWith('data: ')) {
                try {
                  const rawJson = line.substring(6).trim();
                  if (rawJson && rawJson !== '{}') {
                    const eventData = JSON.parse(rawJson);
                    handleIncomingEvent(eventData);
                  }
                } catch (e) {}
              }
            }
          }
        });

        res.on('end', () => {
          isConnected = false;
          // Normal proxy stream rotation (e.g. Vercel 15s limit) -> reconnect instantly with 50ms delay
          triggerReconnect(50);
        });

        res.on('close', () => {
          if (isConnected) {
            isConnected = false;
            triggerReconnect(100);
          }
        });
      } else if (res.statusCode === 401 || res.statusCode === 403) {
        isConnected = false;
        updateStatusBar('disconnected', 'Invalid Token');
      } else {
        isConnected = false;
        consecutiveErrors++;
        const backoff = Math.min(1000 * Math.pow(1.5, consecutiveErrors), 8000);
        updateStatusBar('disconnected', 'Reconnecting...');
        triggerReconnect(backoff);
        startBackupPoll(serverUrl, token);
      }
    });

    sseRequest.on('socket', socket => {
      socket.setKeepAlive(true, 3000);
      socket.setNoDelay(true);
    });

    sseRequest.on('error', err => {
      console.log('[NativeCopy] Stream error:', err.message);
      isConnected = false;
      consecutiveErrors++;
      const backoff = Math.min(1000 * Math.pow(1.5, consecutiveErrors), 8000);
      updateStatusBar('disconnected', 'Offline');
      triggerReconnect(backoff);
      startBackupPoll(serverUrl, token);
    });

    sseRequest.end();
  } catch (err) {
    console.error('[NativeCopy] Connect failure:', err);
    updateStatusBar('disconnected', 'Error');
    startBackupPoll(serverUrl, token);
  }
}

function startBackupPoll(serverUrl, token) {
  if (backupPollTimer) return;
  backupPollTimer = setInterval(async () => {
    if (isConnected) return;
    try {
      const res = await makeApiRequest(serverUrl, `/api/events/recent?since_id=${lastEventId}`, 'GET', token);
      if (res && res.events && Array.isArray(res.events)) {
        for (const ev of res.events) {
          handleIncomingEvent(ev);
        }
      }
    } catch (e) {}
  }, 1500);
}

function stopBackupPoll() {
  if (backupPollTimer) {
    clearInterval(backupPollTimer);
    backupPollTimer = null;
  }
}

function stopConnection(fullStop = true) {
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (sseRequest) {
    try { sseRequest.destroy(); } catch (e) {}
    sseRequest = null;
  }
  if (fullStop) {
    stopBackupPoll();
  }
  isConnected = false;
}

function handleIncomingEvent(event) {
  if (!event || !event.type) return;

  // Track event ID & deduplicate
  if (event.id) {
    if (event.id <= lastEventId || processedEventIds.has(event.id)) {
      return; // Already processed
    }
    lastEventId = Math.max(lastEventId, event.id);
    processedEventIds.add(event.id);
    if (processedEventIds.size > 200) {
      processedEventIds.clear();
      processedEventIds.add(event.id);
    }
  }

  // 1. Direct Live Remote Typing Event (From Mobile or Web)
  if (event.type === 'vscode_remote_insert') {
    const payload = event.payload || {};
    const content = payload.content || '';
    if (content) {
      insertTextIntoActiveEditor(content, payload.sender || 'Mobile Device');
    }
  }

  // 2. Snippet Created Event
  if (event.type === 'snippet_created') {
    const snip = event.payload || {};
    vscode.window.setStatusBarMessage(`⚡ NativeCopy: New snippet created: "${snip.title}"`, 3000);
  }
}

function makeApiRequest(serverUrl, apiPath, method = 'GET', token = '', bodyData = null) {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(`${serverUrl}${apiPath}`);
    const isHttps = parsed.protocol === 'https:';
    const protocol = isHttps ? https : http;
    const agent = isHttps ? httpsAgent : httpAgent;

    const payload = bodyData ? JSON.stringify(bodyData) : null;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.path,
      method: method,
      agent: agent,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'NativeCopy-VSCode/1.0.0'
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
    req.setTimeout(6000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (payload) req.write(payload);
    req.end();
  });
}

function deactivate() {
  stopConnection(true);
}

module.exports = {
  activate,
  deactivate
};
