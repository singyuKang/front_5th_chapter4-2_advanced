# 과제 체크포인트

## 배포링크 
https://front-5th-chapter4-2-advanced-hazel.vercel.app/

## 과제 요구사항

- [x] 배포 후 url 제출

- [x] API 호출 최적화(`Promise.all` 이해)

- [x] SearchDialog 불필요한 연산 최적화
- [x] SearchDialog 불필요한 리렌더링 최적화

- [x] 시간표 블록 드래그시 렌더링 최적화
- [x] 시간표 블록 드롭시 렌더링 최적화

## 과제 셀프회고

##  API 호출 최적화 – 중복 요청 제거 및 병렬 처리 개선

### 초기상황
```javascript
const fetchAllLectures = async () => await Promise.all([
  (console.log('API Call 1', performance.now()), await fetchMajors()),
  (console.log('API Call 2', performance.now()), await fetchLiberalArts()),
  (console.log('API Call 3', performance.now()), await fetchMajors()),
  (console.log('API Call 4', performance.now()), await fetchLiberalArts()),
  (console.log('API Call 5', performance.now()), await fetchMajors()),
  (console.log('API Call 6', performance.now()), await fetchLiberalArts()),
]);
```
초기 코드에서는 **동일한 API**(fetchMajors, fetchLiberalArts)를 await 키워드와 함께 **여러 번 중복 호출**하고 있었습니다.

```javascript
let majorsCache: Promise<AxiosResponse<Lecture[]>> | null = null;
let liberalArtsCache: Promise<AxiosResponse<Lecture[]>> | null = null;

const getCachedMajors = () => {
  if (!majorsCache) {
    console.log("전공 데이터 새로 요청", performance.now());
    majorsCache = fetchMajors();
  } else {
    console.log("전공 데이터 캐시 사용", performance.now());
  }
  return majorsCache;
};

const getCachedLiberalArts = () => {
  if (!liberalArtsCache) {
    console.log("교양 데이터 새로 요청", performance.now());
    liberalArtsCache = fetchLiberalArts();
  } else {
    console.log("교양 데이터 캐시 사용", performance.now());
  }
  return liberalArtsCache;
};

export const fetchAllLectures = async () => {
  console.log("API 호출 시작", performance.now());

  const promises = [
    getCachedMajors(), // 1번째 호출 시에만 실제 API 요청
    getCachedLiberalArts(), // 1번째 호출 시에만 실제 API 요청
    getCachedMajors(), // 캐시된 Promise 재사용
    getCachedLiberalArts(), // 캐시된 Promise 재사용
    getCachedMajors(), // 캐시된 Promise 재사용
    getCachedLiberalArts(), // 캐시된 Promise 재사용
  ];

  return await Promise.all(promises);
};
```
**처음 호출** 시에만 API를 요청하고, 이후에는 **같은 Promise를 캐시**하여 재사용하도록 변경하였습니다.

또한 **await를 각 호출 앞에서 제거**하고, **Promise.all()**로 병렬 처리 구현하였습니다.

<img width="564" height="327" alt="Image" src="https://github.com/user-attachments/assets/599b79ea-ef3a-40e9-9869-40407d90cf85" />

### 📉 API 호출 시간
**199.89ms** → **136.60ms**로 약 **32%** 성능 개선


## 불필요한 연산 최적화

### 컴포넌트 분리
<img width="196" height="331" alt="Image" src="https://github.com/user-attachments/assets/5067cf94-6ecc-4346-aaf0-496e0821e4b4" />

3주차 강의에서 **컴포넌트가 잘 분리되어 있어야 최적화가 쉬워진다**는 내용이 기억나 리팩토링을 다음과같이 먼저 진행하였습니다.

### 고비용 함수 최적화
```javascript
const getFilteredLectures = () => {
  const { query = "", credits, grades, days, times, majors } = searchOptions;
  return lectures
    .filter(/* 검색어 기준 필터 */)
    .filter(/* 학년 기준 필터 */)
    .filter(/* 전공 기준 필터 */)
    .filter(/* 학점 기준 필터 */)
    .filter(/* 요일 기준 필터 */)
    .filter(/* 시간 기준 필터 */);
};
```
학생이 신청 가능한 시간표의 갯수는 **25,677개** 입니다. 

따라서 **getFilteredLectures** 함수가 호출될 때마다 이 모든 데이터에 대해 **여러 단계의 filter 연산**을 수행하게 됩니다.

벌써부터 너무 연산이 많다는 생각이 들지 않나요? 이를 위해  고비용 연산 결과를 캐싱하는 **useMemo**를 활용했습니다:


```javascript
const filteredLectures = useMemo(() => {
  const { query = "", credits, grades, days, times, majors } = searchOptions;
  return lectures
    .filter(/* ... */)
    // ... 여러 필터 체인
}, [searchOptions, lectures]); 
```
이로인해 **searchOptions**나 **lectures**가 변경되지 않으면 필터링 작업을 다시 수행하지 않도록 변경

컴포넌트가 다른 이유로 리렌더링되어도 이미 계산된 결과를 재사용


## SearchDialog 최적화

### pagination 최적화
<img width="394" height="656" alt="Image" src="https://github.com/user-attachments/assets/519ffa4f-b91d-42c8-b46d-60e5500873ed" />
<img width="778" height="420" alt="Image" src="https://github.com/user-attachments/assets/699d9557-632d-4047-9420-21f07e9923c8" />

제일 아래 스크롤에 도달하게 되면은 다음 페이지 과목을 새로 업데이트하게 되는데 불필요하게 이미 존재하는 **테이블 Row 데이터**와 **테이블 위의 컴포넌트**들이 **렌더링이 발생**하게 됩니다.

이를 위해 테이블을 기준으로 **SearchFilters**, **LectureTable**로 나눈후 
```javascript
          <VStack spacing={4} align="stretch">
            <SearchFilters
              searchOptions={searchOptions}
              allMajors={allMajors}
              onSearchOptionChange={handleSearchOptionChange}
            />
            <Text align="right">검색결과: {filteredLectures.length}개</Text>
            <LectureTable
              visibleLectures={visibleLectures}
              onAddSchedule={addSchedule}
              loaderRef={loaderRef}
              ref={loaderWrapperRef}
            />
          </VStack>
```
**useCallback**으로 핸들러 메모이제이션 + **React.memo**를 통해 컴포넌트 메모이제이션하여 최적화를 진행하였습니다.
```javascript
  const handleTimesChange = useCallback(
    (times: number[]) => {
      onSearchOptionChange("times", times);
    },
    [onSearchOptionChange]
  );

  const handleMajorsChange = useCallback(
    (majors: string[]) => {
      onSearchOptionChange("majors", majors);
    },
    [onSearchOptionChange]
  );
```

<img width="680" height="314" alt="Image" src="https://github.com/user-attachments/assets/ae0d76ab-ebce-4560-b9e5-60030b751dc7" />

<img width="929" height="373" alt="Image" src="https://github.com/user-attachments/assets/ec463b16-2f4e-4fce-9db5-852006350cf0" />

사진에서 보여지는 것처럼 **SearchFilters**와 **이전 컴포넌트들이 렌더링이 발생하지 않은것**을 확인할 수 있으며 성능개선이 이루어진것을 확인하실 수 있습니다.

---

### 전공데이터 최적화

**학년 또는 요일 CheckBox**를 누르게 되면은 수많은 전공 데이터들을 **다시 렌더링**하게 되는 문제가 발생합니다.
<img width="981" height="223" alt="Image" src="https://github.com/user-attachments/assets/f96e106b-c409-462a-aad3-69841ffc96ae" />


위와 마찬가지로 하나의 컴포넌트를 **3개**의 컴포넌트로 분리하여 **memo 작업**을 진행하였습니다.
```javascript
    <VStack spacing={4} align="stretch">
      <BasicSearchControls
        searchOptions={searchOptions}
        onSearchOptionChange={onSearchOptionChange}
      />

      {/* 시간 + 전공 */}
      <HStack spacing={4}>
        <TimeSelector
          times={searchOptions.times}
          onTimesChange={handleTimesChange}
        />

        <MajorSelector
          majors={searchOptions.majors}
          allMajors={allMajors}
          onMajorsChange={handleMajorsChange}
        />
      </HStack>
    </VStack>
```

<img width="451" height="349" alt="Image" src="https://github.com/user-attachments/assets/56d3798d-9425-47ae-86a8-4bb719212704" />

<img width="646" height="321" alt="Image" src="https://github.com/user-attachments/assets/ce66c256-20e9-4a93-8fb8-9643a353bf66" />


## DraggableSchedule 최적화

<img width="537" height="275" alt="Image" src="https://github.com/user-attachments/assets/1a479fb3-a5c2-44e1-92a4-625c6ceca2e6" />

드래그를 통해 수업을 옮기게 되면은 **다른 시간표 영역에서도 모두 리렌더링**이 발생하여 성능 저하가 발생합니다.

```
사용자가 수업을 드래그 → DndContext 상태 변경 → active.id 업데이트

DndContext 상태 변경
    ↓
모든 ScheduleTable 컴포넌트가 리렌더링 (useDndContext 때문에)
    ↓
각 ScheduleTable 내부의 모든 DraggableSchedule도 리렌더링
```

이전과 마찬가지로 **컴포넌트에 대한 분리**를 진행했으며, **schedules에 useMemo**를 사용해 의존성 변화가 없을때에는 기존값을 사용하도록 하여 불필요한 렌더링을 막았습니다.

```javascript
const scheduleItems = useMemo(() => 
  schedules.map((schedule, index) => ({
    key: `${schedule.lecture.id}-${schedule.day}-${schedule.range[0]}`,
    id: `${tableId}:${index}`,
    data: schedule,
    bg: colorMap[schedule.lecture.id],
    onDeleteButtonClick: () => onDeleteButtonClick?.({
      day: schedule.day,
      time: schedule.range[0],
    })
  }))
, [schedules, tableId, colorMap, onDeleteButtonClick]);
```

<img width="740" height="396" alt="Image" src="https://github.com/user-attachments/assets/70458e45-90d7-4c68-a41c-39c6868999c8" />

<img width="632" height="390" alt="Image" src="https://github.com/user-attachments/assets/9e6b4357-94df-4ad2-b502-8ca70a78f5a7" />


