# 동물 사진첩 API 명세서

이 문서는 동물 사진첩 애플리케이션의 API 엔드포인트에 대한 상세 정보를 제공합니다.

## 기본 URL

모든 API 요청의 기본 URL은 다음과 같습니다:
```
http://localhost:3000/api
```

## 인증

현재 버전에서는 별도의 인증이 필요하지 않습니다.

## 응답 형식

모든 응답은 JSON 형식으로 반환됩니다.

## 엔드포인트

### 1. 모든 동물 목록 조회

- **URL**: `/animals`
- **Method**: GET
- **URL 파라미터**: 없음
- **쿼리 파라미터**: 없음
- **성공 응답**:
  - **코드**: 200 OK
  - **내용**: 동물 객체 배열
    ```json
    [
      {
        "_id": "60d21b4667d0d8992e610c85",
        "name": "멍멍이",
        "type": "강아지",
        "description": "귀여운 골든 리트리버입니다.",
        "imagePath": "/uploads/1624287046-dog.jpg",
        "createdAt": "2023-08-10T12:34:56.789Z"
      },
      ...
    ]
    ```
- **오류 응답**:
  - **코드**: 500 Internal Server Error
  - **내용**: 
    ```json
    {
      "error": "서버 오류가 발생했습니다."
    }
    ```

### 2. 특정 동물 정보 조회

- **URL**: `/animals/:id`
- **Method**: GET
- **URL 파라미터**: 
  - `id`: 동물 ID (MongoDB ObjectId)
- **쿼리 파라미터**: 없음
- **성공 응답**:
  - **코드**: 200 OK
  - **내용**: 동물 객체
    ```json
    {
      "_id": "60d21b4667d0d8992e610c85",
      "name": "멍멍이",
      "type": "강아지",
      "description": "귀여운 골든 리트리버입니다.",
      "imagePath": "/uploads/1624287046-dog.jpg",
      "createdAt": "2023-08-10T12:34:56.789Z",
      "updatedAt": "2023-08-15T09:12:34.567Z"
    }
    ```
- **오류 응답**:
  - **코드**: 404 Not Found
  - **내용**: 
    ```json
    {
      "error": "해당 동물을 찾을 수 없습니다."
    }
    ```
  - **코드**: 500 Internal Server Error
  - **내용**: 
    ```json
    {
      "error": "서버 오류가 발생했습니다."
    }
    ```

## 객체 스키마

### 동물 객체

| 필드 | 타입 | 설명 |
|------|------|------|
| _id | ObjectId | 고유 식별자 (MongoDB에서 자동 생성) |
| name | String | 동물 이름 |
| type | String | 동물 종류 (강아지, 고양이, 새, 물고기, 기타) |
| description | String | 동물에 대한 설명 |
| imagePath | String | 업로드된 이미지 경로 |
| createdAt | Date | 생성 일시 |
| updatedAt | Date | 최종 수정 일시 (수정된 경우에만 존재) |

## 향후 개발 계획

다음 버전에서는 다음과 같은 API가 추가될 예정입니다:

- `POST /api/animals` - 새 동물 정보 추가
- `PUT /api/animals/:id` - 동물 정보 수정
- `DELETE /api/animals/:id` - 동물 정보 삭제
- `GET /api/animals/types` - 등록된 모든 동물 종류 조회

## 에러 코드

| 코드 | 설명 |
|------|------|
| 400 | 잘못된 요청 (Bad Request) |
| 404 | 리소스를 찾을 수 없음 (Not Found) |
| 500 | 서버 내부 오류 (Internal Server Error) |