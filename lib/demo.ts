import type { Challenge } from "./types";
export const demoChallenges: Challenge[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Znajdź parę liczb (Two Sum)",
    difficulty: "Easy",
    description:
      "Dostajesz tablicę liczb nums oraz liczbę target. Znajdź dwie liczby z tablicy, które po dodaniu dają target. Zwróć ich indeksy, czyli pozycje w tablicy, jako tablicę [pierwszyIndeks, drugiIndeks]. Możesz założyć, że zawsze istnieje dokładnie jedna poprawna para.",
    initial_code:
      "function solve(nums, target) {\n  // 1. Znajdź dwie liczby dające target\n  // 2. Zwróć ich indeksy, np. [0, 1]\n  \n}",
    test_cases: [
      { input: "[[2,7,11,15],9]", expected: "[0,1]" },
      { input: "[[3,2,4],6]", expected: "[1,2]" },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    title: "Najdłuższa seria zwycięstw",
    difficulty: "Medium",
    description:
      "Dostajesz tablicę wyników meczów. Litera W oznacza wygraną, a L przegraną. Policz, ile najwięcej wygranych W wystąpiło bez przerwy. Zwróć tę liczbę. Przegrana L przerywa aktualną serię, ale później może rozpocząć się nowa seria.",
    initial_code: "function solve(results) {\n  // W = wygrana, L = przegrana\n  // Zwróć długość najdłuższej serii W\n  \n}",
    test_cases: [
      { input: '[["W","W","L","W"]]', expected: "2" },
      { input: '[["W","W","W"]]', expected: "3" },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    title: "Czy lobby jest zbalansowane?",
    difficulty: "Hard",
    description:
      "Dostajesz tablicę ratingów graczy. Znajdź największy i najmniejszy rating. Jeżeli różnica między nimi wynosi maksymalnie 100 punktów, zwróć true. Jeżeli różnica jest większa niż 100, zwróć false. Pamiętaj: wynik ma być wartością boolean, a nie tekstem \"true\" lub \"false\".",
    initial_code: "function solve(ratings) {\n  // Znajdź min i max\n  // Zwróć true, gdy różnica <= 100\n  \n}",
    test_cases: [
      { input: "[[1200,1250,1299]]", expected: "true" },
      { input: "[[900,1200]]", expected: "false" },
    ],
  },
];
