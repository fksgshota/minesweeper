;`use strict`
const pauseButton = document.getElementById(`pauseButton`)
const levelButton = document.getElementById(`levelButton`)
const timeCounter = document.getElementById(`timeCounter`)
const minefield = document.getElementById(`minefield`)
const mineSwTable = document.getElementById(`mineSwTable`)
const resetButton = document.getElementById(`resetButton`)
const flagModeButton = document.getElementById(`flagModeButton`)
const mineNumber = document.getElementById(`mineNumber`)
const flagCounter = document.getElementById(`flagCounter`)

const countUpTimer = {
  startTime: 0,
  playTime: 0,
  elapsedTime: 0,
  gameClearTime: 0,
  timerID: ``,

  start() {
    this.startTime = new Date().getTime()
    this.startTime -= this.elapsedTime
    pauseButton.value = `pause`
    pauseButton.textContent = `一時停止`
    this.timerID = setInterval(() => {
      this.outputDisplay()
    }, 1000)
  },

  outputDisplay() {
    this.playTime = new Date().getTime()
    timeCounter.textContent = this.outputFormat(this.playTime - this.startTime)
  },

  pause() {
    clearInterval(this.timerID)
    this.elapsedTime = this.playTime - this.startTime
    pauseButton.value = `start`
    pauseButton.textContent = `再開`
  },

  reset() {
    clearInterval(this.timerID)
    this.startTime = this.playTime = this.elapsedTime = this.gameClearTime = 0
    pauseButton.value = `start`
    pauseButton.textContent = `スタート`
    timeCounter.textContent = `00:00:00`
  },

  outputFormat(milliSec) {
    const sec = milliSec / 1000
    let ss = sec.toFixed(0)
    let mm = Math.floor(ss / 60)
    ss = ss % 60
    let hh = Math.floor(mm / 60)
    mm = mm % 60
    if (ss < 10) {
      ss = `0${ss}`
    }
    if (mm < 10) {
      mm = `0${mm}`
    }
    if (hh < 10) {
      hh = `0${hh}`
    }
    return `${hh}:${mm}:${ss}`
  },
  setGameClearTime() {
    this.pause()
    this.gameClearTime = this.outputFormat(this.elapsedTime)
  },
}

const mineSweeper = {
  gameLevelConfig: [
    { name: `初級`, cell: 9, mine: 10 },
    { name: `中級`, cell: 16, mine: 40 },
    { name: `上級`, cell: 30, mine: 120 },
    { name: `マニア`, cell: 68, mine: 777 },
  ],
  gameLevel: 0,
  initializingState: true,
  flagSetMode: false,
  flagNumber: 0,
  mineNumber: 10,
  highScoreRanking: [
    { name: `初級`, Gold: `-`, Silver: `-`, Bronze: `-` },
    { name: `中級`, Gold: `-`, Silver: `-`, Bronze: `-` },
    { name: `上級`, Gold: `-`, Silver: `-`, Bronze: `-` },
    { name: `マニア`, Gold: `-`, Silver: `-`, Bronze: `-` },
  ],

  toggleFlagSetMode() {
    if (this.flagSetMode) {
      this.flagSetMode = false
    } else {
      this.flagSetMode = true
    }
    flagModeButton.classList.toggle(`activate`)
  },
  toggleFlagSet(clickCell) {
    switch (clickCell.dataset.status) {
      case `0`:
        clickCell.textContent = `▲`
        clickCell.dataset.status = `2`
        this.flagNumber++
        flagCounter.textContent = this.flagNumber
        break
      case `2`:
        clickCell.textContent = ``
        clickCell.dataset.status = `0`
        this.flagNumber--
        flagCounter.textContent = this.flagNumber
        break
    }
  },

  setGameLevel() {
    if (this.gameLevel === this.gameLevelConfig.length - 1) {
      this.gameLevel = 0
    } else {
      this.gameLevel++
    }
    levelButton.textContent = this.gameLevelConfig[this.gameLevel].name

    this.initialize()
  },

  setMinesRandomly() {
    const cellIdArray = []
    for (let tr = 0; tr < this.gameLevelConfig[this.gameLevel].cell; tr++) {
      for (let td = 0; td < this.gameLevelConfig[this.gameLevel].cell; td++) {
        cellIdArray.push(`cell-${tr}-${td}`)
      }
    }
    for (let i = cellIdArray.length - 1; i >= 0; i--) {
      const g = Math.floor(Math.random() * (i + 1))
      const tmp = cellIdArray[i]
      cellIdArray[i] = cellIdArray[g]
      cellIdArray[g] = tmp
    }

    for (let i = 0; i < this.gameLevelConfig[this.gameLevel].mine; i++) {
      if (document.getElementById(`${cellIdArray[i]}`).dataset.status === `1`) {
        cellIdArray.splice(i, 1)
        i--
        continue
      }
      document.getElementById(`${cellIdArray[i]}`).dataset.mine = `1`
    }
  },

  createMineSwTarble() {
    const table = document.createElement(`table`)
    table.id = `mineSwTable`
    for (let i = 0; i < this.gameLevelConfig[this.gameLevel].cell; i++) {
      const tr = document.createElement(`tr`)
      tr.id = `tr-${i}`
      for (let j = 0; j < this.gameLevelConfig[this.gameLevel].cell; j++) {
        const td = document.createElement(`td`)
        td.id = `cell-${i}-${j}`
        td.dataset.status = `0`
        td.dataset.mine = `0`
        td.dataset.value = ``
        tr.appendChild(td)
      }
      table.appendChild(tr)
    }
    minefield.appendChild(table)
  },

  countMineNumber() {
    const tdArray = Array.from(document.getElementsByTagName(`td`))

    tdArray.forEach(cell => {
      const cellId = cell.id
      const cellIdSplit = cellId.split(`-`)
      const tr = Number(cellIdSplit[1])
      const td = Number(cellIdSplit[2])
      let valueNum = ``

      if (cell.dataset.mine === `1`) {
        return
      }

      for (let i = tr - 1; i <= tr + 1; i++) {
        for (let j = td - 1; j <= td + 1; j++) {
          let adjacentCell = document.getElementById(`cell-${i}-${j}`)
          if ((i === tr && j === td) || adjacentCell === null) {
            continue
          }
          let adjacentCellMine = adjacentCell.dataset.mine
          if (adjacentCellMine === `1`) {
            valueNum++
          }
        }
      }
      cell.dataset.value = `${valueNum}`
    })
  },

  deleteMineSwTarble() {
    while (minefield.firstChild) {
      minefield.removeChild(minefield.firstChild)
    }
  },

  openAllCells() {
    const tdArray = Array.from(document.getElementsByTagName(`td`))

    tdArray.forEach(td => {
      if (td.dataset.status === `1`) {
        return
      }

      if (td.dataset.mine === `1`) {
        this.openMineCell(td)
        return
      }

      this.openEmptyCell(td)
    })
  },

  openEmptyCell(clickCell) {
    clickCell.dataset.status = `1`
    clickCell.classList.add(`empty`)
    clickCell.textContent = document.getElementById(clickCell.id).dataset.value
  },

  openMineCell(clickCell) {
    clickCell.dataset.status = `1`
    clickCell.classList.add(`mine`)
    clickCell.textContent = '●'
  },

  endGame() {
    const resultMessage = `
    ゲームオーバー
    リトライする？`
    countUpTimer.pause()
    this.openAllCells()

    setTimeout(() => {
      if (confirm(resultMessage)) {
        this.initialize()
      } else {
        pauseButton.disabled = true
        flagModeButton.disabled = true
      }
    }, 1000)
  },

  startGame() {
    countUpTimer.start()
    this.setMinesRandomly()
    this.countMineNumber()
    this.initializingState = false
    resetButton.disabled = false
    pauseButton.disabled = false
    flagModeButton.disabled = false
  },

  clearGame() {
    countUpTimer.setGameClearTime()
    this.openAllCells()
    setTimeout(() => {
      this.confirmResult()
    }, 1000)
  },

  confirmResult() {
    const clearTime = countUpTimer.gameClearTime
    const toSec = time => {
      if (time === `-`) {
        return 0
      }
      const timeSplit = time.split(':')
      const hour = Number(timeSplit[0])
      const minute = Number(timeSplit[1])
      const second = Number(timeSplit[2])

      return hour * 60 * 60 + minute * 60 + second
    }

    for (let key in this.highScoreRanking[this.gameLevel]) {
      if (key === `name`) {
        continue
      }
      if (this.highScoreRanking[this.gameLevel][key] === `-`) {
        this.highScoreRanking[this.gameLevel][key] = clearTime
        break
      }
      if (toSec(this.highScoreRanking[this.gameLevel][key]) > toSec(clearTime)) {
        this.highScoreRanking[this.gameLevel][key] = clearTime
        break
      }
    }

    const resultMessage = `
  クリア!
  ${clearTime}
  〜ランキング〜
  Gold [${this.highScoreRanking[this.gameLevel].Gold}]
  Silver [${this.highScoreRanking[this.gameLevel].Silver}]
  Bronze [${this.highScoreRanking[this.gameLevel].Bronze}]
  リトライする?`

    if (confirm(resultMessage)) {
      this.initialize()
    } else {
      pauseButton.disabled = true
      flagModeButton.disabled = true
    }
  },
  initialize() {
    this.initializingState = true
    this.flagSetMode = false
    this.flagNumber = 0
    flagCounter.textContent = this.flagNumber
    this.mineNumber = this.gameLevelConfig[this.gameLevel].mine
    mineNumber.textContent = this.mineNumber
    resetButton.disabled = true
    pauseButton.disabled = true
    flagModeButton.disabled = true
    countUpTimer.reset()
    this.deleteMineSwTarble()
    this.createMineSwTarble()
    this.addEventToTd()
  },
  mineCellCheck(cellIdArray) {
    let mineCell = false

    for (cellId of cellIdArray) {
      let adjacentCell = document.getElementById(cellId)
      if (adjacentCell.dataset.mine === `1`) {
        mineCell = true
        break
      }
    }
    return mineCell
  },

  openAdjacentEmptyCell(clickCell) {
    const clickCellId = clickCell.id
    const clickCellIdSplit = clickCellId.split(`-`)
    const trNum = Number(clickCellIdSplit[1])
    const tdNum = Number(clickCellIdSplit[2])
    const cellIdArray = []

    for (let i = trNum - 1; i <= trNum + 1; i++) {
      for (let j = tdNum - 1; j <= tdNum + 1; j++) {
        if (
          `cell-${i}-${j}` === clickCellId ||
          document.getElementById(`cell-${i}-${j}`) === null ||
          document.getElementById(`cell-${i}-${j}`).dataset.status === `1`
        ) {
          continue
        }
        cellIdArray.push(`cell-${i}-${j}`)
      }
    }

    if (cellIdArray.length === 0 || this.mineCellCheck(cellIdArray)) {
      return
    }
    for (cellId of cellIdArray) {
      let adjacentCell = document.getElementById(cellId)
      if (adjacentCell === null) {
        continue
      }
      this.openEmptyCell(adjacentCell)
      this.openAdjacentEmptyCell(adjacentCell)
    }
  },

  addEventToTd() {
    const tdArray = Array.from(document.getElementsByTagName(`td`))

    tdArray.forEach(td => {
      td.addEventListener(
        'click',
        () => {
          mineSweeper.judgeCellState(td)
        },
        false
      )
    })
  },
  //ここまで確認完了

  judgeGameClear() {
    const tdArray = Array.from(document.getElementsByTagName(`td`))
    gameClear = true

    for (td of tdArray) {
      if ((td.dataset.status === `0` || td.dataset.status === `2`) && td.dataset.mine === ``) {
        gameClear = false
        break
      }
    }
    return gameClear
  },

  judgeCellState(td) {
    if (this.initializingState) {
      td.dataset.status = `1`
      td.classList.add(`empty`)
      this.startGame()
      this.openAdjacentEmptyCell(td)
      td.textContent = document.getElementById(td.id).dataset.value
      return
    }

    switch (td.dataset.status) {
      case `0`:
        if (this.flagSetMode) {
          this.toggleFlagSet(td)
          return
        }
        if (td.dataset.mine === `1`) {
          this.openMineCell(td)
          this.endGame()
          return
        }
        this.openEmptyCell(td)
        this.openAdjacentEmptyCell(td)
        break
      case `1`:
        break
      case `2`:
        this.toggleFlagSet(td)
        break
    }
    if (this.judgeGameClear()) {
      this.clearGame()
    }
  },
}

document.addEventListener(
  `DOMContentLoaded`,
  () => {
    mineSweeper.initialize()

    levelButton.addEventListener(
      `click`,
      () => {
        mineSweeper.setGameLevel()
      },
      false
    )

    pauseButton.addEventListener(
      `click`,
      () => {
        switch (pauseButton.value) {
          case `start`:
            countUpTimer.start()
            break
          case `pause`:
            countUpTimer.pause()
            break
        }
        resetButton.disabled = false
      },
      false
    )

    flagModeButton.addEventListener(
      `click`,
      () => {
        mineSweeper.toggleFlagSetMode()
      },
      false
    )

    resetButton.addEventListener(
      `click`,
      () => {
        mineSweeper.initialize()
      },
      false
    )
  },
  false
)
