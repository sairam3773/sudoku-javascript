const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const timerEl = document.getElementById("timer");
const numBtns = document.querySelectorAll(".num-btn");
const levelBtns = document.querySelectorAll(".level-btn");
const pausePlayBtn = document.getElementById("pausePlay");
const boardWrap = document.querySelector(".board-wrap");
const winModal = document.getElementById("winModal");
const winMsg = document.getElementById("winMsg");

const LEVELS = {
  easy: 45,
  medium: 34,
  hard: 28,
};

let solution = [];
let puzzle = [];
let board = [];
let selected = null;
let activeNum = null;
let timerId = null;
let seconds = 0;
let currentLevel = "easy";
let paused = true;
let lastTap = { row: -1, col: -1, time: 0 };

function makeEmpty() {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isSafe(grid, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === num || grid[i][col] === num) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (grid[boxRow + r][boxCol + c] === num) return false;
    }
  }
  return true;
}

function fillGrid(grid) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const num of nums) {
          if (isSafe(grid, row, col, num)) {
            grid[row][col] = num;
            if (fillGrid(grid)) return true;
            grid[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function countSolutions(grid, limit = 2) {
  let found = 0;
  const g = grid.map((r) => r.slice());

  function solve() {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (g[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isSafe(g, row, col, num)) {
              g[row][col] = num;
              solve();
              g[row][col] = 0;
              if (found >= limit) return;
            }
          }
          return;
        }
      }
    }
    found++;
  }

  solve();
  return found;
}

function carvePuzzle(full, givens) {
  const trimmed = full.map((r) => r.slice());
  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => i)
  );
  let remaining = 81;

  for (const pos of positions) {
    if (remaining <= givens) break;
    const row = Math.floor(pos / 9);
    const col = pos % 9;
    if (trimmed[row][col] === 0) continue;

    const backup = trimmed[row][col];
    trimmed[row][col] = 0;
    if (countSolutions(trimmed, 2) !== 1) {
      trimmed[row][col] = backup;
    } else {
      remaining--;
    }
  }
  return trimmed;
}

function generate() {
  const full = makeEmpty();
  fillGrid(full);
  solution = full.map((r) => r.slice());
  puzzle = carvePuzzle(full, LEVELS[currentLevel]);
  board = puzzle.map((r) => r.slice());
}

function render() {
  boardEl.innerHTML = "";
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = row;
      cell.dataset.col = col;

      if (row === 2 || row === 5) cell.classList.add("block-bottom");
      if (puzzle[row][col] !== 0) cell.classList.add("given");

      if (board[row][col] !== 0) {
        cell.textContent = board[row][col];
      }

      if (selected && selected.row === row && selected.col === col) {
        cell.classList.add("selected");
      } else if (selected && isPeer(row, col, selected.row, selected.col)) {
        cell.classList.add("peer");
      }

      const compareNum =
        activeNum !== null
          ? activeNum
          : selected && board[selected.row][selected.col] !== 0
          ? board[selected.row][selected.col]
          : null;

      if (
        compareNum !== null &&
        board[row][col] === compareNum &&
        !(selected && selected.row === row && selected.col === col)
      ) {
        cell.classList.add("match");
      }

      if (board[row][col] !== 0 && !isValidPlacement(row, col)) {
        cell.classList.add("conflict");
      }

      cell.addEventListener("click", () => onCellClick(row, col));
      boardEl.appendChild(cell);
    }
  }
  updateNumpad();
}

function isPeer(r1, c1, r2, c2) {
  if (r1 === r2 && c1 === c2) return false;
  if (r1 === r2 || c1 === c2) return true;
  return (
    Math.floor(r1 / 3) === Math.floor(r2 / 3) &&
    Math.floor(c1 / 3) === Math.floor(c2 / 3)
  );
}

function isValidPlacement(row, col) {
  const num = board[row][col];
  if (num === 0) return true;
  for (let i = 0; i < 9; i++) {
    if (i !== col && board[row][i] === num) return false;
    if (i !== row && board[i][col] === num) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const rr = boxRow + r;
      const cc = boxCol + c;
      if ((rr !== row || cc !== col) && board[rr][cc] === num) return false;
    }
  }
  return true;
}

function onCellClick(row, col) {
  if (paused) return;

  const now = Date.now();
  const isDouble =
    lastTap.row === row &&
    lastTap.col === col &&
    now - lastTap.time < 320;
  lastTap = { row, col, time: now };

  if (isDouble) {
    if (puzzle[row][col] === 0 && board[row][col] !== 0) {
      board[row][col] = 0;
      selected = { row, col };
      activeNum = null;
      setActiveNumBtn(null);
      statusEl.textContent = "Cleared";
      render();
      return;
    }
  }

  if (selected && selected.row === row && selected.col === col) {
    selected = null;
  } else {
    selected = { row, col };
  }
  activeNum = null;
  setActiveNumBtn(null);
  render();
}

function isComplete() {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] !== solution[row][col]) return false;
    }
  }
  return true;
}

function updateNumpad() {
  const counts = Array(10).fill(0);
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] !== 0) counts[board[row][col]]++;
    }
  }
  numBtns.forEach((btn) => {
    const n = Number(btn.dataset.num);
    btn.classList.toggle("done", counts[n] >= 9);
  });
}

function setActiveNumBtn(num) {
  numBtns.forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.num) === num);
  });
}

function enterNumber(num) {
  if (paused) return;
  if (!selected) {
    statusEl.textContent = "Select a cell first";
    return;
  }
  if (puzzle[selected.row][selected.col] !== 0) {
    statusEl.textContent = "That cell is locked";
    return;
  }
  board[selected.row][selected.col] =
    board[selected.row][selected.col] === num ? 0 : num;
  statusEl.textContent = "Keep going";
  render();
  if (isComplete()) win();
}

function win() {
  stopTimer();
  statusEl.textContent = `Solved in ${timerEl.textContent}!`;
  boardEl.querySelectorAll(".cell").forEach((c) => {
    c.style.color = c.classList.contains("given")
      ? "var(--given)"
      : "var(--user)";
  });
  winMsg.textContent = `You solved the ${currentLevel} puzzle in ${timerEl.textContent}.`;
  winModal.hidden = false;
}

function erase() {
  if (paused) return;
  if (!selected) return;
  if (puzzle[selected.row][selected.col] !== 0) return;
  board[selected.row][selected.col] = 0;
  render();
}

function check() {
  let wrong = 0;
  const cells = boardEl.querySelectorAll(".cell");
  cells.forEach((cell) => {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    if (board[row][col] !== 0 && board[row][col] !== solution[row][col]) {
      cell.classList.add("flash");
      wrong++;
    }
  });
  statusEl.textContent = wrong === 0 ? "All good so far!" : `${wrong} mistake(s)`;
}

function resetTimer() {
  stopTimer();
  seconds = 0;
  timerEl.textContent = "00:00";
}

function resumeTimer() {
  if (timerId) return;
  timerId = setInterval(() => {
    seconds++;
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    timerEl.textContent = `${m}:${s}`;
  }, 1000);
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

function updatePauseBtn() {
  if (paused) {
    pausePlayBtn.innerHTML = "&#9654;";
    pausePlayBtn.setAttribute("aria-label", "Play");
    pausePlayBtn.title = "Play";
  } else {
    pausePlayBtn.innerHTML = "&#10074;&#10074;";
    pausePlayBtn.setAttribute("aria-label", "Pause");
    pausePlayBtn.title = "Pause";
  }
  boardWrap.classList.toggle("paused", paused);
}

function playGame() {
  if (!paused) return;
  paused = false;
  updatePauseBtn();
  resumeTimer();
  statusEl.textContent = "Fill the grid";
}

function pauseGame() {
  if (paused) return;
  paused = true;
  updatePauseBtn();
  stopTimer();
  statusEl.textContent = "Paused";
}

function togglePause() {
  if (paused) playGame();
  else pauseGame();
}

function newGame() {
  winModal.hidden = true;
  statusEl.textContent = "Generating...";
  setTimeout(() => {
    generate();
    selected = null;
    activeNum = null;
    lastTap = { row: -1, col: -1, time: 0 };
    setActiveNumBtn(null);
    resetTimer();
    render();
    if (!paused) resumeTimer();
    statusEl.textContent = paused ? "Tap to play" : "Fill the grid";
  }, 20);
}

numBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (paused) return;
    const num = Number(btn.dataset.num);
    if (activeNum === num) {
      activeNum = null;
      setActiveNumBtn(null);
    } else {
      activeNum = num;
      setActiveNumBtn(num);
    }
    if (selected) enterNumber(num);
    else {
      render();
    }
  });
});

levelBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    levelBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentLevel = btn.dataset.level;
    newGame();
  });
});

document.getElementById("newGame").addEventListener("click", newGame);
document.getElementById("erase").addEventListener("click", erase);
document.getElementById("check").addEventListener("click", check);
pausePlayBtn.addEventListener("click", togglePause);

boardWrap.addEventListener("click", () => {
  if (paused) playGame();
});

document.getElementById("modalNewGame").addEventListener("click", () => {
  winModal.hidden = true;
  newGame();
});

winModal.addEventListener("click", (e) => {
  if (e.target === winModal) winModal.hidden = true;
});

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    togglePause();
    return;
  }
  if (paused) return;
  if (e.key >= "1" && e.key <= "9") {
    const num = Number(e.key);
    activeNum = num;
    setActiveNumBtn(num);
    if (selected) enterNumber(num);
    else render();
  } else if (e.key === "Backspace" || e.key === "Delete") {
    erase();
  } else if (e.key.startsWith("Arrow") && selected) {
    let { row, col } = selected;
    if (e.key === "ArrowUp") row = (row + 8) % 9;
    if (e.key === "ArrowDown") row = (row + 1) % 9;
    if (e.key === "ArrowLeft") col = (col + 8) % 9;
    if (e.key === "ArrowRight") col = (col + 1) % 9;
    selected = { row, col };
    render();
  }
});

updatePauseBtn();
newGame();
