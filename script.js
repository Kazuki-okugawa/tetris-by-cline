// テトリスゲームのJavaScript実装

// ゲームの状態
let gameBoard;
let score = 0;
let level = 1;
let lines = 0;
let gameOver = false;
let isPaused = false;
let currentPiece = null;
let nextPiece = null;
let gameInterval = null;
let gameSpeed = 1000; // 初期速度（ミリ秒）

// テトロミノの形状定義
const SHAPES = {
    I: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    J: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    L: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ],
    O: [
        [1, 1],
        [1, 1]
    ],
    S: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    T: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    Z: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ]
};

// テトロミノの色
const COLORS = {
    I: 'I',
    J: 'J',
    L: 'L',
    O: 'O',
    S: 'S',
    T: 'T',
    Z: 'Z'
};

// ゲームボードの初期化
function initializeBoard() {
    gameBoard = Array(20).fill().map(() => Array(10).fill(0));
    renderBoard();
}

// ゲームボードの描画
function renderBoard() {
    const boardElement = document.getElementById('game-board');
    boardElement.innerHTML = '';

    // 現在のボードの状態を描画
    for (let row = 0; row < 20; row++) {
        for (let col = 0; col < 10; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';

            if (gameBoard[row][col] !== 0) {
                cell.classList.add(gameBoard[row][col]);
            } else {
                cell.classList.add('empty');
            }

            boardElement.appendChild(cell);
        }
    }

    // 現在のピースを描画
    if (currentPiece) {
        const { shape, position, type } = currentPiece;
        const [pieceRow, pieceCol] = position;

        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] !== 0) {
                    const boardRow = pieceRow + row;
                    const boardCol = pieceCol + col;

                    // ボード内の場合のみ描画
                    if (boardRow >= 0 && boardRow < 20 && boardCol >= 0 && boardCol < 10) {
                        const cellIndex = boardRow * 10 + boardCol;
                        const cell = boardElement.children[cellIndex];
                        cell.className = `cell ${COLORS[type]}`;
                    }
                }
            }
        }
    }
}

// 次のピースの描画
function renderNextPiece() {
    if (!nextPiece) return;

    const nextPieceElement = document.getElementById('next-piece');
    nextPieceElement.innerHTML = '';

    const { shape, type } = nextPiece;

    // 4x4のグリッドを作成
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';

            // ピースの形状に合わせてセルを塗る
            if (row < shape.length && col < shape[row].length && shape[row][col] !== 0) {
                cell.classList.add(COLORS[type]);
            } else {
                cell.classList.add('empty');
            }

            nextPieceElement.appendChild(cell);
        }
    }
}

// 新しいピースの生成
function generatePiece() {
    const types = Object.keys(SHAPES);
    const type = types[Math.floor(Math.random() * types.length)];

    return {
        type,
        shape: SHAPES[type],
        position: [0, 3] // 開始位置（上部中央）
    };
}

// ピースの回転
function rotatePiece(piece) {
    const { shape } = piece;
    const newShape = [];

    // 転置行列を作成
    for (let col = 0; col < shape[0].length; col++) {
        newShape.push([]);
        for (let row = shape.length - 1; row >= 0; row--) {
            newShape[col].push(shape[row][col]);
        }
    }

    return newShape;
}

// 衝突検出
function checkCollision(shape, position) {
    const [pieceRow, pieceCol] = position;

    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col] !== 0) {
                const boardRow = pieceRow + row;
                const boardCol = pieceCol + col;

                // ボードの範囲外または既に埋まっているセルがある場合
                if (
                    boardRow >= 20 ||
                    boardCol < 0 ||
                    boardCol >= 10 ||
                    (boardRow >= 0 && gameBoard[boardRow][boardCol] !== 0)
                ) {
                    return true;
                }
            }
        }
    }

    return false;
}

// ピースの移動
function movePiece(rowOffset, colOffset) {
    if (gameOver || isPaused || !currentPiece) return;

    const newPosition = [
        currentPiece.position[0] + rowOffset,
        currentPiece.position[1] + colOffset
    ];

    if (!checkCollision(currentPiece.shape, newPosition)) {
        currentPiece.position = newPosition;
        renderBoard();
        return true;
    }

    // 下方向への移動が失敗した場合、ピースを固定
    if (rowOffset > 0) {
        lockPiece();
    }

    return false;
}

// ピースの回転操作
function rotatePieceAction() {
    if (gameOver || isPaused || !currentPiece) return;

    const newShape = rotatePiece(currentPiece);

    // 回転後の衝突チェック
    if (!checkCollision(newShape, currentPiece.position)) {
        currentPiece.shape = newShape;
        renderBoard();
    } else {
        // 壁蹴り処理（右壁に衝突する場合は左に、左壁に衝突する場合は右に移動を試みる）
        const kickOffsets = [-1, 1, -2, 2]; // 試す移動量

        for (const offset of kickOffsets) {
            const kickPosition = [
                currentPiece.position[0],
                currentPiece.position[1] + offset
            ];

            if (!checkCollision(newShape, kickPosition)) {
                currentPiece.shape = newShape;
                currentPiece.position = kickPosition;
                renderBoard();
                return;
            }
        }
    }
}

// ピースの固定とライン消去
function lockPiece() {
    const { shape, position, type } = currentPiece;
    const [pieceRow, pieceCol] = position;

    // ボードにピースを固定
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col] !== 0) {
                const boardRow = pieceRow + row;
                const boardCol = pieceCol + col;

                if (boardRow >= 0 && boardRow < 20 && boardCol >= 0 && boardCol < 10) {
                    gameBoard[boardRow][boardCol] = COLORS[type];
                }
            }
        }
    }

    // ラインの確認と消去
    clearLines();

    // 次のピースを設定
    currentPiece = nextPiece;
    nextPiece = generatePiece();
    renderNextPiece();

    // ゲームオーバーチェック
    if (checkCollision(currentPiece.shape, currentPiece.position)) {
        endGame();
    }
}

// ラインの消去処理
function clearLines() {
    let linesCleared = 0;

    for (let row = 19; row >= 0; row--) {
        if (gameBoard[row].every(cell => cell !== 0)) {
            // ラインを消去して上から詰める
            gameBoard.splice(row, 1);
            gameBoard.unshift(Array(10).fill(0));
            linesCleared++;
            row++; // 同じ行を再チェック（消去後に上の行が下がってくるため）
        }
    }

    if (linesCleared > 0) {
        // スコア計算（ライン数に応じて増加）
        const linePoints = [40, 100, 300, 1200]; // 1, 2, 3, 4ライン消去時のポイント
        score += linePoints[linesCleared - 1] * level;
        lines += linesCleared;

        // レベルアップ（10ライン消去ごと）
        level = Math.floor(lines / 10) + 1;

        // ゲームスピードの更新
        updateGameSpeed();

        // UI更新
        updateScore();
    }
}

// ハードドロップ（一気に落下）
function hardDrop() {
    if (gameOver || isPaused || !currentPiece) return;

    while (movePiece(1, 0)) {
        // 衝突するまで下に移動
    }
}

// ゲームスピードの更新
function updateGameSpeed() {
    // レベルに応じてスピードアップ（最大レベル15）
    gameSpeed = Math.max(100, 1000 - (level - 1) * 60);

    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, gameSpeed);
    }
}

// スコア表示の更新
function updateScore() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = lines;
}

// ゲームループ
function gameLoop() {
    if (!gameOver && !isPaused) {
        movePiece(1, 0); // 毎ループで1マス下に移動
    }
}

// ゲーム開始
function startGame() {
    // 既存のゲームをリセット
    if (gameInterval) {
        clearInterval(gameInterval);
    }

    // 初期化
    initializeBoard();
    score = 0;
    level = 1;
    lines = 0;
    gameOver = false;
    isPaused = false;
    gameSpeed = 1000;

    // UI更新
    updateScore();

    // 最初のピースを生成
    currentPiece = generatePiece();
    nextPiece = generatePiece();
    renderNextPiece();

    // ゲームループ開始
    gameInterval = setInterval(gameLoop, gameSpeed);

    // ゲームオーバー表示を削除
    const gameOverElement = document.querySelector('.game-over');
    if (gameOverElement) {
        gameOverElement.remove();
    }

    // ボタンの状態更新
    document.getElementById('start-button').textContent = 'リスタート';
}

// ゲーム一時停止
function togglePause() {
    if (gameOver) return;

    isPaused = !isPaused;

    const pauseButton = document.getElementById('pause-button');
    pauseButton.textContent = isPaused ? 'ゲーム再開' : '一時停止';
}

// ゲーム終了
function endGame() {
    gameOver = true;
    clearInterval(gameInterval);

    // ゲームオーバー表示
    const gameOverElement = document.createElement('div');
    gameOverElement.className = 'game-over';
    gameOverElement.innerHTML = `
        <h2>ゲームオーバー</h2>
        <p>スコア: ${score}</p>
        <p>レベル: ${level}</p>
        <p>ライン: ${lines}</p>
    `;

    document.querySelector('.game-board-container').appendChild(gameOverElement);
}

// キーボード入力の処理
function handleKeyPress(event) {
    if (gameOver) return;

    switch (event.key) {
        case 'ArrowLeft':
            movePiece(0, -1); // 左に移動
            break;
        case 'ArrowRight':
            movePiece(0, 1); // 右に移動
            break;
        case 'ArrowDown':
            movePiece(1, 0); // 下に移動
            break;
        case 'ArrowUp':
            rotatePieceAction(); // 回転
            break;
        case ' ':
            hardDrop(); // スペースキーでハードドロップ
            break;
        case 'p':
        case 'P':
            togglePause(); // P キーで一時停止/再開
            break;
    }
}

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', () => {
    // キーボード入力
    document.addEventListener('keydown', handleKeyPress);

    // ボタン操作
    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('pause-button').addEventListener('click', togglePause);

    // ゲームボードの初期化
    initializeBoard();
});
