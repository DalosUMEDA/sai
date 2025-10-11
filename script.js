class OthelloGame {
    constructor() {
        this.board = [];
        this.currentPlayer = 'black'; // 'black' or 'white'
        this.humanPlayer = 'black';
        this.computerPlayer = 'white';
        this.gameHistory = [];
        this.gameState = [];
        this.isGameActive = false;
        this.aiFirstMove = null;
        
        // AI設定
        this.maxDepth = 4;
        this.timeLimit = 4500; // 4.5秒（余裕を持たせる）
        
        // 評価テーブル
        this.positionWeights = [
            [100, -20,  10,   5,   5,  10, -20, 100],
            [-20, -50,  -2,  -2,  -2,  -2, -50, -20],
            [ 10,  -2,  -1,  -1,  -1,  -1,  -2,  10],
            [  5,  -2,  -1,  -1,  -1,  -1,  -2,   5],
            [  5,  -2,  -1,  -1,  -1,  -1,  -2,   5],
            [ 10,  -2,  -1,  -1,  -1,  -1,  -2,  10],
            [-20, -50,  -2,  -2,  -2,  -2, -50, -20],
            [100, -20,  10,   5,   5,  10, -20, 100]
        ];
        
        this.initializeGame();
        this.bindEvents();
    }
    
    initializeGame() {
        this.createBoard();
        this.resetBoard();
    }
    
    createBoard() {
        const boardElement = document.getElementById('board');
        boardElement.innerHTML = '';
        
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.addEventListener('click', () => this.handleCellClick(row, col));
                boardElement.appendChild(cell);
            }
        }
    }
    
    resetBoard() {
        // ボードをリセット
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        
        // 初期配置
        this.board[3][3] = 'white';
        this.board[3][4] = 'black';
        this.board[4][3] = 'black';
        this.board[4][4] = 'white';
        
        this.currentPlayer = 'black';
        this.gameHistory = [];
        this.gameState = [];
        this.isGameActive = true;
        
        this.updateBoard();
        this.updateGameInfo();
        this.showValidMoves();
    }
    
    bindEvents() {
        // 色選択
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');
                
                const color = e.target.dataset.color;
                this.humanPlayer = color;
                this.computerPlayer = color === 'black' ? 'white' : 'black';
                
                // AIが先手の場合、最初の手を選択できるように
                const aiFirstMoveOption = document.getElementById('aiFirstMoveOption');
                if (color === 'white') {
                    aiFirstMoveOption.style.display = 'block';
                } else {
                    aiFirstMoveOption.style.display = 'none';
                    this.aiFirstMove = null;
                }
            });
        });
        
        // AI最初手選択
        document.querySelectorAll('.first-move-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.first-move-btn').forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');
                this.aiFirstMove = e.target.dataset.move;
            });
        });
        
        // ゲーム開始
        document.getElementById('startGame').addEventListener('click', () => {
            const selectedColor = document.querySelector('.color-btn.selected');
            if (!selectedColor) {
                alert('石の色を選択してください');
                return;
            }
            
            if (this.humanPlayer === 'white' && !this.aiFirstMove) {
                alert('コンピュータの1手目を指定してください');
                return;
            }
            
            this.startGame();
        });
        
        // コントロールボタン
        document.getElementById('undoBtn').addEventListener('click', () => this.undoMove());
        document.getElementById('newGameBtn').addEventListener('click', () => this.showGameSetup());
        document.getElementById('showHistoryBtn').addEventListener('click', () => this.showHistory());
        document.getElementById('closeHistory').addEventListener('click', () => this.hideHistory());
        
        // モーダル外クリック
        document.getElementById('historyModal').addEventListener('click', (e) => {
            if (e.target.id === 'historyModal') {
                this.hideHistory();
            }
        });
    }
    
    startGame() {
        document.getElementById('gameSetup').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'block';
        
        this.resetBoard();
        
        // AIが先手の場合
        if (this.humanPlayer === 'white') {
            setTimeout(() => {
                if (this.aiFirstMove) {
                    const move = this.parseMove(this.aiFirstMove);
                    this.makeMove(move.row, move.col);
                } else {
                    this.makeAIMove();
                }
            }, 500);
        }
    }
    
    showGameSetup() {
        document.getElementById('gameContainer').style.display = 'none';
        document.getElementById('gameSetup').style.display = 'block';
    }
    
    parseMove(moveStr) {
        const col = moveStr.charCodeAt(0) - 65; // A=0, B=1, ...
        const row = parseInt(moveStr[1]) - 1;  // 1=0, 2=1, ...
        return { row, col };
    }
    
    formatMove(row, col) {
        const colStr = String.fromCharCode(65 + col);
        const rowStr = (row + 1).toString();
        return colStr + rowStr;
    }
    
    handleCellClick(row, col) {
        if (!this.isGameActive || this.currentPlayer !== this.humanPlayer) {
            return;
        }
        
        if (this.isValidMove(row, col, this.currentPlayer)) {
            this.makeMove(row, col);
        }
    }
    
    makeMove(row, col) {
        if (!this.isValidMove(row, col, this.currentPlayer)) {
            return false;
        }
        
        // 手を記録
        const moveNotation = this.formatMove(row, col);
        this.gameHistory.push({
            player: this.currentPlayer,
            move: moveNotation,
            row: row,
            col: col
        });
        
        // 石を置く
        this.board[row][col] = this.currentPlayer;
        
        // 挟まれた石をひっくり返す
        const flippedStones = this.flipStones(row, col, this.currentPlayer);
        
        // 表示を更新
        this.updateBoard();
        this.highlightLastMove(row, col);
        
        // プレイヤーを交代
        this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
        
        // ゲーム状態を保存（アンドゥ用）- 棋譜記録と手番交代の後に保存
        this.saveGameState();
        
        // ゲーム状況をチェック
        setTimeout(() => {
            if (this.checkGameEnd()) {
                this.endGame();
                return;
            }
            
            // 次のプレイヤーが打てる手があるかチェック
            if (this.getValidMoves(this.currentPlayer).length === 0) {
                // パス
                this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
                this.gameHistory.push({
                    player: this.currentPlayer === 'black' ? 'white' : 'black',
                    move: 'PASS',
                    row: -1,
                    col: -1
                });
                // パス後のゲーム状態を保存
                this.saveGameState();
                
                if (this.getValidMoves(this.currentPlayer).length === 0) {
                    this.endGame();
                    return;
                }
            }
            
            this.updateGameInfo();
            this.showValidMoves();
            
            // AIのターン
            if (this.currentPlayer === this.computerPlayer && this.isGameActive) {
                this.makeAIMove();
            }
        }, 600);
        
        return true;
    }
    
    async makeAIMove() {
        if (!this.isGameActive) return;
        
        this.showThinking();
        
        try {
            // AIの思考時間を制限
            const startTime = Date.now();
            const bestMove = await this.getBestMove(this.computerPlayer, startTime);
            
            if (bestMove && this.isGameActive) {
                setTimeout(() => {
                    this.hideThinking();
                    this.makeMove(bestMove.row, bestMove.col);
                }, Math.max(500, 1000 - (Date.now() - startTime)));
            } else {
                this.hideThinking();
                // AIがパス
                this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
                this.gameHistory.push({
                    player: this.computerPlayer,
                    move: 'PASS',
                    row: -1,
                    col: -1
                });
                // パス後のゲーム状態を保存
                this.saveGameState();
                this.updateGameInfo();
                this.showValidMoves();
            }
        } catch (error) {
            console.error('AI思考エラー:', error);
            this.hideThinking();
        }
    }
    
    async getBestMove(player, startTime) {
        const validMoves = this.getValidMoves(player);
        if (validMoves.length === 0) return null;
        
        if (validMoves.length === 1) {
            return validMoves[0];
        }
        
        let bestMove = validMoves[0];
        let bestScore = -Infinity;
        
        // 並列で各手を評価
        const movePromises = validMoves.map(async (move) => {
            if (Date.now() - startTime > this.timeLimit) {
                return { move, score: -Infinity };
            }
            
            const boardCopy = this.copyBoard();
            const tempBoard = new OthelloGame();
            tempBoard.board = boardCopy;
            tempBoard.board[move.row][move.col] = player;
            tempBoard.flipStones(move.row, move.col, player);
            
            const score = await this.minimax(
                tempBoard.board, 
                this.maxDepth - 1, 
                false, 
                player, 
                -Infinity, 
                Infinity,
                startTime
            );
            
            return { move, score };
        });
        
        try {
            const results = await Promise.all(movePromises);
            
            for (const result of results) {
                if (result.score > bestScore) {
                    bestScore = result.score;
                    bestMove = result.move;
                }
            }
        } catch (error) {
            console.warn('AI評価でタイムアウト:', error);
        }
        
        return bestMove;
    }
    
    async minimax(board, depth, isMaximizing, player, alpha, beta, startTime) {
        // 時間制限チェック
        if (Date.now() - startTime > this.timeLimit) {
            throw new Error('Time limit exceeded');
        }
        
        if (depth === 0) {
            return this.evaluateBoard(board, player);
        }
        
        const currentPlayer = isMaximizing ? player : (player === 'black' ? 'white' : 'black');
        const validMoves = this.getValidMovesForBoard(board, currentPlayer);
        
        if (validMoves.length === 0) {
            return this.evaluateBoard(board, player);
        }
        
        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of validMoves) {
                const boardCopy = this.copyBoardArray(board);
                boardCopy[move.row][move.col] = currentPlayer;
                this.flipStonesOnBoard(boardCopy, move.row, move.col, currentPlayer);
                
                const eval_ = await this.minimax(boardCopy, depth - 1, false, player, alpha, beta, startTime);
                maxEval = Math.max(maxEval, eval_);
                alpha = Math.max(alpha, eval_);
                
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of validMoves) {
                const boardCopy = this.copyBoardArray(board);
                boardCopy[move.row][move.col] = currentPlayer;
                this.flipStonesOnBoard(boardCopy, move.row, move.col, currentPlayer);
                
                const eval_ = await this.minimax(boardCopy, depth - 1, true, player, alpha, beta, startTime);
                minEval = Math.min(minEval, eval_);
                beta = Math.min(beta, eval_);
                
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }
    
    evaluateBoard(board, player) {
        const opponent = player === 'black' ? 'white' : 'black';
        
        let score = 0;
        
        // 1. 位置による評価
        let positionScore = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (board[row][col] === player) {
                    positionScore += this.positionWeights[row][col];
                } else if (board[row][col] === opponent) {
                    positionScore -= this.positionWeights[row][col];
                }
            }
        }
        score += positionScore;
        
        // 2. モビリティ（着手可能数）による評価
        const playerMobility = this.getValidMovesForBoard(board, player).length;
        const opponentMobility = this.getValidMovesForBoard(board, opponent).length;
        const mobilityScore = (playerMobility - opponentMobility) * 10;
        score += mobilityScore;
        
        // 3. 石数による評価（終盤重視）
        const playerStones = this.countStonesOnBoard(board, player);
        const opponentStones = this.countStonesOnBoard(board, opponent);
        const totalStones = playerStones + opponentStones;
        
        if (totalStones > 50) { // 終盤
            score += (playerStones - opponentStones) * 5;
        }
        
        // 4. 角の評価
        const corners = [[0,0], [0,7], [7,0], [7,7]];
        let cornerScore = 0;
        for (const [row, col] of corners) {
            if (board[row][col] === player) {
                cornerScore += 25;
            } else if (board[row][col] === opponent) {
                cornerScore -= 25;
            }
        }
        score += cornerScore;
        
        return score;
    }
    
    getValidMovesForBoard(board, player) {
        const validMoves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.isValidMoveOnBoard(board, row, col, player)) {
                    validMoves.push({ row, col });
                }
            }
        }
        return validMoves;
    }
    
    isValidMoveOnBoard(board, row, col, player) {
        if (board[row][col] !== null) return false;
        
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        const opponent = player === 'black' ? 'white' : 'black';
        
        for (const [dx, dy] of directions) {
            let x = row + dx;
            let y = col + dy;
            let hasOpponentBetween = false;
            
            while (x >= 0 && x < 8 && y >= 0 && y < 8 && board[x][y] === opponent) {
                hasOpponentBetween = true;
                x += dx;
                y += dy;
            }
            
            if (hasOpponentBetween && x >= 0 && x < 8 && y >= 0 && y < 8 && board[x][y] === player) {
                return true;
            }
        }
        
        return false;
    }
    
    flipStonesOnBoard(board, row, col, player) {
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        const opponent = player === 'black' ? 'white' : 'black';
        
        for (const [dx, dy] of directions) {
            const toFlip = [];
            let x = row + dx;
            let y = col + dy;
            
            while (x >= 0 && x < 8 && y >= 0 && y < 8 && board[x][y] === opponent) {
                toFlip.push([x, y]);
                x += dx;
                y += dy;
            }
            
            if (x >= 0 && x < 8 && y >= 0 && y < 8 && board[x][y] === player && toFlip.length > 0) {
                for (const [flipX, flipY] of toFlip) {
                    board[flipX][flipY] = player;
                }
            }
        }
    }
    
    countStonesOnBoard(board, player) {
        let count = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (board[row][col] === player) {
                    count++;
                }
            }
        }
        return count;
    }
    
    copyBoard() {
        return this.board.map(row => row.slice());
    }
    
    copyBoardArray(board) {
        return board.map(row => row.slice());
    }
    
    isValidMove(row, col, player) {
        if (this.board[row][col] !== null) return false;
        
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        const opponent = player === 'black' ? 'white' : 'black';
        
        for (const [dx, dy] of directions) {
            let x = row + dx;
            let y = col + dy;
            let hasOpponentBetween = false;
            
            while (x >= 0 && x < 8 && y >= 0 && y < 8 && this.board[x][y] === opponent) {
                hasOpponentBetween = true;
                x += dx;
                y += dy;
            }
            
            if (hasOpponentBetween && x >= 0 && x < 8 && y >= 0 && y < 8 && this.board[x][y] === player) {
                return true;
            }
        }
        
        return false;
    }
    
    getValidMoves(player) {
        const validMoves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.isValidMove(row, col, player)) {
                    validMoves.push({ row, col });
                }
            }
        }
        return validMoves;
    }
    
    flipStones(row, col, player) {
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        const opponent = player === 'black' ? 'white' : 'black';
        let totalFlipped = 0;
        
        for (const [dx, dy] of directions) {
            const toFlip = [];
            let x = row + dx;
            let y = col + dy;
            
            while (x >= 0 && x < 8 && y >= 0 && y < 8 && this.board[x][y] === opponent) {
                toFlip.push([x, y]);
                x += dx;
                y += dy;
            }
            
            if (x >= 0 && x < 8 && y >= 0 && y < 8 && this.board[x][y] === player && toFlip.length > 0) {
                for (const [flipX, flipY] of toFlip) {
                    this.board[flipX][flipY] = player;
                    totalFlipped++;
                }
            }
        }
        
        return totalFlipped;
    }
    
    updateBoard() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const stone = this.board[row][col];
            
            cell.innerHTML = '';
            cell.classList.remove('valid-move');
            
            if (stone) {
                const stoneElement = document.createElement('div');
                stoneElement.className = `stone ${stone}`;
                stoneElement.textContent = stone === 'black' ? '⚫' : '⚪';
                cell.appendChild(stoneElement);
            }
        });
    }
    
    highlightLastMove(row, col) {
        // 前のハイライトを削除
        document.querySelectorAll('.stone.last-move').forEach(stone => {
            stone.classList.remove('last-move');
        });
        
        // 最後の手をハイライト
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        const stone = cell.querySelector('.stone');
        if (stone) {
            stone.classList.add('last-move');
        }
        
        // 最後の手の表示
        const lastMoveElement = document.getElementById('lastMove');
        const lastMoveText = document.getElementById('lastMoveText');
        const moveNotation = this.formatMove(row, col);
        const playerName = this.currentPlayer === this.humanPlayer ? 'あなた' : 'コンピュータ';
        
        lastMoveText.textContent = `${playerName}: ${moveNotation}`;
        lastMoveElement.style.display = 'block';
    }
    
    showValidMoves() {
        // 既存のハイライトを削除
        document.querySelectorAll('.cell.valid-move').forEach(cell => {
            cell.classList.remove('valid-move');
        });
        
        if (this.currentPlayer === this.humanPlayer && this.isGameActive) {
            const validMoves = this.getValidMoves(this.currentPlayer);
            validMoves.forEach(move => {
                const cell = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
                cell.classList.add('valid-move');
            });
        }
    }
    
    updateGameInfo() {
        const blackCount = this.countStones('black');
        const whiteCount = this.countStones('white');
        
        document.getElementById('blackCount').textContent = blackCount;
        document.getElementById('whiteCount').textContent = whiteCount;
        
        const turnIndicator = document.getElementById('turnIndicator');
        if (this.isGameActive) {
            if (this.currentPlayer === this.humanPlayer) {
                turnIndicator.textContent = 'あなたのターン';
                turnIndicator.style.color = '#667eea';
            } else {
                turnIndicator.textContent = 'コンピュータのターン';
                turnIndicator.style.color = '#e74c3c';
            }
        }
        
        // アンドゥボタンの状態
        const undoBtn = document.getElementById('undoBtn');
        undoBtn.disabled = this.gameState.length === 0 || !this.isGameActive;
    }
    
    countStones(color) {
        let count = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col] === color) {
                    count++;
                }
            }
        }
        return count;
    }
    
    checkGameEnd() {
        const blackMoves = this.getValidMoves('black').length;
        const whiteMoves = this.getValidMoves('white').length;
        
        return blackMoves === 0 && whiteMoves === 0;
    }
    
    endGame() {
        this.isGameActive = false;
        
        const blackCount = this.countStones('black');
        const whiteCount = this.countStones('white');
        
        let resultText = '';
        if (blackCount > whiteCount) {
            resultText = this.humanPlayer === 'black' ? '🎉 あなたの勝利！' : '💻 コンピュータの勝利';
        } else if (whiteCount > blackCount) {
            resultText = this.humanPlayer === 'white' ? '🎉 あなたの勝利！' : '💻 コンピュータの勝利';
        } else {
            resultText = '🤝 引き分け';
        }
        
        document.getElementById('gameStatus').innerHTML = `
            <strong>ゲーム終了</strong><br>
            ${resultText}<br>
            ⚫ ${blackCount} - ${whiteCount} ⚪
        `;
        
        document.getElementById('turnIndicator').textContent = 'ゲーム終了';
        document.getElementById('turnIndicator').style.color = '#95a5a6';
    }
    
    saveGameState() {
        this.gameState.push({
            board: this.copyBoard(),
            currentPlayer: this.currentPlayer,
            history: [...this.gameHistory]
        });
    }
    
    undoMove() {
        if (this.gameState.length === 0 || !this.isGameActive) return;
        
        // 人間の手とAIの手の両方を戻す
        if (this.gameState.length >= 2 && this.currentPlayer === this.humanPlayer) {
            // AIの手も戻す
            this.gameState.pop();
        }
        
        const previousState = this.gameState.pop();
        this.board = previousState.board;
        this.currentPlayer = previousState.currentPlayer;
        this.gameHistory = previousState.history;
        
        this.updateBoard();
        this.updateGameInfo();
        this.showValidMoves();
        
        // 最後の手のハイライトを更新
        if (this.gameHistory.length > 0) {
            const lastMove = this.gameHistory[this.gameHistory.length - 1];
            if (lastMove.row >= 0 && lastMove.col >= 0) {
                this.highlightLastMove(lastMove.row, lastMove.col);
            }
        } else {
            document.getElementById('lastMove').style.display = 'none';
            document.querySelectorAll('.stone.last-move').forEach(stone => {
                stone.classList.remove('last-move');
            });
        }
    }
    
    showHistory() {
        const historyContent = document.getElementById('historyContent');
        
        if (this.gameHistory.length === 0) {
            historyContent.innerHTML = '<p>まだ手が指されていません。</p>';
        } else {
            let historyHtml = '';
            this.gameHistory.forEach((move, index) => {
                const playerName = move.player === this.humanPlayer ? 'あなた' : 'コンピュータ';
                const stoneSymbol = move.player === 'black' ? '⚫' : '⚪';
                const moveText = move.move === 'PASS' ? 'パス' : move.move;
                
                historyHtml += `
                    <div class="history-move">
                        <strong>${index + 1}.</strong> ${stoneSymbol} ${playerName}: ${moveText}
                    </div>
                `;
            });
            historyContent.innerHTML = historyHtml;
        }
        
        document.getElementById('historyModal').style.display = 'flex';
    }
    
    hideHistory() {
        document.getElementById('historyModal').style.display = 'none';
    }
    
    showThinking() {
        document.getElementById('thinkingIndicator').style.display = 'flex';
    }
    
    hideThinking() {
        document.getElementById('thinkingIndicator').style.display = 'none';
    }
}

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
    new OthelloGame();
});