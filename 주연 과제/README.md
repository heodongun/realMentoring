# 동물 사진첩 애플리케이션

이 프로젝트는 사용자가 동물 사진을 저장, 조회, 수정, 삭제할 수 있는 웹 애플리케이션입니다.

## 기능

- 동물 사진 및 정보 등록
- 동물 목록 조회 (전체 또는 동물 종류별)
- 동물 상세 정보 조회
- 동물 정보 수정
- 동물 정보 삭제
- 이미지 업로드 및 관리

## 기술 스택

- **프론트엔드**: HTML, CSS, JavaScript, Bootstrap 5, EJS
- **백엔드**: Node.js, Express.js
- **데이터베이스**: MongoDB
- **파일 업로드**: Multer
- **기타**: Nodemailer (향후 기능 확장용)

## 시작하기

### 사전 요구사항

- Node.js (v14 이상)
- MongoDB (로컬 또는 MongoDB Atlas)

### 설치

1. 저장소를 클론합니다.
   ```bash
   git clone https://github.com/yourusername/animal-photo-album.git
   cd animal-photo-album
   ```

2. 의존성 패키지를 설치합니다.
   ```bash
   npm install
   ```

3. `.env.example` 파일을 복사하여 `.env` 파일을 생성하고 필요한 환경 변수를 설정합니다.
   ```bash
   cp .env.example .env
   ```

4. 애플리케이션을 실행합니다.
   ```bash
   npm start
   ```

5. 개발 모드로 실행하려면 다음 명령어를 사용합니다.
   ```bash
   npm run dev
   ```

### 접속

웹 브라우저에서 `http://localhost:3000`으로 접속하여 애플리케이션을 사용할 수 있습니다.

## 프로젝트 구조

```
animal-photo-album/
├── app.js                # 애플리케이션 메인 파일
├── package.json          # 프로젝트 의존성 관리
├── .env                  # 환경 변수 (git에 포함되지 않음)
├── .env.example          # 환경 변수 예제
├── .gitignore            # git 무시 파일 목록
├── public/               # 정적 파일
│   ├── css/              # CSS 파일
│   ├── js/               # JavaScript 파일
│   └── uploads/          # 업로드된 이미지 파일
└── views/                # EJS 템플릿 파일
    ├── layout.ejs        # 공통 레이아웃
    ├── index.ejs         # 메인 페이지
    ├── add.ejs           # 동물 추가 페이지
    ├── detail.ejs        # 동물 상세 페이지
    ├── edit.ejs          # 동물 수정 페이지
    └── error.ejs         # 오류 페이지
```

## API 명세

RESTful API를 통해 동물 정보에 접근할 수 있습니다. 자세한 내용은 API.md 파일을 참조하세요.

## 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다.