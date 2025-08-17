const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const nodemailer = require('nodemailer');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const expressLayouts = require('express-ejs-layouts');

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
app.set('layout', 'layout');

// 미들웨어 설정
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
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
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB 제한
});

// MongoDB 연결 설정
let db;
const url = process.env.MONGO_URI;

// 데이터베이스 연결
new MongoClient(url).connect()
  .then((client) => {
    console.log('DB 연결 성공');
    db = client.db('moviereview'); // 데이터베이스 이름 설정
    
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

// 라우트: 메인 페이지 (영화 목록)
app.get('/', async (req, res) => {
  try {
    const movies = await db.collection('movies').find({}).sort({ createdAt: -1 }).toArray();
    res.render('index', { movies, title: '영화 리뷰 사이트' });
  } catch (error) {
    console.error('영화 목록 조회 오류:', error);
    res.status(500).render('error', { message: '서버 오류가 발생했습니다.', title: '오류' });
  }
});

// 라우트: 영화 상세 정보 및 리뷰 페이지
app.get('/movie/:id', async (req, res) => {
  try {
    const movie = await db.collection('movies').findOne({ _id: new ObjectId(req.params.id) });
    if (!movie) {
      return res.status(404).render('error', { message: '해당 영화를 찾을 수 없습니다.', title: '오류' });
    }
    
    // 영화에 대한 리뷰 목록 가져오기
    const reviews = await db.collection('reviews')
      .find({ movieId: req.params.id })
      .sort({ createdAt: -1 })
      .toArray();
    
    res.render('movie-detail', { movie, reviews, title: movie.title });
  } catch (error) {
    console.error('영화 상세 조회 오류:', error);
    res.status(500).render('error', { message: '서버 오류가 발생했습니다.', title: '오류' });
  }
});

// 라우트: 새 영화 추가 페이지
app.get('/add-movie', (req, res) => {
  res.render('add-movie', { title: '새 영화 추가' });
});

// 라우트: 새 영화 저장 처리
app.post('/add-movie', upload.single('poster'), async (req, res) => {
  try {
    const { title, director, year, genre, synopsis } = req.body;
    
    // 업로드된 이미지의 경로
    let posterPath = null;
    let isExternalPoster = false;
    
    if (req.file) {
      posterPath = '/uploads/' + req.file.filename;
    } else if (req.body.posterUrl) {
      posterPath = req.body.posterUrl;
      isExternalPoster = true;
    }
    
    // 데이터베이스에 저장
    const result = await db.collection('movies').insertOne({
      title,
      director,
      year: parseInt(year),
      genre,
      synopsis,
      posterPath,
      isExternalPoster,
      rating: 0, // 초기 평점
      reviewCount: 0, // 초기 리뷰 수
      createdAt: new Date()
    });
    
    res.redirect(`/movie/${result.insertedId}`);
  } catch (error) {
    console.error('영화 추가 오류:', error);
    res.status(500).render('error', { message: '서버 오류가 발생했습니다.', title: '오류' });
  }
});

// 라우트: 영화 정보 수정 페이지
app.get('/edit-movie/:id', async (req, res) => {
  try {
    const movie = await db.collection('movies').findOne({ _id: new ObjectId(req.params.id) });
    if (!movie) {
      return res.status(404).render('error', { message: '해당 영화를 찾을 수 없습니다.', title: '오류' });
    }
    
    res.render('edit-movie', { movie, title: `${movie.title} 수정` });
  } catch (error) {
    console.error('영화 수정 페이지 오류:', error);
    res.status(500).render('error', { message: '서버 오류가 발생했습니다.', title: '오류' });
  }
});

// 라우트: 영화 정보 수정 처리
app.post('/edit-movie/:id', upload.single('poster'), async (req, res) => {
  try {
    const { title, director, year, genre, synopsis } = req.body;
    const movieId = req.params.id;
    
    // 기존 영화 정보 가져오기
    const existingMovie = await db.collection('movies').findOne({ _id: new ObjectId(movieId) });
    if (!existingMovie) {
      return res.status(404).render('error', { message: '해당 영화를 찾을 수 없습니다.', title: '오류' });
    }
    
    // 업데이트할 데이터 객체
    const updateData = {
      title,
      director,
      year: parseInt(year),
      genre,
      synopsis,
      updatedAt: new Date()
    };
    
    // 새 포스터가 업로드된 경우에만 포스터 경로 업데이트
    if (req.file) {
      updateData.posterPath = '/uploads/' + req.file.filename;
      updateData.isExternalPoster = false;
      
      // 기존 이미지 파일 삭제 (외부 이미지가 아닌 경우에만)
      if (existingMovie.posterPath && !existingMovie.isExternalPoster) {
        const oldPosterPath = path.join(__dirname, 'public', existingMovie.posterPath);
        if (fs.existsSync(oldPosterPath)) {
          fs.unlinkSync(oldPosterPath);
        }
      }
    } else if (req.body.posterUrl) {
      updateData.posterPath = req.body.posterUrl;
      updateData.isExternalPoster = true;
    }
    
    // 데이터베이스 업데이트
    await db.collection('movies').updateOne(
      { _id: new ObjectId(movieId) },
      { $set: updateData }
    );
    
    res.redirect(`/movie/${movieId}`);
  } catch (error) {
    console.error('영화 정보 수정 오류:', error);
    res.status(500).render('error', { message: '서버 오류가 발생했습니다.', title: '오류' });
  }
});

// 라우트: 영화 삭제 처리
app.post('/delete-movie/:id', async (req, res) => {
  try {
    const movieId = req.params.id;
    
    // 삭제할 영화 정보 가져오기
    const movie = await db.collection('movies').findOne({ _id: new ObjectId(movieId) });
    if (!movie) {
      return res.status(404).render('error', { message: '해당 영화를 찾을 수 없습니다.', title: '오류' });
    }
    
    // 포스터 이미지 파일 삭제 (외부 이미지가 아닌 경우에만)
    if (movie.posterPath && !movie.isExternalPoster) {
      const posterPath = path.join(__dirname, 'public', movie.posterPath);
      if (fs.existsSync(posterPath)) {
        fs.unlinkSync(posterPath);
      }
    }
    
    // 영화에 대한 모든 리뷰 삭제
    await db.collection('reviews').deleteMany({ movieId: movieId });
    
    // 데이터베이스에서 영화 정보 삭제
    await db.collection('movies').deleteOne({ _id: new ObjectId(movieId) });
    
    res.redirect('/');
  } catch (error) {
    console.error('영화 삭제 오류:', error);
    res.status(500).render('error', { message: '서버 오류가 발생했습니다.', title: '오류' });
  }
});

// 라우트: 리뷰 추가 처리
app.post('/add-review/:movieId', async (req, res) => {
  try {
    const { author, content, rating } = req.body;
    const movieId = req.params.movieId;
    const numericRating = parseFloat(rating);
    
    // 영화 정보 확인
    const movie = await db.collection('movies').findOne({ _id: new ObjectId(movieId) });
    if (!movie) {
      return res.status(404).render('error', { message: '해당 영화를 찾을 수 없습니다.', title: '오류' });
    }
    
    // 리뷰 저장
    await db.collection('reviews').insertOne({
      movieId,
      author,
      content,
      rating: numericRating,
      createdAt: new Date()
    });
    
    // 영화의 평점과 리뷰 수 업데이트
    const allReviews = await db.collection('reviews').find({ movieId }).toArray();
    const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
    const avgRating = totalRating / allReviews.length;
    
    await db.collection('movies').updateOne(
      { _id: new ObjectId(movieId) },
      { 
        $set: { rating: avgRating.toFixed(1) },
        $inc: { reviewCount: 1 }
      }
    );
    
    res.redirect(`/movie/${movieId}`);
  } catch (error) {
    console.error('리뷰 추가 오류:', error);
    res.status(500).render('error', { message: '서버 오류가 발생했습니다.', title: '오류' });
  }
});

// 라우트: 리뷰 삭제 처리
app.post('/delete-review/:reviewId', async (req, res) => {
  try {
    const reviewId = req.params.reviewId;
    
    // 삭제할 리뷰 정보 가져오기
    const review = await db.collection('reviews').findOne({ _id: new ObjectId(reviewId) });
    if (!review) {
      return res.status(404).render('error', { message: '해당 리뷰를 찾을 수 없습니다.', title: '오류' });
    }
    
    const movieId = review.movieId;
    
    // 데이터베이스에서 리뷰 삭제
    await db.collection('reviews').deleteOne({ _id: new ObjectId(reviewId) });
    
    // 영화의 평점과 리뷰 수 업데이트
    const remainingReviews = await db.collection('reviews').find({ movieId }).toArray();
    let avgRating = 0;
    
    if (remainingReviews.length > 0) {
      const totalRating = remainingReviews.reduce((sum, review) => sum + review.rating, 0);
      avgRating = totalRating / remainingReviews.length;
    }
    
    await db.collection('movies').updateOne(
      { _id: new ObjectId(movieId) },
      { 
        $set: { rating: avgRating.toFixed(1) },
        $inc: { reviewCount: -1 }
      }
    );
    
    res.redirect(`/movie/${movieId}`);
  } catch (error) {
    console.error('리뷰 삭제 오류:', error);
    res.status(500).render('error', { message: '서버 오류가 발생했습니다.', title: '오류' });
  }
});

// 라우트: 영화 크롤링 페이지
app.get('/crawl-movies', (req, res) => {
  res.render('crawl-movies', { title: '영화 크롤링' });
});

// 라우트: 영화 크롤링 실행
app.post('/crawl-movies', async (req, res) => {
  try {
    const { source, keyword } = req.body;
    
    // 크롤링 소스에 따라 다른 크롤링 함수 호출
    let movies = [];
    
    if (source === 'naver') {
      movies = await crawlNaverMovies(keyword);
    } else if (source === 'imdb') {
      movies = await crawlIMDBMovies(keyword);
    }
    
    res.render('crawl-results', {
      title: '크롤링 결과',
      movies,
      keyword
    });
  } catch (error) {
    console.error('영화 크롤링 오류:', error);
    res.status(500).render('error', { message: '크롤링 중 오류가 발생했습니다.', title: '오류' });
  }
});

// 라우트: 크롤링된 영화 저장
app.post('/save-crawled-movie', async (req, res) => {
  try {
    const { title, director, year, genre, synopsis, posterUrl } = req.body;
    
    // 중복 영화 확인
    const existingMovie = await db.collection('movies').findOne({ title, director });
    
    if (existingMovie) {
      return res.status(400).render('error', { 
        message: '이미 등록된 영화입니다.',
        title: '중복 오류'
      });
    }
    
    // 데이터베이스에 저장
    const result = await db.collection('movies').insertOne({
      title,
      director,
      year: parseInt(year || '0'),
      genre,
      synopsis,
      posterPath: posterUrl,
      isExternalPoster: true,
      rating: 0,
      reviewCount: 0,
      createdAt: new Date()
    });
    
    res.redirect(`/movie/${result.insertedId}`);
  } catch (error) {
    console.error('크롤링 영화 저장 오류:', error);
    res.status(500).render('error', { message: '서버 오류가 발생했습니다.', title: '오류' });
  }
});

// 영화 검색 기능
app.get('/search', async (req, res) => {
  try {
    const query = req.query.query;
    
    if (!query) {
      return res.render('search', { title: '영화 검색', movies: [] });
    }
    
    // 제목, 감독, 장르로 검색
    const movies = await db.collection('movies').find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { director: { $regex: query, $options: 'i' } },
        { genre: { $regex: query, $options: 'i' } }
      ]
    }).toArray();
    
    res.render('search', { title: '영화 검색', movies, query });
  } catch (error) {
    console.error('영화 검색 오류:', error);
    res.status(500).render('error', { message: '서버 오류가 발생했습니다.', title: '오류' });
  }
});

// 네이버 영화 크롤링 함수
async function crawlNaverMovies(keyword) {
  try {
    const encodedKeyword = encodeURIComponent(keyword);
    const url = `https://search.naver.com/search.naver?where=nexearch&sm=top_hty&fbm=0&ie=utf8&query=${encodedKeyword}+영화`;
    
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    const movies = [];
    
    // 네이버 검색 결과에서 영화 정보 추출
    $('.card_item').each((index, element) => {
      if (index >= 10) return false; // 최대 10개만 가져오기
      
      const title = $(element).find('.title_area .name').text().trim();
      if (!title) return; // 제목이 없으면 건너뛰기
      
      const posterUrl = $(element).find('.thumb_area img').attr('src');
      
      // 감독, 년도, 장르 정보 추출
      let director = '';
      let year = '';
      let genre = '';
      
      $(element).find('.info_group .info').each((i, el) => {
        const text = $(el).text().trim();
        if (text.includes('감독')) {
          director = text.replace('감독', '').trim();
        } else if (text.match(/\d{4}/)) {
          year = text.match(/\d{4}/)[0];
        } else if (!text.includes('출연') && !text.includes('감독')) {
          genre = text;
        }
      });
      
      // 줄거리 정보 추출
      const synopsis = $(element).find('.desc').text().trim();
      
      movies.push({
        title,
        director,
        year,
        genre,
        synopsis,
        posterUrl
      });
    });
    
    return movies;
  } catch (error) {
    console.error('네이버 영화 크롤링 오류:', error);
    throw error;
  }
}

// IMDB 영화 크롤링 함수
async function crawlIMDBMovies(keyword) {
  try {
    const encodedKeyword = encodeURIComponent(keyword);
    const url = `https://www.imdb.com/find/?q=${encodedKeyword}`;
    
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    const movies = [];
    let movieCount = 0;
    
    // IMDB 검색 결과에서 영화 목록 추출
    $('.find-result-item').each(async (index, element) => {
      if (movieCount >= 10) return false; // 최대 10개만 가져오기
      
      const titleElement = $(element).find('.ipc-metadata-list-summary-item__t');
      const title = titleElement.text().trim();
      
      // 영화만 선택 (다른 결과 제외)
      const category = $(element).find('.ipc-metadata-list-summary-item__tl').text().trim();
      if (!category.includes('Movie')) return;
      
      movieCount++;
      
      const posterUrl = $(element).find('img').attr('src') || '';
      
      // 년도 추출
      const yearMatch = $(element).find('.ipc-metadata-list-summary-item__st').text().match(/\d{4}/);
      const year = yearMatch ? yearMatch[0] : '';
      
      // 상세 정보가 없어서 기본값 설정
      const director = '';
      const genre = '';
      const synopsis = '';
      
      movies.push({
        title,
        director,
        year,
        genre,
        synopsis,
        posterUrl
      });
    });
    
    return movies;
  } catch (error) {
    console.error('IMDB 영화 크롤링 오류:', error);
    throw error;
  }
}

// 404 에러 핸들링
app.use((req, res) => {
  res.status(404).render('error', { message: '페이지를 찾을 수 없습니다.', title: '404 오류' });
});

// 오류 처리 미들웨어
app.use((err, req, res, next) => {
  console.error('서버 오류:', err);
  res.status(500).render('error', { message: '서버 오류가 발생했습니다.', title: '서버 오류' });
});