# 꿈가락

## 개요
꿈가락 프로젝트는 AI를 활용하여 유아의 선호를 반영한 동요를 생성해 개별화된 음악적 경험을 제공하고, 가사 내용에 따른 긍적적인 습관 형성을 지원해주는 프로젝트입니다.

### 👶 Background

'세살 적 버릇 여든 간다'라는 속담이 있듯이, 유아기는 습관과 태도가 형성되는 중요한 시기로 이 시기에 형성된 습관은 평생 지속될 가능성이 높습니다.
따라서 이 때 올바른 역량을 키우는 것이 중요합니다.

<img width="674" alt="image" src="https://github.com/user-attachments/assets/090cb462-a85c-431d-b058-75647089ab9f" />

### 🎯 프로젝트 목표

유아가 즐겁고 쉽게 올바른 생활 습관을 형성할 수 있도록 돕기 위해, **AI 기반 참여형 동요 창작 서비스**를 개발했습니다.

| AS-IS |  | TO-BE |
| --- | --- | --- |
| 부모가 두려운 꾸지람 | ➡️ | 아이가 좋아하는, 아이의 취향을 반영한 훈육  |
| 멈출 수 없는 잔소리 |➡️ | 자연스럽게 반복학습이 되는 동요 |
| 어려운 꾸지람 |➡️  | 손쉽게, AI로! |



### 📍 서비스 플로우

서비스 플로우는 다음과 같이 네 단계로 이루어집니다.

<img width="663" alt="image" src="https://github.com/user-attachments/assets/da17a33f-2e7d-459c-a136-8b9614935d43" />


## 📍 핵심 기능

### 1. 습관 입력하기 

부모님께서는 아이가 개선했으면 하는 습관을 입력합니다.

<img width="644" alt="image" src="https://github.com/user-attachments/assets/3d14fe78-3c3b-4ce4-9d2a-835e1dbb9a02" />


### 2. 아이가 좋아하는 키워드 입력하기 (음식,색깔, 동물/캐릭터)

동요에 들어갈 키워드를 입력하는 과정입니다.
아이가 좋아하는 음식, 색깔, 동물이나 캐릭터를 입력하면, 이에 해당하는 키워드에 대해 Chat gpt로 생성된 이미지가 나오면서 키워드 입력이 완료됩니다.
이때 입력은 키패드 및 발화 두가지 모두로 가능하며, Speech to Text로 아이의 발화를 입력받아 Chat gpt를 통해 키워드만 뽑아낼 수 있도록 설계하였습니다.

<img width="682" alt="image" src="https://github.com/user-attachments/assets/8a2bfbf8-6445-4816-b72d-2e46028a0cd5" />

### 2-1. 가사 생성 원리

동요의 가사는 앞단계에서 입력한 아이가 개선하고자 하는 습관과 아이가 좋아하는 것들을 합쳐서 생성됩니다. 
예를 들어 어떠한 행동을 수행하면 좋아하는 음식으로 보상을 받는다거나, 좋아하는 캐릭터가 특정 습관을 재미있게 수행하는 등의 프롬프트를 거쳐 생성됩니다.

<img width="667" alt="image" src="https://github.com/user-attachments/assets/1ea30719-90d1-4381-a765-b6e328ad5612" />

### 3. 악기 선택 및 멜로디 생성하기

피아노, 기타, 리코더, 실로폰 네가지 악기 중 하나를 선택하면, suno AI를 이용해 동요의 멜로디가 생성됩니다.

<img width="671" alt="image" src="https://github.com/user-attachments/assets/278a5580-bd34-4809-9062-74f1c7b5a0e4" />

### 3-1. 동요 생성 원리

앞단계에서 생성된 가사와 선택한 악기가 포함된 멜로디를 합쳐 동요가 완성됩니다.

<img width="651" alt="image" src="https://github.com/user-attachments/assets/3c06bdd1-27dc-491c-8adb-f63b16a768b9" />



## 프로젝트 구조 
- **backend**: [Node JS 기반의 서버]
- **[frontend]**: [React Native 기반의 애플리케이션]

## backend api

| 구분   | 설명                  | 메서드 | 경로                        |
|--------|-----------------------|--------|-----------------------------|
| 습관   | 사용자의 습관 목록 보기 | GET    | /api/habit/${userId}        |
| 습관   | 습관 추가 저장        | POST   | /api/habit                  |
| 습관   | 습관 선택 저장        | POST   | /api/habit/toggle           |
| 선호도 | 선호도 저장           | POST   | /api/preferences            |
| 선호도 | 선호도 수동입력       | POST   | /api/preferences/direct     |
| 선호도 | 선호도 정보 보기      | GET    | /api/preferences/${userId}  |
| 선호도 | 선호도 리셋           | POST   | /api/preferences/reset      |
| 가사   | 가사 생성 & 저장      | POST   | /api/lyric                  |
| 가사   | 저장된 가사 보기      | GET    | /api/lyric/${userId}        |
| 멜로디 | 악기 저장             | POST   | /api/instrument             |
| 멜로디 | 악기 보기             | GET    | /api/instrument/${userId}   |
| 노래   | 노래 생성 및 저장     | POST   | /api/song                   |
| 노래   | 노래 들고오기         | GET    | /api/song/${userId}         |
| 노래   | 노래 삭제하기         | POST   | /api/song/delete            |
