const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');

const nodemailer = require('nodemailer'); // 이메일 발송을 위한 라이브러리 추가

// 앱 초기화
const app = express();
const port = process.env.PORT || 3000;

// EJS 템플릿 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 미들웨어 설정
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB 연결 설정
dotenv.config();
let db;
const url = process.env.MONGO_URI;

new MongoClient(url).connect().then((client) => {
  console.log('DB 연결 성공');
  db = client.db('emailbook'); // 데이터베이스 이름을 emailbook으로 변경

  // DB 연결 후 서버 시작
  app.listen(port, () => {
    console.log(`서버가 http://localhost:${port} 에서 실행 중입니다`);
  });
}).catch((err) => {
  console.log('DB 연결 실패:', err);
});

// 미들웨어: DB 객체 접근을 위한 등록
app.use((req, res, next) => {
  req.db = db;
  next();
});

// 이메일 전송 설정
const createTransporter = () => {
  // 실제 사용 시 .env 파일에 이메일 서비스 정보를 저장하는 것이 좋습니다
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// 라우트: 메인 페이지 (이메일 주소록 목록)
app.get('/', async (req, res) => {
  try {
    const contacts = await db.collection('contacts').find().sort({ name: 1 }).toArray();
    res.render('contacts', { contacts });
  } catch (error) {
    console.error('이메일 주소록 조회 오류:', error);
    res.status(500).send('서버 오류가 발생했습니다.');
  }
});

// 라우트: 연락처 추가 폼
app.get('/add-contact', (req, res) => {
  res.render('add-contact');
});

// 라우트: 연락처 저장 처리
app.post('/add-contact', async (req, res) => {
  try {
    const { name, email, phone, group } = req.body;
    const contact = {
      name,
      email,
      phone,
      group,
      createdAt: new Date()
    };
    await db.collection('contacts').insertOne(contact);
    res.redirect('/');
  } catch (error) {
    console.error('연락처 저장 오류:', error);
    res.status(500).send('서버 오류가 발생했습니다.');
  }
});

// 라우트: 연락처 상세 보기
app.get('/contact/:id', async (req, res) => {
  try {
    const contact = await db.collection('contacts').findOne({ _id: new ObjectId(req.params.id) });
    if (!contact) {
      return res.status(404).send('연락처를 찾을 수 없습니다.');
    }
    res.render('contact-detail', {
      contact,
      emailSent: req.query.emailSent === 'true'
    });
  } catch (error) {
    console.error('연락처 상세 조회 오류:', error);
    res.status(500).send('서버 오류가 발생했습니다.');
  }
});

// 라우트: 연락처 수정 폼
app.get('/edit-contact/:id', async (req, res) => {
  try {
    const contact = await db.collection('contacts').findOne({ _id: new ObjectId(req.params.id) });
    if (!contact) {
      return res.status(404).send('연락처를 찾을 수 없습니다.');
    }
    res.render('edit-contact', { contact });
  } catch (error) {
    console.error('연락처 수정 폼 조회 오류:', error);
    res.status(500).send('서버 오류가 발생했습니다.');
  }
});

// 라우트: 연락처 수정 처리
app.post('/update-contact/:id', async (req, res) => {
  try {
    const { name, email, phone, group } = req.body;
    await db.collection('contacts').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { name, email, phone, group } }
    );
    res.redirect('/contact/' + req.params.id);
  } catch (error) {
    console.error('연락처 수정 오류:', error);
    res.status(500).send('서버 오류가 발생했습니다.');
  }
});

// 라우트: 연락처 삭제 처리
app.post('/delete-contact/:id', async (req, res) => {
  try {
    await db.collection('contacts').deleteOne({ _id: new ObjectId(req.params.id) });
    res.redirect('/');
  } catch (error) {
    console.error('연락처 삭제 오류:', error);
    res.status(500).send('서버 오류가 발생했습니다.');
  }
});

// 라우트: 이메일 작성 폼
app.get('/send-email/:id', async (req, res) => {
  try {
    const contact = await db.collection('contacts').findOne({ _id: new ObjectId(req.params.id) });
    if (!contact) {
      return res.status(404).send('연락처를 찾을 수 없습니다.');
    }
    res.render('send-email', { contact });
  } catch (error) {
    console.error('이메일 폼 조회 오류:', error);
    res.status(500).send('서버 오류가 발생했습니다.');
  }
});

// 라우트: 이메일 발송 처리
app.post('/send-email/:id', async (req, res) => {
  try {
    const { subject, message } = req.body;
    const contact = await db.collection('contacts').findOne({ _id: new ObjectId(req.params.id) });

    if (!contact) {
      return res.status(404).send('연락처를 찾을 수 없습니다.');
    }


    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: contact.email,
      subject: subject,
      text: message
    });

    // 이메일 발송 기록 저장
    await db.collection('emails').insertOne({
      contactId: contact._id,
      contactName: contact.name,
      contactEmail: contact.email,
      subject,
      message,
      sentAt: new Date()
    });

    res.redirect('/contact/' + req.params.id + '?emailSent=true');
  } catch (error) {
    console.error('이메일 발송 오류:', error);
    res.status(500).send('이메일 발송 중 오류가 발생했습니다.');
  }
});

// 라우트: 그룹별 연락처 보기
app.get('/group/:groupName', async (req, res) => {
  try {
    const groupName = req.params.groupName;
    const contacts = await db.collection('contacts')
      .find({ group: groupName })
      .sort({ name: 1 })
      .toArray();

    res.render('group', { contacts, groupName });
  } catch (error) {
    console.error('그룹별 연락처 조회 오류:', error);
    res.status(500).send('서버 오류가 발생했습니다.');
  }
});

// 라우트: 이메일 발송 기록 보기
app.get('/email-history', async (req, res) => {
  try {
    const emails = await db.collection('emails')
      .find()
      .sort({ sentAt: -1 })
      .toArray();

    res.render('email-history', { emails });
  } catch (error) {
    console.error('이메일 기록 조회 오류:', error);
    res.status(500).send('서버 오류가 발생했습니다.');
  }
});

// 404 처리
app.use((req, res) => {
  res.status(404).send('페이지를 찾을 수 없습니다.');
});