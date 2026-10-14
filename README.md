# 🌟 LingoPop — Leitner Spaced Repetition English Vocabulary

[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-brightgreen?style=flat-square&logo=github)](https://julieryoo.github.io/asy/)
[![Version](https://img.shields.io/badge/version-v2026.10.15.3-blue?style=flat-square)](https://julieryoo.github.io/asy/)
[![Tech Stack](https://img.shields.io/badge/Vanilla-HTML%20%7C%20CSS%20%7C%20JS-orange?style=flat-square)](https://julieryoo.github.io/asy/)
[![Vocabulary DB](https://img.shields.io/badge/Vocabulary-720%20Words-purple?style=flat-square)](https://julieryoo.github.io/asy/)

> **LingoPop**은 독일의 심리학자 세바스찬 라이트너(Sebastian Leitner)의 **간격 반복 시스템(Leitner Spaced Repetition)**을 기반으로 한 반응형 영어 어휘 학습 웹 애플리케이션입니다.  
> 체계적인 5단계 복습 알고리즘, 실시간 발음 TTS, 다양한 퀴즈 및 받아쓰기 기능을 통해 단기 기억을 장기 기억으로 완벽히 전환합니다.

🌐 **웹 서비스 바로가기**: [https://julieryoo.github.io/asy/](https://julieryoo.github.io/asy/)

---

## ✨ 주요 특징 (Key Features)

### 1. 🧠 라이트너 5단계 간격 반복 시스템 (Leitner Spaced Repetition)
- **1일 $\to$ 2일 $\to$ 4일 $\to$ 7일 $\to$ 14일** 주기의 과학적 복습 인터벌.
- 정답 시 상위 박스로 승급, 오답 시 즉시 Box 1로 강등되어 취약 단어를 집중 공략합니다.
- 복습 주기 도달 단어 자동 알림 및 일일 학습 스트릭(Streak) 추적.

### 2. 📚 청담어학원 정규 교재 어휘 720개 기본 탑재
- **Par C1**: Lesson 01 ~ Lesson 12 (단원당 40단어, 총 480단어)
- **Par C2**: Unit 1 ~ Unit 4 (단원당 60단어, 총 240단어)
- **어휘 정보**: 표제어, 품사, 국문 뜻, 영문 정의, 콜로케이션(연어) 예문, 예문 해석, 빈칸(Cloze), 유의어 완벽 수록.

### 3. 🎯 4가지 인터랙티브 학습 모드
- **플래시카드 학습 (Flashcard Study)**: 
  - 카드 뒤집기 인터랙션, Web Speech API 고음질 원어민 발음 TTS 지원.
- **4지선다 객관식 & 스펠링 퀴즈 (Quiz Mode)**:
  - 제한 시간 타이머, 점수 계산, 즉시 정답/해설 피드백.
- **받아쓰기 훈련 (Dictation Mode)**:
  - 영한/한영/혼합 모드를 지원하여 청취력과 철자 암기력 극대화.
- **오답 노트 복습 (Incorrect Word Review)**:
  - 틀린 단어만 모아서 재학습 및 자동 클리어.

### 4. 📊 시각적 대시보드 & 프로필 관리
- 라이트너 박스별 단어 분포 차트, 학습 진행률(%), 최근 활동 통계 제공.
- 브라우저 로컬 저장소(LocalStorage) 기반 멀티 사용자 프로필 및 완벽한 오프라인/동기화 지원.
- 커스텀 단어 직접 추가 및 편집/삭제 기능.

---

## 🛠 기술 스택 (Tech Stack)

| 구분 | 기술 | 설명 |
| :--- | :--- | :--- |
| **Frontend** | Vanilla HTML5, CSS3, JavaScript (ES6+) | 프레임워크 없는 초경량·고성능 아키텍처 |
| **Design** | Modern Glassmorphism & Dark UI | HSL 기반 다이내믹 컬러 토큰 및 부드러운 반응형 레이아웃 |
| **Speech** | Web Speech API | 브라우저 내장 네이티브 영어 TTS 엔진 |
| **Icons & Effects** | Lucide Icons, Canvas Confetti | 가볍고 미려한 벡터 아이콘 및 목표 달성 축하 애니메이션 |
| **Data Extraction** | macOS Apple Vision OCR (Swift) | 교재 PDF 고해상도 바운딩 박스 텍스트 추출 자동화 파이프라인 |
| **Deployment** | GitHub Pages & GitHub Actions | 무중단 자동 정적 웹 호스팅 |

---

## 📁 프로젝트 구조 (Directory Structure)

```bash
lingopop/
├── index.html          # 메인 UI 레이아웃 및 탭 구조
├── index.css           # 글로벌 테마, 반응형 그리드, 모던 글래스모피즘 스타일
├── default-words.js    # Par C1, Par C2 720단어 마스터 데이터베이스
├── js/
│   ├── core-state.js      # 라이트너 상태 엔진, LocalStorage 동기화, 사용자 관리
│   ├── tab-study.js       # 플래시카드 렌더링, TTS, 난이도별 박스 이동 로직
│   ├── tab-quiz.js        # 4지선다 객관식 및 스펠링 퀴즈 세션 관리
│   ├── tab-dictation.js   # 받아쓰기(Dictation) 훈련 모듈
│   ├── tab-dashboard.js   # 통계 지표, 차트 렌더링, 스트릭 카운터
│   └── tab-manage.js      # 단어 검색, 필터링, 사용자 단어 추가/수정
└── README.md
```

---

## 🚀 빠른 시작 (Getting Started)

별도의 패키지 설치나 빌드 과정 없이 정적 파일로 바로 구동됩니다:

```bash
# 1. 저장소 클론
git clone https://github.com/julieRyoo/asy.git

# 2. 디렉토리 이동
cd asy

# 3. 로컬 브라우저에서 실행 (더블 클릭 또는 아래 명령어)
open index.html
```

---

## 📝 라이선스 (License)

이 프로젝트는 교육 및 개인 학습 목적으로 제작되었습니다.  
&copy; 2026 **LingoPop**. All rights reserved.
