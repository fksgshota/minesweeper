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
    } else if (cell.dataset.state === CELL_STATUS.FLAG_ON) {
      cell.classList.remove('flag');
      cell.textContent = '';
      cell.dataset.state = CELL_STATUS.DEFAULT;
      this.flagCount--;
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

    for (const rank of ['Gold', 'Silver', 'Bronze']) {
      if (config.rankThresholds[rank].milliseconds > clearTime) {
        config.rankThresholds[rank].time = `${countUpTimer.gameClearTimeToString}   あなたの記録`;
        break;
      }
    }
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

    const message = 'ゲームオーバー\nリトライする？';

    setTimeout(() => {
      if (confirm(message)) {
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
    this.updateBestTime();

    const config = LEVEL_CONFIG[this.currentLevel];
    const message = [
      'クリア!',
      countUpTimer.gameClearTimeToString,
      '〜ランキング〜',
      `難易度[${config.name}]`,
      `Gold [${config.rankThresholds.Gold.time}]`,
      `Silver [${config.rankThresholds.Silver.time}]`,
      `Bronze [${config.rankThresholds.Bronze.time}]`,
      'リトライする?'
    ].join('\n');

    setTimeout(() => {
      if (confirm(message)) {
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
      cell.addEventListener('click', () => this.handleCellClick(cell));
    });
  }
}

// イベントリスナーの初期化
function initializeEventListeners() {
  elements.levelButton.addEventListener('click', () => {
    mineSweeper.cycleLevel();
  });

  elements.pauseButton.addEventListener('click', () => {
    if (elements.pauseButton.value === 'start') {
      countUpTimer.start();
    } else {
      countUpTimer.pause();
      elements.flagModeButton.disabled = true;
    }
    elements.resetButton.disabled = false;
  });

  elements.flagModeButton.addEventListener('click', () => {
    mineSweeper.toggleFlagMode();
  });

  elements.resetButton.addEventListener('click', () => {
    mineSweeper.initialize();
  });
}

// アプリケーション起動
document.addEventListener('DOMContentLoaded', () => {
  mineSweeper.initialize();
  initializeEventListeners();
});
