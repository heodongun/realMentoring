# 이메일 주소록 API 명세서

## 기본 정보
- 기본 URL: `http://localhost:3000`
- 데이터베이스: MongoDB (emailbook)
- 인증 방식: 없음 (현재 구현에는 인증 로직이 포함되어 있지 않음)

## API 엔드포인트

### 1. 연락처 관리

#### 1.1 연락처 목록 조회
- **URL**: `/`
- **Method**: `GET`
- **설명**: 모든 연락처를 이름 순으로 정렬하여 조회
- **요청 파라미터**: 없음
- **응답**: 
  - 성공: 200 OK, 연락처 목록이 포함된 HTML 페이지 (contacts.ejs)
  - 실패: 500 Internal Server Error

#### 1.2 연락처 추가 폼
- **URL**: `/add-contact`
- **Method**: `GET`
- **설명**: 새 연락처 추가를 위한 폼 페이지 제공
- **요청 파라미터**: 없음
- **응답**: 
  - 성공: 200 OK, 연락처 추가 폼 HTML 페이지 (add-contact.ejs)

#### 1.3 연락처 추가 처리
- **URL**: `/add-contact`
- **Method**: `POST`
- **설명**: 새 연락처 정보를 저장
- **요청 파라미터**:
  - `name`: 이름 (필수)
  - `email`: 이메일 주소 (필수)
  - `phone`: 전화번호
  - `group`: 그룹
- **응답**: 
  - 성공: 302 Found, 메인 페이지('/')로 리다이렉트
  - 실패: 500 Internal Server Error

#### 1.4 연락처 상세 조회
- **URL**: `/contact/:id`
- **Method**: `GET`
- **설명**: 특정 연락처의 상세 정보 조회
- **URL 파라미터**:
  - `id`: 연락처 ID (MongoDB ObjectId)
- **쿼리 파라미터**:
  - `emailSent`: 이메일 발송 성공 여부 ('true'일 경우 성공 메시지 표시)
- **응답**: 
  - 성공: 200 OK, 연락처 상세 정보 HTML 페이지 (contact-detail.ejs)
  - 실패: 404 Not Found 또는 500 Internal Server Error

#### 1.5 연락처 수정 폼
- **URL**: `/edit-contact/:id`
- **Method**: `GET`
- **설명**: 특정 연락처 정보 수정을 위한 폼 페이지 제공
- **URL 파라미터**:
  - `id`: 연락처 ID (MongoDB ObjectId)
- **응답**: 
  - 성공: 200 OK, 연락처 수정 폼 HTML 페이지 (edit-contact.ejs)
  - 실패: 404 Not Found 또는 500 Internal Server Error

#### 1.6 연락처 수정 처리
- **URL**: `/update-contact/:id`
- **Method**: `POST`
- **설명**: 특정 연락처 정보 업데이트
- **URL 파라미터**:
  - `id`: 연락처 ID (MongoDB ObjectId)
- **요청 파라미터**:
  - `name`: 이름 (필수)
  - `email`: 이메일 주소 (필수)
  - `phone`: 전화번호
  - `group`: 그룹
- **응답**: 
  - 성공: 302 Found, 해당 연락처 상세 페이지('/contact/:id')로 리다이렉트
  - 실패: 500 Internal Server Error

#### 1.7 연락처 삭제 처리
- **URL**: `/delete-contact/:id`
- **Method**: `POST`
- **설명**: 특정 연락처 삭제
- **URL 파라미터**:
  - `id`: 연락처 ID (MongoDB ObjectId)
- **응답**: 
  - 성공: 302 Found, 메인 페이지('/')로 리다이렉트
  - 실패: 500 Internal Server Error

### 2. 이메일 관리

#### 2.1 이메일 작성 폼
- **URL**: `/send-email/:id`
- **Method**: `GET`
- **설명**: 특정 연락처에게 이메일을 보내기 위한 폼 페이지 제공
- **URL 파라미터**:
  - `id`: 연락처 ID (MongoDB ObjectId)
- **응답**: 
  - 성공: 200 OK, 이메일 작성 폼 HTML 페이지 (send-email.ejs)
  - 실패: 404 Not Found 또는 500 Internal Server Error

#### 2.2 이메일 발송 처리
- **URL**: `/send-email/:id`
- **Method**: `POST`
- **설명**: 특정 연락처에게 이메일 발송 및 발송 기록 저장
- **URL 파라미터**:
  - `id`: 연락처 ID (MongoDB ObjectId)
- **요청 파라미터**:
  - `subject`: 이메일 제목 (필수)
  - `message`: 이메일 내용 (필수)
- **응답**: 
  - 성공: 302 Found, 해당 연락처 상세 페이지('/contact/:id?emailSent=true')로 리다이렉트
  - 실패: 404 Not Found 또는 500 Internal Server Error

#### 2.3 이메일 발송 기록 조회
- **URL**: `/email-history`
- **Method**: `GET`
- **설명**: 모든 이메일 발송 기록을 최신순으로 조회
- **요청 파라미터**: 없음
- **응답**: 
  - 성공: 200 OK, 이메일 발송 기록 HTML 페이지 (email-history.ejs)
  - 실패: 500 Internal Server Error

### 3. 그룹 관리

#### 3.1 그룹별 연락처 조회
- **URL**: `/group/:groupName`
- **Method**: `GET`
- **설명**: 특정 그룹에 속한 연락처 목록을 이름 순으로 조회
- **URL 파라미터**:
  - `groupName`: 그룹 이름
- **응답**: 
  - 성공: 200 OK, 그룹별 연락처 목록 HTML 페이지 (group.ejs)
  - 실패: 500 Internal Server Error

## 데이터 모델

### 연락처 (contacts 컬렉션)
```javascript
{
  _id: ObjectId,         // MongoDB 자동 생성 ID
  name: String,          // 이름
  email: String,         // 이메일 주소
  phone: String,         // 전화번호
  group: String,         // 그룹
  createdAt: Date        // 생성 일시
}
```

### 이메일 발송 기록 (emails 컬렉션)
```javascript
{
  _id: ObjectId,         // MongoDB 자동 생성 ID
  contactId: ObjectId,   // 연락처 ID
  contactName: String,   // 연락처 이름
  contactEmail: String,  // 연락처 이메일
  subject: String,       // 이메일 제목
  message: String,       // 이메일 내용
  sentAt: Date           // 발송 일시
}
```

## 환경 변수
이 API를 사용하기 위해서는 다음 환경 변수가 필요합니다:

- `PORT`: 서버 포트 (기본값: 3000)
- `MONGO_URI`: MongoDB 연결 문자열
- `EMAIL_SERVICE`: 이메일 서비스 (예: 'gmail', 기본값: 'gmail')
- `EMAIL_USER`: 이메일 발송에 사용할 계정
- `EMAIL_PASS`: 이메일 계정 비밀번호 또는 앱 비밀번호

## 오류 응답
- `404 Not Found`: 요청한 리소스를 찾을 수 없음
- `500 Internal Server Error`: 서버 내부 오류