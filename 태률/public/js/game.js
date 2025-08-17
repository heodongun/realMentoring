// 게임 변수
let socket;
let canvas;
let ctx;
let gameId;
let playerId;
let playerName;
let gameState;
let keyState = {};
let gameActive = false;
let lastRenderTime = 0;

// 게임 초기화 함수
function initGame(id, name) {
    gameId = id;
    playerName = name;
    
    console.log('게임 초기화:', gameId, playerName);
    
    // 캔버스 초기화
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // 디버깅 메시지 표시
    const message = document.getElementById('game-message');
    message.textContent = '서버에 연결 중...';
    message.style.color = '#2196F3';
    
    try {
        // Socket.io 연결
        socket = io();
        
        // 이벤트 리스너 설정
        setupEventListeners();
        
        // 게임 참가
        console.log('게임 참가 요청 전송:', { gameId, playerName });
        socket.emit('joinGame', { gameId, playerName });
        
        // 디버깅용: 서버로부터 게임 상태 요청
        setTimeout(() => {
            if (socket && socket.connected) {
                console.log('게임 상태 요청 중...');
                socket.emit('requestGameState');
            }
        }, 1000);
        
        // 게임 루프 시작
        requestAnimationFrame(gameLoop);
    } catch (error) {
        console.error('소켓 연결 오류:', error);
        message.textContent = '서버 연결 오류. 페이지를 새로고침 해주세요.';
        message.style.color = '#FF0000';
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 키보드 이벤트
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // 게임 시작 버튼
    document.getElementById('start-btn').addEventListener('click', () => {
        socket.emit('startGame');
        document.getElementById('start-btn').disabled = true;
    });
    
    // 게임 나가기 버튼
    document.getElementById('leave-btn').addEventListener('click', () => {
        window.location.href = '/';
    });
    
    // 소켓 이벤트 처리
    socket.on('connect', () => {
        console.log('서버에 연결되었습니다. 소켓 ID:', socket.id);
        const message = document.getElementById('game-message');
        message.textContent = '서버에 연결되었습니다!';
        message.style.color = '#4CAF50';
        
        // 연결 성공 후 게임 참가 요청 재전송
        console.log('연결 성공 후 게임 참가 요청 재전송');
        socket.emit('joinGame', { gameId, playerName });
        
        setTimeout(() => { 
            if (message.textContent === '서버에 연결되었습니다!') {
                message.textContent = ''; 
            }
        }, 3000);
    });
    
    socket.on('connect_error', (error) => {
        console.error('연결 오류:', error);
        const message = document.getElementById('game-message');
        message.textContent = '서버 연결 오류. 페이지를 새로고침 해주세요.';
        message.style.color = '#FF0000';
    });
    
    socket.on('gameState', (state) => {
        console.log('게임 상태 업데이트 받음:', state);
        if (state) {
            gameState = state;
            updatePlayerList();
            
            // 내 플레이어 ID가 없으면 설정
            if (!playerId && socket.id && state.players && state.players[socket.id]) {
                playerId = socket.id;
                console.log('내 플레이어 ID 설정:', playerId);
            }
        }
    });
    
    socket.on('playerJoined', (data) => {
        console.log('플레이어 참가:', data);
        const message = document.getElementById('game-message');
        message.textContent = `${data.player.name}님이 게임에 참가했습니다.`;
        message.style.color = '#4CAF50';
        setTimeout(() => { 
            if (message.textContent === `${data.player.name}님이 게임에 참가했습니다.`) {
                message.textContent = ''; 
            }
        }, 3000);
        
        if (data.player.id === socket.id) {
            playerId = data.player.id;
            console.log('내 플레이어 ID 설정:', playerId);
        }
        
        if (!gameState) {
            gameState = { players: data.players };
        } else {
            gameState.players = data.players;
        }
        updatePlayerList();
    });
    
    socket.on('playerLeft', (data) => {
        console.log('플레이어 퇴장:', data);
        const message = document.getElementById('game-message');
        message.textContent = '플레이어가 게임을 나갔습니다.';
        message.style.color = '#FF5733';
        setTimeout(() => { 
            if (message.textContent === '플레이어가 게임을 나갔습니다.') {
                message.textContent = ''; 
            }
        }, 3000);
        
        if (gameState) {
            gameState.players = data.players;
            updatePlayerList();
        }
    });
    
    socket.on('gameStarted', () => {
        console.log('게임 시작!');
        const message = document.getElementById('game-message');
        message.textContent = '게임이 시작되었습니다!';
        message.style.color = '#4CAF50';
        setTimeout(() => { 
            if (message.textContent === '게임이 시작되었습니다!') {
                message.textContent = ''; 
            }
        }, 3000);
        
        gameActive = true;
        document.getElementById('start-btn').disabled = true;
    });
    
    socket.on('gameOver', (data) => {
        console.log('게임 종료:', data);
        const message = document.getElementById('game-message');
        if (data.winner) {
            message.textContent = `게임 종료! 승자: ${data.winner.name}`;
            message.style.color = '#FFD700';
        } else {
            message.textContent = '게임 종료! 무승부';
            message.style.color = '#2196F3';
        }
        
        // 시작 버튼 활성화
        document.getElementById('start-btn').disabled = false;
        gameActive = false;
    });
    
    socket.on('error', (message) => {
        console.error('서버 오류:', message);
        alert('오류: ' + message);
    });
    
    socket.on('disconnect', () => {
        console.log('서버와 연결이 끊어졌습니다.');
        const message = document.getElementById('game-message');
        message.textContent = '서버와 연결이 끊어졌습니다. 페이지를 새로고침 해주세요.';
        message.style.color = '#FF0000';
    });
}

// 키 다운 이벤트 처리
function handleKeyDown(e) {
    keyState[e.key] = true;
    
    // 방향키 처리
    handleDirectionChange();
    
    // 스페이스바로 게임 시작
    if ((e.key === ' ' || e.code === 'Space') && !gameActive && !document.getElementById('start-btn').disabled) {
        console.log('스페이스바로 게임 시작');
        socket.emit('startGame');
        document.getElementById('start-btn').disabled = true;
    }
    
    // 방향키 이벤트 전파 방지
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Space'].includes(e.key) || 
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
}

// 키 업 이벤트 처리
function handleKeyUp(e) {
    keyState[e.key] = false;
}

// 방향 변경 처리
function handleDirectionChange() {
    if (!gameState || !gameState.players || !playerId || !gameState.players[playerId]) {
        return;
    }
    
    let newDirection = null;
    
    if (keyState['ArrowUp'] || keyState['w'] || keyState['W']) {
        newDirection = 'up';
    } else if (keyState['ArrowDown'] || keyState['s'] || keyState['S']) {
        newDirection = 'down';
    } else if (keyState['ArrowLeft'] || keyState['a'] || keyState['A']) {
        newDirection = 'left';
    } else if (keyState['ArrowRight'] || keyState['d'] || keyState['D']) {
        newDirection = 'right';
    }
    
    if (newDirection) {
        const currentDirection = gameState.players[playerId].direction;
        
        // 반대 방향으로 이동 방지
        if (
            (currentDirection === 'up' && newDirection === 'down') ||
            (currentDirection === 'down' && newDirection === 'up') ||
            (currentDirection === 'left' && newDirection === 'right') ||
            (currentDirection === 'right' && newDirection === 'left')
        ) {
            return;
        }
        
        // 이전 방향과 다를 때만 서버에 전송
        if (currentDirection !== newDirection) {
            console.log('방향 변경:', newDirection);
            socket.emit('changeDirection', newDirection);
        }
    }
}

// 플레이어 목록 업데이트
function updatePlayerList() {
    if (!gameState || !gameState.players) {
        console.log('플레이어 목록 업데이트 실패: 게임 상태 또는 플레이어 정보 없음');
        return;
    }
    
    console.log('플레이어 목록 업데이트:', Object.values(gameState.players));
    const playersList = document.getElementById('players');
    playersList.innerHTML = '';
    
    Object.values(gameState.players).forEach(player => {
        const li = document.createElement('li');
        li.style.color = player.color;
        
        const statusClass = player.alive ? 'status-alive' : 'status-dead';
        const statusText = player.alive ? '생존' : '사망';
        
        li.innerHTML = `
            <span class="player-name">${player.name}</span>
            <span class="player-score">점수: ${player.score}</span>
            <span class="player-status ${statusClass}">${statusText}</span>
        `;
        
        if (player.id === playerId) {
            li.classList.add('current-player');
        }
        
        playersList.appendChild(li);
    });
}

// 게임 렌더링
function renderGame() {
    if (!gameState) return;
    
    // 캔버스 지우기
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 격자 그리기
    drawGrid();
    
    // 음식 그리기
    if (gameState.food && gameState.food.length > 0) {
        gameState.food.forEach(food => {
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(
                food.x + gameState.gridSize/2, 
                food.y + gameState.gridSize/2, 
                gameState.gridSize/2 - 2, 
                0, 
                Math.PI * 2
            );
            ctx.fill();
        });
    }
    
    // 플레이어 그리기
    if (gameState.players) {
        Object.values(gameState.players).forEach(player => {
            if (!player.segments || player.segments.length === 0) return;
            
            // 몸통 그리기
            player.segments.forEach((segment, index) => {
                // 머리는 약간 더 크게 그리기
                if (index === 0) {
                    ctx.fillStyle = lightenColor(player.color, 20);
                    ctx.fillRect(
                        segment.x - 2, 
                        segment.y - 2, 
                        gameState.gridSize + 4, 
                        gameState.gridSize + 4
                    );
                    
                    // 눈 그리기
                    if (player.alive) {
                        ctx.fillStyle = '#000';
                        const eyeSize = 3;
                        const eyeOffset = 5;
                        
                        // 방향에 따라 눈 위치 조정
                        switch(player.direction) {
                            case 'up':
                                ctx.fillRect(segment.x + eyeOffset, segment.y + eyeOffset, eyeSize, eyeSize);
                                ctx.fillRect(segment.x + gameState.gridSize - eyeOffset - eyeSize, segment.y + eyeOffset, eyeSize, eyeSize);
                                break;
                            case 'down':
                                ctx.fillRect(segment.x + eyeOffset, segment.y + gameState.gridSize - eyeOffset - eyeSize, eyeSize, eyeSize);
                                ctx.fillRect(segment.x + gameState.gridSize - eyeOffset - eyeSize, segment.y + gameState.gridSize - eyeOffset - eyeSize, eyeSize, eyeSize);
                                break;
                            case 'left':
                                ctx.fillRect(segment.x + eyeOffset, segment.y + eyeOffset, eyeSize, eyeSize);
                                ctx.fillRect(segment.x + eyeOffset, segment.y + gameState.gridSize - eyeOffset - eyeSize, eyeSize, eyeSize);
                                break;
                            case 'right':
                                ctx.fillRect(segment.x + gameState.gridSize - eyeOffset - eyeSize, segment.y + eyeOffset, eyeSize, eyeSize);
                                ctx.fillRect(segment.x + gameState.gridSize - eyeOffset - eyeSize, segment.y + gameState.gridSize - eyeOffset - eyeSize, eyeSize, eyeSize);
                                break;
                        }
                    }
                } else {
                    // 몸통 부분
                    ctx.fillStyle = player.color;
                    // 둥근 모서리 효과
                    const cornerRadius = Math.min(4, gameState.gridSize / 4);
                    roundRect(
                        ctx,
                        segment.x, 
                        segment.y, 
                        gameState.gridSize, 
                        gameState.gridSize,
                        cornerRadius
                    );
                }
            });
            
            // 플레이어 이름 그리기
            if (player.segments.length > 0) {
                const head = player.segments[0];
                ctx.fillStyle = 'white';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(
                    player.name, 
                    head.x + gameState.gridSize / 2, 
                    head.y - 5
                );
            }
        });
    }
}

// 둥근 사각형 그리기 함수
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

// 격자 그리기
function drawGrid() {
    if (!gameState) return;
    
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    
    const gridSize = gameState.gridSize;
    
    // 수직선
    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // 수평선
    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// 색상 밝게 하는 함수
function lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return '#' + (
        0x1000000 +
        (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)
    ).toString(16).slice(1);
}

// 게임 루프
function gameLoop(timestamp) {
    // 프레임 속도 제한 (60fps)
    if (timestamp - lastRenderTime >= 16) {
        renderGame();
        lastRenderTime = timestamp;
    }
    requestAnimationFrame(gameLoop);
}