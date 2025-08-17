const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const nodemailer = require('nodemailer');
const multer = require('multer'); // 파일 업로드를 위한 라이브러리
const fs = require('fs');
const playwright = require('playwright');
const expressLayouts = require('express-ejs-layouts'); // 레이아웃 추가
const axios = require('axios');
const cheerio = require('cheerio');

// 환경변수 설정
dotenv.config();

// 앱 초기화
const app = express();
const port = process.env.PORT || 3000;

// EJS 템플릿 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Express EJS 레이아웃 설정
app.use(expressLayouts);
app.set('layout', 'layout'); // 기본 레이아웃 설정

// 미들웨어 설정
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // JSON 요청 처리를 위한 미들웨어 추가
app.use(express.static(path.join(__dirname, 'public')));

// 파일 업로드를 위한 디렉토리 생성
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    // 파일명 중복 방지를 위해 타임스탬프 추가
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// 파일 필터링 (이미지 파일만 허용)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB 제한
  }
});

// MongoDB 연결 설정
let db;
const url = process.env.MONGO_URI;

// 데이터베이스 연결
new MongoClient(url).connect()
  .then((client) => {
    console.log('DB 연결 성공');
    db = client.db('animalbook'); // 데이터베이스 이름을 animalbook으로 설정
    
    // DB 연결 후 서버 시작
    app.listen(port, () => {
      console.log(`서버가 http://localhost:${port} 에서 실행 중입니다`);
    });
  })
  .catch((err) => {
    console.log('DB 연결 실패:', err);
  });

// 미들웨어: DB 객체 접근을 위한 등록
app.use((req, res, next) => {
  req.db = db;
  next();
});

// 라우트: 메인 페이지 (전체 동물 사진 목록)
app.get('/', async (req, res) => {
  try {
    // 모든 동물 사진 가져오기
    const animals = await db.collection('animals').find({}).toArray();
    res.render('index', { animals, title: '동물 사진첩' });
  } catch (error) {
    console.error('동물 목록 조회 오류:', error);
    res.status(500).render('error', { message: '서버 오류가 발생했습니다.', title: '오류' });
  }
});

// 라우트: 동물 종류별 필터링
app.get('/animals/:type', async (req, res) => {
  try {
    const animalType = req.params.type;
    // 해당 종류의 동물만 필터링하여 가져오기
    const animals = await db.collection('animals')
      .find({ type: animalType })
      .toArray();
    
    res.render('index', { 
      animals, 
      currentType: animalType,
      title: `${animalType} 사진첩`
    });
  } catch (error) {
    console.error('동물 필터링 오류:', error);
    res.status(500).render('error', { message: '서버 오류가 발생했습니다.', title: '오류' });
  }
});

// 라우트: 새 동물 사진 추가 페이지
app.get('/add', (req, res) => {
  res.render('add', { title: '새 동물 추가' });
});

// 라우트: 새 동물 사진 저장 처리
app.post('/add', upload.single('image'), async (req, res) => {
  try {
    const { name, type, description } = req.body;
    
    // 이미지 파일이 없는 경우 에러 처리
    if (!req.file) {
      return res.status(400).render('error', { message: '이미지 파일을 업로드해주세요.', title: '오류' });
    }
    
    // 업로드된 이미지의 경로
    const imagePath = '/uploads/' + req.file.filename;
    
    // 데이터베이스에 저장
    await db.collection('animals').insertOne({
      name,
      type,
      description,
      imagePath,
      createdAt: new Date()
    });
    
    res.redirect('/');
  } catch (error) {
    console.error('동물 추가 오류:', error);
    res.status(500).render('error', { message: '서버 오류가 발생했습니다.', title: '오류' });
  }
});

// 라우트: 동물 상세 정보 페이지
app.get('/detail/:id', async (req, res) => {
  try {
    const animal = await db.collection('animals').findOne({ 
      _id: new ObjectId(req.params.id) 
    });
    
    if (!animal) {
      return res.status(404).render('error', { message: '해당 동물을 찾을 수 없습니다.', title: '오류' });
    }
    
    res.render('detail', { animal, title: animal.name });
  } catch (error) {
    console.error('동물 상세 조회 오류:', error);
    res.status(500).render('error', { message: '서버 오류가 발생했습니다.', title: '오류' });
  }
});

// 라우트: 동물 정보 수정 페이지
app.get('/edit/:id', async (req, res) => {
  try {
    const animal = await db.collection('animals').findOne({ 
      _id: new ObjectId(req.params.id) 
    });
    
    if (!animal) {
      return res.status(404).render('error', { message: '해당 동물을 찾을 수 없습니다.', title: '오류' });
    }
    
    res.render('edit', { animal, title: `${animal.name} 수정` });
  } catch (error) {
    console.error('동물 수정 페이지 오류:', error);
    res.status(500).render('error', { message: '서버 오류가 발생했습니다.', title: '오류' });
  }
});

// 라우트: 동물 정보 수정 처리
app.post('/edit/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, type, description } = req.body;
    const animalId = req.params.id;
    
    // 기존 동물 정보 가져오기
    const existingAnimal = await db.collection('animals').findOne({ 
      _id: new ObjectId(animalId) 
    });
    
    if (!existingAnimal) {
      return res.status(404).render('error', { message: '해당 동물을 찾을 수 없습니다.', title: '오류' });
    }
    
    // 업데이트할 데이터 객체
    const updateData = {
      name,
      type,
      description,
      updatedAt: new Date()
    };
    
    // 새 이미지가 업로드된 경우에만 이미지 경로 업데이트
    if (req.file) {
      updateData.imagePath = '/uploads/' + req.file.filename;
      
      // 기존 이미지 파일 삭제 (선택적)
      if (existingAnimal.imagePath && !existingAnimal.isExternalImage) {
        const oldImagePath = path.join(__dirname, 'public', existingAnimal.imagePath);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }
    
    // 데이터베이스 업데이트
    await db.collection('animals').updateOne(
      { _id: new ObjectId(animalId) },
      { $set: updateData }
    );
    
    res.redirect(`/detail/${animalId}`);
  } catch (error) {
    console.error('동물 정보 수정 오류:', error);
    res.status(500).render('error', { message: '서버 오류가 발생했습니다.', title: '오류' });
  }
});

// 라우트: 동물 삭제 처리
app.post('/delete/:id', async (req, res) => {
  try {
    const animalId = req.params.id;
    
    // 삭제할 동물 정보 가져오기
    const animal = await db.collection('animals').findOne({ 
      _id: new ObjectId(animalId) 
    });
    
    if (!animal) {
      return res.status(404).render('error', { message: '해당 동물을 찾을 수 없습니다.', title: '오류' });
    }
    
    // 이미지 파일 삭제 (외부 이미지가 아닌 경우에만)
    if (animal.imagePath && !animal.isExternalImage) {
      const imagePath = path.join(__dirname, 'public', animal.imagePath);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    // 데이터베이스에서 동물 정보 삭제
    await db.collection('animals').deleteOne({ _id: new ObjectId(animalId) });
    
    res.redirect('/');
  } catch (error) {
    console.error('동물 삭제 오류:', error);
    res.status(500).render('error', { message: '서버 오류가 발생했습니다.', title: '오류' });
  }
});

// 라우트: 검색 페이지
app.get('/search', async (req, res) => {
  const query = req.query.query;
  
  // 검색어가 없으면 검색 페이지만 표시
  if (!query) {
    return res.render('search', { title: '동물 이미지 검색' });
  }
  
  try {
    // 이미지 크롤링 함수 호출
    const images = await crawlAnimalImages(query);
    
    // 결과 페이지 렌더링
    res.render('search', { 
      title: '동물 이미지 검색', 
      query, 
      images, 
      isSearching: false 
    });
  } catch (error) {
    console.error('이미지 검색 오류:', error);
    res.render('search', { 
      title: '동물 이미지 검색', 
      query, 
      error: '이미지를 검색하는 중 오류가 발생했습니다.', 
      isSearching: false 
    });
  }
});

async function crawlAnimalImages(query) {
    const browser = await playwright['chromium'].launch();
    const page = await browser.newPage();

    // 구글 이미지 검색 페이지로 이동
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`, { waitUntil: 'networkidle' });

    // 페이지를 스크롤하여 더 많은 이미지 로드
    for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, 10000);
        await page.waitForTimeout(1000); // 1초 대기
    }

    // 이미지 URL 추출 (data-src 속성을 가진 이미지 태그를 찾음)
    const imageUrls = await page.$$eval('img', (images) => {
        const urls = [];
        for (let i = 0; i < images.length && urls.length < 20; i++) {
            const url = images[i].getAttribute('src') || images[i].getAttribute('data-src');
            if (url && url.startsWith('http')) {
                urls.push(url);
            }
        }
        return urls;
    });

    await browser.close();
    return imageUrls;
}
// 검색한 동물 저장 라우트
app.post('/save-searched-animal', async (req, res) => {
  try {
    const { name, type, description, imageUrl } = req.body;
    
    // 이미지 URL이 없는 경우 에러 처리
    if (!imageUrl) {
      return res.status(400).render('error', { message: '이미지 URL이 필요합니다.', title: '오류' });
    }
    
    // 데이터베이스에 저장
    await db.collection('animals').insertOne({
      name,
      type,
      description,
      imagePath: imageUrl, // 외부 URL 사용
      isExternalImage: true, // 외부 이미지 표시
      createdAt: new Date()
    });
    
    res.redirect('/');
  } catch (error) {
    console.error('검색 동물 저장 오류:', error);
    res.status(500).render('error', { message: '서버 오류가 발생했습니다.', title: '오류' });
  }
});

// API 라우트: 모든 동물 목록 가져오기
app.get('/api/animals', async (req, res) => {
  try {
    const animals = await db.collection('animals').find({}).toArray();
    res.json(animals);
  } catch (error) {
    console.error('API 동물 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// API 라우트: 특정 동물 정보 가져오기
app.get('/api/animals/:id', async (req, res) => {
  try {
    const animal = await db.collection('animals').findOne({ 
      _id: new ObjectId(req.params.id) 
    });
    
    if (!animal) {
      return res.status(404).json({ error: '해당 동물을 찾을 수 없습니다.' });
    }
    
    res.json(animal);
  } catch (error) {
    console.error('API 동물 상세 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 404 에러 핸들링
app.use((req, res) => {
  res.status(404).render('error', { message: '페이지를 찾을 수 없습니다.', title: '404 오류' });
});

// 오류 처리 미들웨어
app.use((err, req, res, next) => {
  console.error('서버 오류:', err);
  res.status(500).render('error', { message: '서버 오류가 발생했습니다.', title: '서버 오류' });
});