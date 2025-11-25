## 실행 방법

이 애플리케이션을 개발 환경에서 실행하려면 두 개의 터미널이 필요합니다.

### 터미널 1: Vite 개발 서버 실행
React 앱의 빠른 새로고침(Hot-Reload)을 위해 Vite 개발 서버를 실행합니다.

```bash
cd C:\2011008\캡스톤\capston_Project\electron-app
npm run dev
```

### 터미널 2: Electron 앱 실행
Electron 애플리케이션을 실행합니다. 이 명령을 실행하면 시그널링 서버가 자동으로 시작되고 Electron 창이 열립니다.

```bash
cd C:\2011008\캡스톤\capston_Project\electron-app
npm start
```

---
### 사전 설치 필요
- NodeJS
- PostgreSQL

### 현재 남아있는 버그
- 친구 추가 거절 시 친구 추가 알림이 안사라짐 
- 프로필 설정에 프로필 이미지 안나옴 (Profile Preview)글자가 나와 있음 

효과음을 쉽게 변경하실 수 있도록 방식을 수정했습니다.

변경 방법:

electron-app/public/sounds/ 폴더를 열어주세요. (없다면 생성됩니다)
원하시는 효과음 파일(mp3 등)을 준비해주세요.
파일 이름을 notification.mp3로 변경하여 해당 폴더에 넣어주시면 됩니다.
이제 코드를 수정할 필요 없이 파일만 교체하면 알림음이 바뀝니다!