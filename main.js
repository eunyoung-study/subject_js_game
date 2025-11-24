const canvas = document.getElementById("tetris");
const ctx = canvas.getContext("2d");
const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;

// 게임 상태
let board = createEmptyBoard();
let score = 0;
let level = 1;
let gameOver = false;
let isPaused = false;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

// Hold 시스템
let canHold = true;
let holdPieceType = null;
const holdCanvas = document.getElementById("holdPiece");
const holdCtx = holdCanvas ? holdCanvas.getContext("2d") : null;

let blockBag = [];
let nextPieceType = null; // 다음 블록 종류 저장

// 다음 블록 미리보기 캔버스
const nextCanvas = document.getElementById("nextPiece");
const nextCtx = nextCanvas.getContext("2d");

// 테트리스 블록 정의
const SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [
        [1, 1],
        [1, 1],
    ],
    T: [
        [0, 1, 0],
        [1, 1, 1],
    ],
    L: [
        [1, 0],
        [1, 0],
        [1, 1],
    ],
    J: [
        [0, 1],
        [0, 1],
        [1, 1],
    ],
    S: [
        [0, 1, 1],
        [1, 1, 0],
    ],
    Z: [
        [1, 1, 0],
        [0, 1, 1],
    ],
};

const COLORS = {
    I: "#00f0f0",
    O: "#f0f000",
    T: "#a000f0",
    L: "#f0a000",
    J: "#0000f0",
    S: "#00f000",
    Z: "#f00000",
};

// 현재 블록
let currentPiece = {
    shape: null,
    color: null,
    x: 0,
    y: 0,
};

// 가방에 7개 블록 넣고 섞기
function fillBag() {
    // 7가지 블록 종류를 배열에 넣기
    const shapes = ["I", "O", "T", "L", "J", "S", "Z"];

    // 배열을 무작위로 섞기 (Fisher-Yates 알고리즘)
    for (let i = shapes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shapes[i], shapes[j]] = [shapes[j], shapes[i]];
    }

    // 섞인 배열을 blockBag에 저장
    blockBag = shapes;
}

// Hold 블록 그리기
function drawHoldPiece() {
    // holdCanvas가 없으면 그냥 리턴
    if (!holdCtx) return;

    // 캔버스 지우기
    holdCtx.fillStyle = "#000";
    holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);

    if (!holdPieceType) return;

    const shape = SHAPES[holdPieceType];
    const color = COLORS[holdPieceType];

    // 블록을 중앙에 배치하기 위한 오프셋 계산
    const offsetX = (4 - shape[0].length) / 2;
    const offsetY = (4 - shape.length) / 2;

    // 블록 그리기
    shape.forEach((row, dy) => {
        row.forEach((value, dx) => {
            if (value) {
                const x = (offsetX + dx) * BLOCK_SIZE;
                const y = (offsetY + dy) * BLOCK_SIZE;

                holdCtx.fillStyle = color;
                holdCtx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
                holdCtx.strokeStyle = "#333";
                holdCtx.strokeRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
            }
        });
    });
}

// Hold 기능
function holdPiece() {
    // Hold를 이미 사용했으면 무시
    if (!canHold) return;

    // 현재 블록 타입 저장
    const currentType = Object.keys(SHAPES).find(
        (key) =>
            JSON.stringify(SHAPES[key]) === JSON.stringify(currentPiece.shape)
    );

    if (holdPieceType === null) {
        // 처음 Hold 하는 경우: 현재 블록을 보관하고 다음 블록 가져오기
        holdPieceType = currentType;
        createPiece();
    } else {
        // 이미 보관된 블록이 있는 경우: 교환
        const temp = holdPieceType;
        holdPieceType = currentType;

        // 보관된 블록을 현재 블록으로 만들기
        currentPiece = {
            shape: SHAPES[temp],
            color: COLORS[temp],
            x: Math.floor(COLS / 2) - Math.floor(SHAPES[temp][0].length / 2),
            y: 0,
        };

        // 충돌 확인
        if (collision()) {
            gameOver = true;
            document.getElementById("gameOver").style.display = "block";
        }
    }

    // Hold 사용했으므로 이번 턴에는 더 이상 사용 불가
    canHold = false;

    // Hold 블록 화면에 그리기
    drawHoldPiece();
}

// 다음 블록 그리기
function drawNextPiece() {
    // 캔버스 지우기
    nextCtx.fillStyle = "#000";
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (!nextPieceType) return;

    const shape = SHAPES[nextPieceType];
    const color = COLORS[nextPieceType];

    // 블록을 중앙에 배치하기 위한 오프셋 계산
    const offsetX = (4 - shape[0].length) / 2;
    const offsetY = (4 - shape.length) / 2;

    // 블록 그리기
    shape.forEach((row, dy) => {
        row.forEach((value, dx) => {
            if (value) {
                const x = (offsetX + dx) * BLOCK_SIZE;
                const y = (offsetY + dy) * BLOCK_SIZE;

                nextCtx.fillStyle = color;
                nextCtx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
                nextCtx.strokeStyle = "#333";
                nextCtx.strokeRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
            }
        });
    });
}

function createEmptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function drawBlock(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = "#333";
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

function drawBoard() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                drawBlock(x, y, board[y][x]);
            }
        }
    }
}

function drawPiece() {
    currentPiece.shape.forEach((row, dy) => {
        row.forEach((value, dx) => {
            if (value) {
                drawBlock(
                    currentPiece.x + dx,
                    currentPiece.y + dy,
                    currentPiece.color
                );
            }
        });
    });
}

// 가방에서 블록 꺼내기
function createPiece() {
    // 가방이 비어있으면 새로 채우기
    if (blockBag.length === 0) {
        fillBag();
    }

    // 다음 블록이 있으면 그걸 사용, 없으면 가방에서 꺼내기
    const type = nextPieceType || blockBag.pop();

    currentPiece = {
        shape: SHAPES[type],
        color: COLORS[type],
        x: Math.floor(COLS / 2) - Math.floor(SHAPES[type][0].length / 2),
        y: 0,
    };

    // 다음 블록 미리 확인하기
    if (blockBag.length === 0) {
        fillBag();
    }
    nextPieceType = blockBag.pop();
    drawNextPiece();

    if (collision()) {
        gameOver = true;
        document.getElementById("gameOver").style.display = "block";
    }
}

function collision() {
    return currentPiece.shape.some((row, dy) => {
        return row.some((value, dx) => {
            if (value) {
                const newX = currentPiece.x + dx;
                const newY = currentPiece.y + dy;
                return (
                    newX < 0 ||
                    newX >= COLS ||
                    newY >= ROWS ||
                    (newY >= 0 && board[newY][newX])
                );
            }
            return false;
        });
    });
}

function merge() {
    currentPiece.shape.forEach((row, dy) => {
        row.forEach((value, dx) => {
            if (value) {
                board[currentPiece.y + dy][currentPiece.x + dx] =
                    currentPiece.color;
            }
        });
    });
}

function rotate() {
    const rotated = currentPiece.shape[0].map((_, i) =>
        currentPiece.shape.map((row) => row[i]).reverse()
    );
    const prevShape = currentPiece.shape;
    currentPiece.shape = rotated;

    if (collision()) {
        currentPiece.shape = prevShape;
    }
}

function move(dir) {
    currentPiece.x += dir;
    if (collision()) {
        currentPiece.x -= dir;
    }
}

function drop() {
    currentPiece.y++;
    if (collision()) {
        currentPiece.y--;
        merge();
        clearLines();
        createPiece();
        canHold = true; // 새 블록이 나왔으므로 Hold 다시 사용 가능
    }
}

function hardDrop() {
    while (!collision()) {
        currentPiece.y++;
    }
    currentPiece.y--;
    merge();
    clearLines();
    createPiece();
    canHold = true; // 새 블록이 나왔으므로 Hold 다시 사용 가능
}

function clearLines() {
    let linesCleared = 0;
    outer: for (let y = ROWS - 1; y >= 0; y--) {
        for (let x = 0; x < COLS; x++) {
            if (!board[y][x]) continue outer;
        }
        board.splice(y, 1);
        board.unshift(Array(COLS).fill(0));
        linesCleared++;
        y++;
    }

    if (linesCleared > 0) {
        score += linesCleared * 100 * level;
        level = Math.floor(score / 1000) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        updateScore();
    }
}

function updateScore() {
    document.getElementById("score").textContent = score;
    document.getElementById("level").textContent = level;
}

function togglePause() {
    isPaused = !isPaused;
}

function resetGame() {
    board = createEmptyBoard();
    score = 0;
    level = 1;
    gameOver = false;
    dropInterval = 1000;
    blockBag = []; // 가방도 비우기
    nextPieceType = null; // 다음 블록도 초기화
    holdPieceType = null; // Hold 블록도 초기화
    canHold = true; // Hold 사용 가능하게 초기화
    updateScore();
    document.getElementById("gameOver").style.display = "none";

    // Hold 캔버스 지우기
    if (holdCtx) {
        holdCtx.fillStyle = "#000";
        holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
    }

    createPiece();
}

function update(time = 0) {
    if (!gameOver && !isPaused) {
        const deltaTime = time - lastTime;
        lastTime = time;
        dropCounter += deltaTime;

        if (dropCounter > dropInterval) {
            drop();
            dropCounter = 0;
        }

        drawBoard();
        drawPiece();
    }
    requestAnimationFrame(update);
}

// 키보드 이벤트
document.addEventListener("keydown", (e) => {
    if (gameOver || isPaused) return;

    switch (e.key) {
        case "ArrowLeft":
            move(-1);
            break;
        case "ArrowRight":
            move(1);
            break;
        case "ArrowDown":
            drop();
            break;
        case "ArrowUp":
            rotate();
            break;
        case " ":
            hardDrop();
            break;
        case "Shift":
            holdPiece();
            break;
    }
});

// 게임 시작
createPiece();
update();
