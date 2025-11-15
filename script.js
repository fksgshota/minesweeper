'use strict';

// DOM要素の取得
const elements = {
  pauseButton: document.getElementById('pauseButton'),
  levelButton: document.getElementById('levelButton'),
  timeCounter: document.getElementById('timeCounter'),
  minefield: document.getElementById('minefield'),
  resetButton: document.getElementById('resetButton'),
  flagModeButton: document.getElementById('flagModeButton'),
  mineCounter: document.getElementById('mineCounter'),
  flagCounter: document.getElementById('flagCounter')
};

// 定数定義
const CELL_STATUS = {
  DEFAULT: '0',
  OPENED: '1',
  FLAG_ON: '2'
};

const MINE_STATUS = {
  OFF: '0',
  ON: '1'
};

const INITIAL_TIME_DISPLAY = '00:00:00';
const RENDER_DELAY = 1000;
const STORAGE_KEY = 'minesweeper_best_times';
const SOUND_ENABLED_KEY = 'minesweeper_sound_enabled';

// 音声管理システム
const soundManager = {
  audioContext: null,
  enabled: true,
  bgmOscillators: [],
  bgmGainNode: null,
  isBgmPlaying: false,

  init() {
    // AudioContextの初期化（ユーザーインタラクション後）
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // 保存された設定を読み込み
    const saved = localStorage.getItem(SOUND_ENABLED_KEY);
    this.enabled = saved === null ? true : saved === 'true';
    this.updateButtonState();
  },

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem(SOUND_ENABLED_KEY, this.enabled.toString());
    this.updateButtonState();

    if (this.enabled) {
      this.playClick();
      this.startBGM();
    } else {
      this.stopBGM();
    }
  },

  updateButtonState() {
    const btn = document.getElementById('soundToggle');
    if (btn) {
      btn.textContent = this.enabled ? '🔊' : '🔇';
      btn.classList.toggle('sound-on', this.enabled);
    }
  },

  // 基本音生成
  playTone(frequency, duration, type = 'sine', volume = 0.3) {
    if (!this.enabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.value = volume;

    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);
  },

  // クリック音
  playClick() {
    this.playTone(800, 0.05, 'square', 0.1);
  },

  // セルを開く音
  playReveal() {
    this.playTone(600, 0.1, 'sine', 0.15);
  },

  // 旗を立てる音
  playFlag() {
    this.playTone(1000, 0.1, 'triangle', 0.2);
  },

  // 爆発音
  playExplosion() {
    if (!this.enabled || !this.audioContext) return;

    const now = this.audioContext.currentTime;

    // ノイズで爆発音を再現
    const bufferSize = this.audioContext.sampleRate * 0.5;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    noise.connect(noiseGain);
    noiseGain.connect(this.audioContext.destination);
    noise.start(now);

    // 低音を追加
    this.playTone(100, 0.3, 'sawtooth', 0.3);
  },

  // クリア音
  playClear() {
    if (!this.enabled || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C-E-G-C

    notes.forEach((freq, i) => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      const startTime = now + i * 0.15;
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.3);
    });
  },

  // BGM開始
  startBGM() {
    if (!this.enabled || !this.audioContext || this.isBgmPlaying) return;

    this.isBgmPlaying = true;
    const now = this.audioContext.currentTime;

    // BGM用のゲインノード
    this.bgmGainNode = this.audioContext.createGain();
    this.bgmGainNode.gain.setValueAtTime(0, now);
    this.bgmGainNode.gain.linearRampToValueAtTime(0.08, now + 1); // フェードイン
    this.bgmGainNode.connect(this.audioContext.destination);

    // シンプルな和音進行のBGM (Am - F - C - G)
    const chords = [
      [220.00, 261.63, 329.63], // Am (A-C-E)
      [174.61, 220.00, 261.63], // F (F-A-C)
      [130.81, 164.81, 196.00], // C (C-E-G)
      [196.00, 246.94, 293.66]  // G (G-B-D)
    ];

    const playChordLoop = (startTime) => {
      const chordDuration = 2; // 各コードを2秒

      chords.forEach((chord, chordIndex) => {
        const chordStartTime = startTime + chordIndex * chordDuration;

        chord.forEach(freq => {
          const osc = this.audioContext.createOscillator();
          const oscGain = this.audioContext.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, chordStartTime);

          oscGain.gain.setValueAtTime(0, chordStartTime);
          oscGain.gain.linearRampToValueAtTime(0.15, chordStartTime + 0.1);
          oscGain.gain.setValueAtTime(0.15, chordStartTime + chordDuration - 0.5);
          oscGain.gain.linearRampToValueAtTime(0, chordStartTime + chordDuration);

          osc.connect(oscGain);
          oscGain.connect(this.bgmGainNode);

          osc.start(chordStartTime);
          osc.stop(chordStartTime + chordDuration);

          this.bgmOscillators.push(osc);
        });
      });

      // ループ
      const loopDuration = chords.length * chordDuration;
      if (this.isBgmPlaying) {
        setTimeout(() => {
          if (this.isBgmPlaying) {
            this.bgmOscillators = this.bgmOscillators.filter(osc => osc.context.state === 'running');
            playChordLoop(this.audioContext.currentTime);
          }
        }, loopDuration * 1000 - 100);
      }
    };

    playChordLoop(now + 1);
  },

  // BGM停止
  stopBGM() {
    if (!this.isBgmPlaying) return;

    this.isBgmPlaying = false;

    const now = this.audioContext ? this.audioContext.currentTime : 0;

    if (this.bgmGainNode && this.audioContext) {
      // フェードアウト
      this.bgmGainNode.gain.linearRampToValueAtTime(0, now + 0.5);
    }

    // オシレーターを停止
    setTimeout(() => {
      this.bgmOscillators.forEach(osc => {
        try {
          osc.stop();
        } catch (e) {
          // 既に停止している場合は無視
        }
      });
      this.bgmOscillators = [];
    }, 600);
  }
};

// ベストタイム管理
const bestTimeManager = {
  loadBestTimes() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored times:', e);
      }
    }
    return {};
  },

  saveBestTime(levelName, time, timeString) {
    const bestTimes = this.loadBestTimes();

    if (!bestTimes[levelName] || bestTimes[levelName].milliseconds > time) {
      bestTimes[levelName] = {
        milliseconds: time,
        timeString: timeString,
        date: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bestTimes));
      return true; // 新記録
    }
    return false;
  },

  getBestTime(levelName) {
    const bestTimes = this.loadBestTimes();
    return bestTimes[levelName] || null;
  },

  getAllBestTimes() {
    return this.loadBestTimes();
  },

  clearBestTimes() {
    localStorage.removeItem(STORAGE_KEY);
  }
};

// カスタム確認ダイアログ
function showConfirmDialog(title, message, details = '') {
  return new Promise((resolve) => {
    const modal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalDetails = document.getElementById('modalDetails');
    const confirmBtn = document.getElementById('modalConfirm');
    const cancelBtn = document.getElementById('modalCancel');

    modalTitle.innerHTML = title;
    modalMessage.innerHTML = message;

    if (details) {
      modalDetails.innerHTML = details;
      modalDetails.style.display = 'block';
    } else {
      modalDetails.innerHTML = '';
      modalDetails.style.display = 'none';
    }

    modal.classList.add('show');

    const handleConfirm = () => {
      modal.classList.remove('show');
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      modal.classList.remove('show');
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
  });
}

// タイマー管理オブジェクト
const countUpTimer = {
  startTime: 0,
  playTime: 0,
  elapsedTime: 0,
  gameClearTime: 0,
  gameClearTimeToString: '',
  timerID: null,

  start() {
    this.startTime = Date.now() - this.elapsedTime;
    elements.pauseButton.value = 'pause';
    elements.pauseButton.textContent = '一時停止';
    this.timerID = setInterval(() => this.updateDisplay(), 1000);
  },

  updateDisplay() {
    this.playTime = Date.now();
    elements.timeCounter.textContent = this.formatTime(this.playTime - this.startTime);
  },

  pause() {
    if (this.timerID) {
      clearInterval(this.timerID);
      this.timerID = null;
    }
    this.elapsedTime = this.playTime - this.startTime;
    elements.pauseButton.value = 'start';
    elements.pauseButton.textContent = '再開';
  },

  reset() {
    if (this.timerID) {
      clearInterval(this.timerID);
      this.timerID = null;
    }
    this.startTime = 0;
    this.playTime = 0;
    this.elapsedTime = 0;
    this.gameClearTime = 0;
    this.gameClearTimeToString = '';
    elements.pauseButton.value = 'start';
    elements.pauseButton.textContent = '再開';
    elements.timeCounter.textContent = INITIAL_TIME_DISPLAY;
  },

  formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
  },

  saveGameClearTime() {
    this.pause();
    this.gameClearTime = this.elapsedTime;
    this.gameClearTimeToString = this.formatTime(this.elapsedTime);
  }
}

// ゲーム設定
const LEVEL_CONFIG = [
  {
    name: '初級',
    gridSize: 9,
    mineCount: 10,
    rankThresholds: {
      Gold: { time: '00:00:10', milliseconds: 10000 },
      Silver: { time: '00:00:30', milliseconds: 30000 },
      Bronze: { time: '00:00:50', milliseconds: 50000 }
    }
  },
  {
    name: '中級',
    gridSize: 16,
    mineCount: 40,
    rankThresholds: {
      Gold: { time: '00:00:20', milliseconds: 20000 },
      Silver: { time: '00:01:00', milliseconds: 60000 },
      Bronze: { time: '00:01:40', milliseconds: 100000 }
    }
  },
  {
    name: '上級',
    gridSize: 30,
    mineCount: 120,
    rankThresholds: {
      Gold: { time: '00:01:00', milliseconds: 60000 },
      Silver: { time: '00:02:00', milliseconds: 120000 },
      Bronze: { time: '00:03:00', milliseconds: 180000 }
    }
  },
  {
    name: 'マニア',
    gridSize: 68,
    mineCount: 777,
    rankThresholds: {
      Gold: { time: '01:00:00', milliseconds: 3600000 },
      Silver: { time: '02:00:00', milliseconds: 7200000 },
      Bronze: { time: '03:00:00', milliseconds: 10800000 }
    }
  }
];

// メインゲームオブジェクト
const mineSweeper = {
  currentLevel: 0,
  isInitialized: true,
  flagMode: false,
  flagCount: 0,

  toggleFlagMode() {
    this.flagMode = !this.flagMode;
    elements.flagModeButton.classList.toggle('activate', this.flagMode);
  },

  toggleFlag(cell) {
    if (cell.dataset.state === CELL_STATUS.DEFAULT) {
      cell.classList.add('flag');
      cell.textContent = '▲';
      cell.dataset.state = CELL_STATUS.FLAG_ON;
      this.flagCount++;
      soundManager.playFlag();
    } else if (cell.dataset.state === CELL_STATUS.FLAG_ON) {
      cell.classList.remove('flag');
      cell.textContent = '';
      cell.dataset.state = CELL_STATUS.DEFAULT;
      this.flagCount--;
      soundManager.playFlag();
    }
    elements.flagCounter.textContent = this.flagCount;
  },

  cycleLevel() {
    this.currentLevel = (this.currentLevel + 1) % LEVEL_CONFIG.length;
    elements.levelButton.textContent = LEVEL_CONFIG[this.currentLevel].name;
    this.initialize();
  },

  placeMines() {
    const cells = Array.from(document.querySelectorAll('#mineSwTable td'));

    // Fisher-Yatesアルゴリズムでシャッフル
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    // 地雷を配置
    const config = LEVEL_CONFIG[this.currentLevel];
    let minesPlaced = 0;

    for (const cell of cells) {
      if (minesPlaced >= config.mineCount) break;
      if (cell.dataset.state !== CELL_STATUS.OPENED) {
        cell.dataset.mine = MINE_STATUS.ON;
        minesPlaced++;
      }
    }
  },

  calculateAdjacentMines() {
    const cells = Array.from(document.querySelectorAll('#mineSwTable td'));

    cells.forEach(cell => {
      if (cell.dataset.mine === MINE_STATUS.ON) return;

      const [, row, col] = cell.id.split('-').map(Number);
      let mineCount = 0;

      for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {
          if (r === row && c === col) continue;

          const adjacentCell = document.getElementById(`cell-${r}-${c}`);
          if (adjacentCell?.dataset.mine === MINE_STATUS.ON) {
            mineCount++;
          }
        }
      }

      cell.dataset.value = mineCount.toString();
    });
  },

  createGrid() {
    const config = LEVEL_CONFIG[this.currentLevel];
    const table = document.createElement('table');
    table.id = 'mineSwTable';

    for (let row = 0; row < config.gridSize; row++) {
      const tr = document.createElement('tr');
      tr.id = `tr-${row}`;

      for (let col = 0; col < config.gridSize; col++) {
        const td = document.createElement('td');
        td.id = `cell-${row}-${col}`;
        td.dataset.state = CELL_STATUS.DEFAULT;
        td.dataset.mine = MINE_STATUS.OFF;
        td.dataset.value = '';
        tr.appendChild(td);
      }

      table.appendChild(tr);
    }

    elements.minefield.appendChild(table);
  },

  clearGrid() {
    elements.minefield.innerHTML = '';
  },

  openCell(cell, isMine = false) {
    cell.dataset.state = CELL_STATUS.OPENED;

    if (isMine) {
      cell.classList.add('mine');
      cell.textContent = '●';
    } else {
      cell.classList.add('empty');
      cell.textContent = cell.dataset.value || '';
      soundManager.playReveal();
    }
  },

  revealAllCells() {
    const cells = Array.from(document.querySelectorAll('#mineSwTable td'));

    cells.forEach(cell => {
      if (cell.dataset.state === CELL_STATUS.OPENED) return;

      const isMine = cell.dataset.mine === MINE_STATUS.ON;
      this.openCell(cell, isMine);
    });
  },

  updateBestTime() {
    const config = LEVEL_CONFIG[this.currentLevel];
    const clearTime = countUpTimer.gameClearTime;
    const clearTimeString = countUpTimer.gameClearTimeToString;

    // LocalStorageに保存
    const isNewRecord = bestTimeManager.saveBestTime(
      config.name,
      clearTime,
      clearTimeString
    );

    return isNewRecord;
  },

  getBestTimeDisplay(levelName) {
    const bestTime = bestTimeManager.getBestTime(levelName);
    if (bestTime) {
      const date = new Date(bestTime.date);
      const dateStr = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
      return `${bestTime.timeString} (${dateStr})`;
    }
    return '---';
  },

  checkGameCleared() {
    const cells = Array.from(document.querySelectorAll('#mineSwTable td'));

    return cells.every(cell => {
      const isClosed = cell.dataset.state === CELL_STATUS.DEFAULT ||
                       cell.dataset.state === CELL_STATUS.FLAG_ON;
      const hasMine = cell.dataset.mine === MINE_STATUS.ON;
      return !isClosed || hasMine;
    });
  },

  handleGameOver() {
    countUpTimer.pause();
    this.revealAllCells();
    soundManager.stopBGM();

    setTimeout(async () => {
      const retry = await showConfirmDialog(
        'ゲームオーバー 💣',
        'リトライしますか？'
      );

      if (retry) {
        this.initialize();
      } else {
        elements.pauseButton.disabled = true;
        elements.flagModeButton.disabled = true;
      }
    }, RENDER_DELAY);
  },

  startGame() {
    countUpTimer.start();
    this.placeMines();
    this.calculateAdjacentMines();
    this.isInitialized = false;

    soundManager.startBGM();

    elements.resetButton.disabled = false;
    elements.pauseButton.disabled = false;
    elements.flagModeButton.disabled = false;
    elements.levelButton.disabled = true;
  },

  hasAdjacentMine(cellIds) {
    return cellIds.some(id => {
      const cell = document.getElementById(id);
      return cell?.dataset.mine === MINE_STATUS.ON;
    });
  },

  handleGameClear() {
    countUpTimer.saveGameClearTime();
    this.revealAllCells();
    const isNewRecord = this.updateBestTime();
    soundManager.stopBGM();
    soundManager.playClear();

    const config = LEVEL_CONFIG[this.currentLevel];
    const clearTime = countUpTimer.gameClearTime;

    // ランクの判定
    let rankEmoji = '';
    let rankText = '';
    if (clearTime <= config.rankThresholds.Gold.milliseconds) {
      rankEmoji = '🥇';
      rankText = 'Gold';
    } else if (clearTime <= config.rankThresholds.Silver.milliseconds) {
      rankEmoji = '🥈';
      rankText = 'Silver';
    } else if (clearTime <= config.rankThresholds.Bronze.milliseconds) {
      rankEmoji = '🥉';
      rankText = 'Bronze';
    }

    // メインメッセージ
    const mainMessage = `
      <div class="result-time">⏱️ ${countUpTimer.gameClearTimeToString}</div>
      ${isNewRecord ? '<div class="new-record">🎊 新記録達成！</div>' : ''}
      ${rankText ? `<div class="rank-badge ${rankText.toLowerCase()}">${rankEmoji} ${rankText} ランク</div>` : ''}
    `;

    // 詳細情報
    const detailsHTML = `
      <div class="info-section">
        <div class="info-header">🎯 難易度: ${config.name}</div>
      </div>

      <div class="info-section">
        <div class="info-header">🏆 ランキング基準</div>
        <div class="rank-list">
          <div class="rank-item gold">🥇 Gold: ${config.rankThresholds.Gold.time}</div>
          <div class="rank-item silver">🥈 Silver: ${config.rankThresholds.Silver.time}</div>
          <div class="rank-item bronze">🥉 Bronze: ${config.rankThresholds.Bronze.time}</div>
        </div>
      </div>

      <div class="info-section">
        <div class="info-header">📊 あなたのベストタイム</div>
        <div class="best-time">${this.getBestTimeDisplay(config.name)}</div>
      </div>

      <div class="question">リトライしますか？</div>
    `;

    setTimeout(async () => {
      const retry = await showConfirmDialog('🎉 クリア！', mainMessage, detailsHTML);

      if (retry) {
        this.initialize();
      } else {
        elements.pauseButton.disabled = true;
        elements.flagModeButton.disabled = true;
      }
    }, RENDER_DELAY);
  },

  openAdjacentCells(cell) {
    const [, row, col] = cell.id.split('-').map(Number);
    const adjacentIds = [];

    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (r === row && c === col) continue;

        const id = `cell-${r}-${c}`;
        const adjacentCell = document.getElementById(id);

        if (adjacentCell && adjacentCell.dataset.state !== CELL_STATUS.OPENED) {
          adjacentIds.push(id);
        }
      }
    }

    if (adjacentIds.length === 0 || this.hasAdjacentMine(adjacentIds)) {
      return;
    }

    adjacentIds.forEach(id => {
      const adjacentCell = document.getElementById(id);
      if (adjacentCell) {
        this.openCell(adjacentCell);
        this.openAdjacentCells(adjacentCell);
      }
    });
  },

  handleCellClick(cell) {
    if (this.isInitialized) {
      cell.dataset.state = CELL_STATUS.OPENED;
      cell.classList.add('empty');
      this.startGame();
      this.openAdjacentCells(cell);
      cell.textContent = cell.dataset.value || '';
      return;
    }

    const state = cell.dataset.state;

    if (state === CELL_STATUS.DEFAULT) {
      if (this.flagMode) {
        this.toggleFlag(cell);
        return;
      }

      if (cell.dataset.mine === MINE_STATUS.ON) {
        soundManager.playExplosion();
        this.openCell(cell, true);
        this.handleGameOver();
        return;
      }

      this.openCell(cell);
      this.openAdjacentCells(cell);
    } else if (state === CELL_STATUS.FLAG_ON && this.flagMode) {
      this.toggleFlag(cell);
    }

    if (this.checkGameCleared()) {
      this.handleGameClear();
    }
  },

  initialize() {
    this.isInitialized = true;
    this.flagMode = false;
    this.flagCount = 0;

    elements.resetButton.disabled = true;
    elements.pauseButton.disabled = true;
    elements.flagModeButton.disabled = true;
    elements.levelButton.disabled = false;
    elements.flagModeButton.classList.remove('activate');

    const config = LEVEL_CONFIG[this.currentLevel];
    elements.flagCounter.textContent = this.flagCount;
    elements.mineCounter.textContent = config.mineCount;

    countUpTimer.reset();
    this.clearGrid();
    this.createGrid();
    this.attachCellListeners();
  },

  attachCellListeners() {
    const cells = Array.from(document.querySelectorAll('#mineSwTable td'));
    cells.forEach(cell => {
      // 左クリック
      cell.addEventListener('click', () => this.handleCellClick(cell));

      // 右クリック（コンテキストメニュー防止 + 旗の切り替え）
      cell.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.handleRightClick(cell);
      });
    });
  },

  handleRightClick(cell) {
    // ゲーム開始前または開いたセルには旗を立てられない
    if (this.isInitialized || cell.dataset.state === CELL_STATUS.OPENED) {
      return;
    }

    this.toggleFlag(cell);
  }
}

// イベントリスナーの初期化
function initializeEventListeners() {
  elements.levelButton.addEventListener('click', () => {
    soundManager.playClick();
    mineSweeper.cycleLevel();
  });

  elements.pauseButton.addEventListener('click', () => {
    soundManager.playClick();
    if (elements.pauseButton.value === 'start') {
      countUpTimer.start();
    } else {
      countUpTimer.pause();
      elements.flagModeButton.disabled = true;
    }
    elements.resetButton.disabled = false;
  });

  elements.flagModeButton.addEventListener('click', () => {
    soundManager.playClick();
    mineSweeper.toggleFlagMode();
  });

  elements.resetButton.addEventListener('click', () => {
    soundManager.playClick();
    mineSweeper.initialize();
  });

  // 音声トグルボタン
  const soundToggle = document.getElementById('soundToggle');
  if (soundToggle) {
    soundToggle.addEventListener('click', () => {
      soundManager.toggle();
    });
  }
}

// アプリケーション起動
document.addEventListener('DOMContentLoaded', () => {
  soundManager.init();
  mineSweeper.initialize();
  initializeEventListeners();
});
