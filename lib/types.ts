export type Profile = { id: string; username: string; xp: number; rank: string; rating: number; is_admin: boolean };
export type TestCase = { input: string; expected: string };
export type Challenge = { id: string; title: string; description: string; difficulty: "Easy" | "Medium" | "Hard"; initial_code: string; test_cases: TestCase[] };
export type Submission = { id: string; challenge_id: string; status: string; execution_time_ms: number | null; created_at: string; challenges?: { title: string } | null };
