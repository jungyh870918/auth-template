# Auth & Reports API

NestJS 기반의 인증 및 간단한 리포트 관리 백엔드 프로젝트입니다.  
JWT 인증, Refresh Token 로테이션, Redis 캐싱, Kakao OAuth, Swagger 문서화를 포함합니다.

---

## Features

- 회원가입 / 로그인 / 로그아웃
- Access / Refresh Token 발급 및 갱신 (Redis 기반 jti 관리)
- Kakao OAuth 로그인 (state 검증 포함)
- 사용자 관리 (조회 / 수정 / 삭제)
- Reports 관리 (휴대폰 정보)
  - 생성 (로그인 필요)
  - 전체 조회 (로그인 필요)
  - 단일 조회 (로그인 필요)

---

## Tech Stack

- [NestJS](https://nestjs.com/)  
- [TypeORM](https://typeorm.io/) (SQLite)  
- [Redis](https://redis.io/)  
- [JWT](https://jwt.io/)  
- [Swagger](https://swagger.io/tools/swagger-ui/)  

---

## Project Structure

```
src/
├── users/
│   ├── dtos/
│   ├── user.entity.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── auth.service.ts
├── reports/
│   ├── dtos/
│   ├── report.entity.ts
│   ├── reports.controller.ts
│   └── reports.service.ts
├── guards/
│   ├── auth.guard.ts
│   └── admin.guard.ts
├── interceptors/
│   └── serialize.interceptor.ts
├── main.ts
└── app.module.ts
```

---

## Installation

```bash
$ npm install
```

---

## Environment Variables

`.env` 파일을 프로젝트 루트에 생성합니다.

```env
DB_NAME=db.sqlite
COOKIE_KEY=your_cookie_secret
JWT_ACCESS_SECRET=your_access_secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES=7d
TOKEN_HASH_SECRET=your_token_hash_secret
KAKAO_REST_API_KEY=your_kakao_key
KAKAO_REDIRECT_URI=http://localhost:3000/auth/kakao/callback
```

---

## Database Migration

```bash
$ npx typeorm-ts-node-commonjs migration:run -d ./data-source.ts
```

---

## Running the app

```bash
# development
$ npm run start:dev

# production
$ npm run start:prod
```

서버 실행 후 Swagger UI 문서를 브라우저에서 확인할 수 있습니다.

```
http://localhost:3000/docs
```

---

## API Examples

### Create a report (로그인 필요)

```http
POST /reports
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "manufacturer": "Samsung",
  "model": "Galaxy S24",
  "screenSize": 6,
  "price": 1200000
}
```

### Get all reports (로그인 필요)

```http
GET /reports/all
Authorization: Bearer <accessToken>
```

### 회원가입

```http
POST /auth/signup
Content-Type: application/json

{
  "email": "test@test.com",
  "password": "Aawef1@@@",
  "name": "Test User"
}
```

### 로그인

```http
POST /auth/signin
Content-Type: application/json

{
  "email": "test@test.com",
  "password": "Aawef1@@@"
}
```

### Refresh Token 갱신

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "<refreshToken>"
}
```

### 현재 로그인된 유저

```http
GET /auth/whoami
Authorization: Bearer <accessToken>
```

---

## Error Response Format

모든 예외는 `HttpException`을 통해 다음과 같은 JSON 형태로 반환됩니다.

```json
{
  "code": "AUTH_INVALID_CREDENTIALS",
  "message": "토큰이 존재하지 않습니다 (Missing Bearer token)"
}
```

---

## License

[MIT](LICENSE)
