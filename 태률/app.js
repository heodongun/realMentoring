const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

// 환경변수 설정
dotenv.config();

// 앱 초기화
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = process.env.PORT || 3000;

// EJS 템플릿 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Express EJS 레이아웃 설정
app.use(expressLayouts);
app.set('layout', 'layout');

// 미들웨어 설정
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 게임 상태 관리
const games = {};
const playerColors = [
  '#FF5733', '#33FF57', '#3357FF', '#F3FF33', 
  '#FF33F3', '#33FFF3', '#F333FF', '#33FF33'
];

// 게임 인터벌 관리
const gameIntervals = {};

// 랜덤 ID 생성 함수
function generateGameId() {
  return Math.random().toString(36).substring(2, 8);
}

// 라우트 설정
app.get('/', (req, res) => {
  res.render('index', { title: '지렁이 게임' });
});

app.get('/game/:id', (req, res) => {
  const gameId = req.params.id;
  if (!games[gameId]) {
    // 게임이 존재하지 않으면 새로 만들기
    games[gameId] = {
      id: gameId,
      players: {},
      food: [],
      active: false,
      width: 800,
      height: 600,
      gridSize: 20
    };
    console.log(`새 게임 생성됨 (URL 접근): ${gameId}`);
  }
  res.render('game', { 
    title: '지렁이 게임 플레이', 
    gameId: gameId 
  });
});

// Socket.io 연결 설정
io.on('connection', (socket) => {
  console.log('새로운 사용자 연결:', socket.id);

  // 게임 생성
  socket.on('createGame', (playerName) => {
    const gameId = generateGameId();
    games[gameId] = {
      id: gameId,
      players: {},
      food: [],
      active: false,
      width: 800,
      height: 600,
      gridSize: 20
    };
    
    console.log(`게임 생성됨: ${gameId}, 생성자: ${playerName}`);
    socket.emit('gameCreated', gameId);
  });

  // 게임 참가
  socket.on('joinGame', (data) => {
    console.log('참가 요청 데이터:', data);
    
    const gameId = data.gameId;
    const playerName = data.playerName || '플레이어_' + socket.id.substr(0, 4);
    
    console.log(`'${playerName}'님이 게임 '${gameId}'에 참가 시도`);
    
    if (!games[gameId]) {
      console.log(`게임 ${gameId}가 존재하지 않아 새로 생성합니다`);
      // 게임이 존재하지 않으면 새로 만들기
      games[gameId] = {
        id: gameId,
        players: {},
        food: [],
        active: false,
        width: 800,
        height: 600,
        gridSize: 20
      };
    }

    const game = games[gameId];
    const playerId = socket.id;
    
    // 이미 이 플레이어가 게임에 참가했는지 확인
    if (game.players[playerId]) {
      console.log(`${playerName}님은 이미 게임에 참가해 있습니다`);
      socket.emit('gameState', game);
      return;
    }
    
    const colorIndex = Object.keys(game.players).length % playerColors.length;

    // 플레이어 초기 위치 및 방향 설정
    const startX = Math.floor(Math.random() * (game.width / game.gridSize - 3)) * game.gridSize;
    const startY = Math.floor(Math.random() * (game.height / game.gridSize - 3)) * game.gridSize;
    
    game.players[playerId] = {
      id: playerId,
      name: playerName,
      color: playerColors[colorIndex],
      segments: [
        { x: startX, y: startY },
        { x: startX - game.gridSize, y: startY },
        { x: startX - game.gridSize * 2, y: startY }
      ],
      direction: 'right',
      score: 0,
      alive: true
    };

    socket.join(gameId);
    socket.gameId = gameId;
    socket.playerId = playerId;
    socket.playerName = playerName;

    console.log(`'${playerName}'님이 게임 '${gameId}'에 참가 성공`);
    console.log('현재 플레이어 수:', Object.keys(game.players).length);
    console.log('플레이어 목록:', Object.keys(game.players).map(id => game.players[id].name));

    // 게임 정보 전송
    io.to(gameId).emit('gameState', game);
    
    // 참가자 정보 전송
    io.to(gameId).emit('playerJoined', { 
      player: game.players[playerId], 
      players: game.players 
    });
    
    // 2명 이상 있고 아직 게임이 시작되지 않았으면 자동 시작
    if (Object.keys(game.players).length >= 2 && !game.active) {
      console.log(`게임 ${gameId} 자동 시작 (${Object.keys(game.players).length}명 참가)`);
      startGame(gameId);
      io.to(gameId).emit('gameStarted');
    }
  });

  // 게임 시작 요청
  socket.on('startGame', () => {
    const gameId = socket.gameId;
    if (!gameId || !games[gameId]) {
      console.log('시작할 게임을 찾을 수 없음:', socket.id);
      return;
    }
    
    if (!games[gameId].active) {
      console.log(`게임 ${gameId} 수동 시작 (요청자: ${socket.playerName || socket.id})`);
      startGame(gameId);
      io.to(gameId).emit('gameStarted');
    } else {
      console.log(`게임 ${gameId}는 이미 진행 중입니다`);
    }
  });

  // 플레이어 방향 변경
  socket.on('changeDirection', (direction) => {
    const gameId = socket.gameId;
    const playerId = socket.playerId;

    if (!gameId || !playerId || !games[gameId] || !games[gameId].players[playerId]) {
      return;
    }

    const player = games[gameId].players[playerId];
    const currentDirection = player.direction;

    // 반대 방향으로의 전환 방지
    if (
      (currentDirection === 'up' && direction === 'down') ||
      (currentDirection === 'down' && direction === 'up') ||
      (currentDirection === 'left' && direction === 'right') ||
      (currentDirection === 'right' && direction === 'left')
    ) {
      return;
    }

    player.direction = direction;
    // 테스트용: 방향 변경 시 즉시 모든 클라이언트에 알림
    io.to(gameId).emit('directionChanged', { playerId, direction });
  });

  // 연결 종료
  socket.on('disconnect', () => {
    const gameId = socket.gameId;
    const playerId = socket.playerId;

    if (gameId && games[gameId] && games[gameId].players[playerId]) {
      const playerName = games[gameId].players[playerId].name;
      console.log(`플레이어 '${playerName}' 연결 종료 (게임: ${gameId})`);
      delete games[gameId].players[playerId];
      
      // 게임 업데이트
      io.to(gameId).emit('playerLeft', { 
        playerId, 
        players: games[gameId].players 
      });
      
      // 모든 플레이어가 나갔을 경우 게임 종료
      if (Object.keys(games[gameId].players).length === 0) {
        console.log(`게임 ${gameId} 종료 (플레이어 없음)`);
        if (gameIntervals[gameId]) {
          clearInterval(gameIntervals[gameId]);
          delete gameIntervals[gameId];
        }
        delete games[gameId];
      }
      // 한 명만 남았고 게임이 활성화된 상태면 승자 처리
      else if (Object.keys(games[gameId].players).length === 1 && games[gameId].active) {
        const lastPlayer = Object.values(games[gameId].players)[0];
        console.log(`게임 ${gameId} 종료 (승자: ${lastPlayer.name})`);
        
        if (gameIntervals[gameId]) {
          clearInterval(gameIntervals[gameId]);
          delete gameIntervals[gameId];
        }
        
        games[gameId].active = false;
        io.to(gameId).emit('gameOver', { winner: lastPlayer });
      }
    }
  });
  
  // 디버깅 요청 - 현재 게임 상태 요청
  socket.on('requestGameState', () => {
    const gameId = socket.gameId;
    if (gameId && games[gameId]) {
      console.log(`${socket.id}에서 게임 상태 요청, 게임 ID: ${gameId}`);
      socket.emit('gameState', games[gameId]);
    } else {
      console.log(`${socket.id}에서 게임 상태 요청, 하지만 게임이 없습니다. gameId: ${gameId}`);
      
      // 소켓에 gameId가 있지만 games 객체에 없는 경우, 새로 생성
      if (gameId) {
        console.log(`게임 ${gameId}를 다시 생성합니다`);
        games[gameId] = {
          id: gameId,
          players: {},
          food: [],
          active: false,
          width: 800,
          height: 600,
          gridSize: 20
        };
        
        // 게임 참가 요청 재시도 유도
        socket.emit('error', '게임을 다시 생성했습니다. 새로고침 해주세요.');
      } else {
        socket.emit('error', '게임을 찾을 수 없습니다');
      }
    }
  });
});

// 게임 시작 함수
function startGame(gameId) {
  if (!games[gameId]) {
    console.log(`시작할 게임 ${gameId}를 찾을 수 없습니다`);
    return;
  }
  
  const game = games[gameId];
  game.active = true;
  
  // 음식 생성
  generateFood(game);
  console.log(`게임 ${gameId}에 음식 생성됨:`, game.food);
  
  // 기존 인터벌 제거
  if (gameIntervals[gameId]) {
    clearInterval(gameIntervals[gameId]);
  }
  
  // 게임 루프 시작
  console.log(`게임 ${gameId} 루프 시작`);
  gameIntervals[gameId] = setInterval(() => {
    if (!games[gameId]) {
      console.log(`게임 ${gameId}가 존재하지 않아 루프 종료`);
      clearInterval(gameIntervals[gameId]);
      delete gameIntervals[gameId];
      return;
    }
    
    updateGame(game);
    io.to(gameId).emit('gameState', game);
    
    // 게임 종료 조건 확인
    const alivePlayers = Object.values(game.players).filter(player => player.alive);
    if (alivePlayers.length <= 1 && Object.keys(game.players).length > 1) {
      const winner = alivePlayers.length === 1 ? alivePlayers[0] : null;
      console.log(`게임 ${gameId} 종료 (승자: ${winner ? winner.name : '없음'})`);
      
      clearInterval(gameIntervals[gameId]);
      delete gameIntervals[gameId];
      game.active = false;
      
      io.to(gameId).emit('gameOver', { winner });
    }
  }, 200); // 게임 업데이트 간격 (밀리초) - 속도를 약간 늦춤
}

// 음식 생성 함수
function generateFood(game) {
  const foodCount = Math.max(1, Object.keys(game.players).length);
  
  game.food = [];
  for (let i = 0; i < foodCount; i++) {
    game.food.push({
      x: Math.floor(Math.random() * (game.width / game.gridSize)) * game.gridSize,
      y: Math.floor(Math.random() * (game.height / game.gridSize)) * game.gridSize
    });
  }
}

// 게임 상태 업데이트 함수
function updateGame(game) {
  // 각 플레이어 업데이트
  Object.values(game.players).forEach(player => {
    if (!player.alive) return;
    
    const head = { ...player.segments[0] };
    
    // 방향에 따른 이동
    switch (player.direction) {
      case 'up':
        head.y -= game.gridSize;
        break;
      case 'down':
        head.y += game.gridSize;
        break;
      case 'left':
        head.x -= game.gridSize;
        break;
      case 'right':
        head.x += game.gridSize;
        break;
    }
    
    // 벽과 충돌 체크
    if (
      head.x < 0 || 
      head.x >= game.width || 
      head.y < 0 || 
      head.y >= game.height
    ) {
      player.alive = false;
      console.log(`플레이어 ${player.name} 사망 (벽과 충돌)`);
      return;
    }
    
    // 자기 자신과 충돌 체크 (머리와 몸통 부분만)
    for (let i = 1; i < player.segments.length; i++) {
      const segment = player.segments[i];
      if (segment.x === head.x && segment.y === head.y) {
        player.alive = false;
        console.log(`플레이어 ${player.name} 사망 (자기 자신과 충돌)`);
        return;
      }
    }
    
    // 다른 플레이어와 충돌 체크
    for (const otherPlayer of Object.values(game.players)) {
      if (otherPlayer.id === player.id || !otherPlayer.alive) continue;
      
      if (otherPlayer.segments.some(segment => segment.x === head.x && segment.y === head.y)) {
        player.alive = false;
        console.log(`플레이어 ${player.name} 사망 (${otherPlayer.name}와 충돌)`);
        return;
      }
    }
    
    // 새 머리 추가
    player.segments.unshift(head);
    
    // 음식 체크
    const foodIndex = game.food.findIndex(food => food.x === head.x && food.y === head.y);
    if (foodIndex !== -1) {
      // 음식 먹었을 때 점수 증가
      player.score += 10;
      console.log(`플레이어 ${player.name} 음식 획득, 점수: ${player.score}`);
      
      // 음식 재생성
      game.food.splice(foodIndex, 1);
      game.food.push({
        x: Math.floor(Math.random() * (game.width / game.gridSize)) * game.gridSize,
        y: Math.floor(Math.random() * (game.height / game.gridSize)) * game.gridSize
      });
    } else {
      // 음식을 먹지 않았다면 꼬리 제거
      player.segments.pop();
    }
  });
}

// 서버 시작
server.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 에서 실행 중입니다`);
});