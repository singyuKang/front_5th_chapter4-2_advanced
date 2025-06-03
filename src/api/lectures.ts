import { Lecture } from "@/types/types";
import axios from "axios";

export const fetchMajors = () => axios.get<Lecture[]>("/schedules-majors.json");

export const fetchLiberalArts = () =>
  axios.get<Lecture[]>("/schedules-liberal-arts.json");

// TODO: 이 코드를 개선해서 API 호출을 최소화 해보세요 + Promise.all이 현재 잘못 사용되고 있습니다. 같이 개선해주세요.
export const fetchAllLectures = async () =>
  await Promise.all([
    (console.log("API Call 1", performance.now()), await fetchMajors()),
    (console.log("API Call 2", performance.now()), await fetchLiberalArts()),
    (console.log("API Call 3", performance.now()), await fetchMajors()),
    (console.log("API Call 4", performance.now()), await fetchLiberalArts()),
    (console.log("API Call 5", performance.now()), await fetchMajors()),
    (console.log("API Call 6", performance.now()), await fetchLiberalArts()),
  ]);
