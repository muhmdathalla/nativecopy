/**
 * NativeCopy VS Code Extension
 * Enterprise Resilient Live Remote Cursor, Direct Directory Injection & Cloud Clipboard Sync
 * Features:
 *  - Sub-millisecond live cursor typing
 *  - Real-time Direct Workspace File Injection from Phone / Other Laptops
 *  - Reverse Selection Teleport to Mobile Screen (Cmd+Alt+T / Ctrl+Alt+T)
 *  - Active File Upload to Mobile (Cmd+Alt+U / Ctrl+Alt+U)
 *  - Dual SSE & Long-Polling Failover Transport with Replay Buffer
 */

const vscode = require('vscode');
const https = require('https');
const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');

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
  console.log('[NativeCopy] Extension activating with 2-way sync & directory injection...');

  // 1. Status Bar Indicator
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'nativecopy.connect';
  context.subscriptions.push(statusBarItem);
  updateStatusBar('disconnected', 'Disconnected');
  statusBarItem.show();

  // 2. Command: Connect Account
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

  // 3. Command: Teleport Selection to Mobile Screen (Reverse Teleport)
  const teleportSelectionCmd = vscode.commands.registerCommand('nativecopy.teleportSelection', async () => {
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
    const fileName = editor.document.fileName ? path.basename(editor.document.fileName) : 'VS Code';

    try {
      await makeApiRequest(serverUrl, '/api/teleport/selection', 'POST', token, {
        text: text,
        language: lang,
        fileName: fileName,
        sender: 'VS Code Laptop',
        saveSnippet: true
      });
      vscode.window.showInformationMessage(`⚡ Teleported ${text.length} chars from '${fileName}' directly to your Phone screen!`);
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to teleport selection: ${err.message}`);
    }
  });

  // 4. Command: Upload Active File to Mobile
  const uploadActiveFileCmd = vscode.commands.registerCommand('nativecopy.uploadActiveFile', async (uri) => {
    let targetUri = uri;
    if (!targetUri && vscode.window.activeTextEditor) {
      targetUri = vscode.window.activeTextEditor.document.uri;
    }

    if (!targetUri) {
      vscode.window.showWarningMessage('No file selected to upload.');
      return;
    }

    const config = vscode.workspace.getConfiguration('nativecopy');
    const serverUrl = (config.get('serverUrl') || 'https://nativecopy.vercel.app').replace(/\/+$/, '');
    const token = config.get('token') || '';

    if (!token) {
      vscode.window.showErrorMessage('Please connect your NativeCopy account first (Cmd+Shift+P > NativeCopy: Connect).');
      return;
    }

    try {
      const fileBytes = await vscode.workspace.fs.readFile(targetUri);
      const filename = path.basename(targetUri.fsPath);
      const base64Data = Buffer.from(fileBytes).toString('base64');
      const fileSize = fileBytes.length;

      await makeApiRequest(serverUrl, '/api/files/upload', 'POST', token, {
        filename: filename,
        fileData: base64Data,
        fileSize: fileSize,
        mimeType: 'application/octet-stream',
        target: 'general',
        sender: 'VS Code Laptop'
      });

      vscode.window.showInformationMessage(`📁 File '${filename}' (${formatBytes(fileSize)}) uploaded! Available to download on your Phone.`);
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to upload file: ${err.message}`);
    }
  });

  // 5. Command: Send Selection to Cloud Clipboard
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
      vscode.window.showErrorMessage('Please connect your NativeCopy account first.');
      return;
    }

    const lang = editor.document.languageId || 'plaintext';
    const fileName = editor.document.fileName ? path.basename(editor.document.fileName) : 'VS Code Snippet';

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

  // 6. Command: Insert Latest Snippet
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

  // 7. Command: Toggle Auto Insert
  const toggleAutoInsertCmd = vscode.commands.registerCommand('nativecopy.toggleAutoInsert', async () => {
    const config = vscode.workspace.getConfiguration('nativecopy');
    const current = config.get('autoInsert', true);
    await config.update('autoInsert', !current, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(`NativeCopy Auto-Insert is now ${!current ? 'ENABLED ⚡' : 'DISABLED ⏸️'}`);
  });

  context.subscriptions.push(
    connectCmd,
    teleportSelectionCmd,
    uploadActiveFileCmd,
    sendSelectionCmd,
    insertLatestCmd,
    toggleAutoInsertCmd
  );

  // Listen for configuration changes
  vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('nativecopy')) {
      startConnection();
    }
  });

  // Start Sync Connection
  startConnection();
}

function updateStatusBar(status, label) {
  if (!statusBarItem) return;
  if (status === 'live') {
    statusBarItem.text = `$(zap) NativeCopy: Live`;
    statusBarItem.tooltip = `⚡ NativeCopy: Zero-Latency Live Remote Typing & File Teleport Active\nClick to configure`;
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

/**
 * Direct Workspace File Injection
 * Writes incoming file directly into active editor's subfolder or active workspace directory!
 */
async function handleDirectFileInjection(payload) {
  const filename = payload.filename || 'teleport_file.bin';
  const fileDataBase64 = payload.fileData || '';
  const sender = payload.sender || 'Mobile Device';

  if (!fileDataBase64) {
    console.warn('[NativeCopy] File injection received with empty data');
    return;
  }

  const fileBytes = Buffer.from(fileDataBase64, 'base64');
  let targetFolderUri = null;

  // 1. Check active text editor folder (e.g. dev.cpp in /Trial/ -> saves directly into /Trial/)
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor && activeEditor.document && activeEditor.document.uri && activeEditor.document.uri.scheme === 'file') {
    const activeDocDir = path.dirname(activeEditor.document.uri.fsPath);
    if (fs.existsSync(activeDocDir)) {
      targetFolderUri = vscode.Uri.file(activeDocDir);
    }
  }

  // 2. Check active tab group if active editor was a custom editor / notebook (.ipynb)
  if (!targetFolderUri && vscode.window.tabGroups && vscode.window.tabGroups.activeTabGroup) {
    const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
    if (activeTab && activeTab.input && activeTab.input.uri && activeTab.input.uri.scheme === 'file') {
      const tabDir = path.dirname(activeTab.input.uri.fsPath);
      if (fs.existsSync(tabDir)) {
        targetFolderUri = vscode.Uri.file(tabDir);
      }
    }
  }

  // 3. Fallback to workspace root folder
  if (!targetFolderUri) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      targetFolderUri = workspaceFolders[0].uri;
    }
  }

  // 4. Fallback to home/temp folder
  if (!targetFolderUri) {
    const tempDir = path.join(process.env.HOME || process.env.USERPROFILE || '/tmp', 'NativeCopy_Downloads');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    targetFolderUri = vscode.Uri.file(tempDir);
  }

  const targetFileUri = vscode.Uri.joinPath(targetFolderUri, filename);
  const relativePath = vscode.workspace.asRelativePath(targetFileUri);

  try {
    await vscode.workspace.fs.writeFile(targetFileUri, fileBytes);
    console.log(`[NativeCopy] Injected file saved to: ${targetFileUri.fsPath}`);

    const config = vscode.workspace.getConfiguration('nativecopy');
    const autoOpen = config.get('autoOpenInjectedFiles', true);

    const action = await vscode.window.showInformationMessage(
      `📁 NativeCopy: Received '${filename}' (${formatBytes(fileBytes.length)}) from ${sender} -> Saved to '${relativePath}'!`,
      'Open File'
    );

    if (autoOpen || action === 'Open File') {
      try {
        const doc = await vscode.workspace.openTextDocument(targetFileUri);
        await vscode.window.showTextDocument(doc);
      } catch (e) {
        // Binary files / notebooks execute default open
        vscode.commands.executeCommand('vscode.open', targetFileUri);
      }
    }
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to save received file '${filename}': ${err.message}`);
  }
}

function resetWatchdog() {
  if (watchdogTimer) clearTimeout(watchdogTimer);
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

  // Start Real-Time SSE Stream
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

  // 1. Direct Live Remote Typing Event
  if (event.type === 'vscode_remote_insert') {
    const payload = event.payload || {};
    const content = payload.content || '';
    if (content) {
      insertTextIntoActiveEditor(content, payload.sender || 'Mobile Device');
    }
  }

  // 2. Direct Workspace File Injection Event (From Phone / Other Laptop)
  if (event.type === 'file_teleport') {
    const payload = event.payload || {};
    handleDirectFileInjection(payload);
  }

  // 3. Snippet Created Event
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
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (payload) req.write(payload);
    req.end();
  });
}

function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function deactivate() {
  stopConnection(true);
}

module.exports = {
  activate,
  deactivate
};
