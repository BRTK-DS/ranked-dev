export type Profile = { id: string; username: string; xp: number; rank: string; rating: number; is_admin: boolean };
export type TestCase = { input: string; expected: string };
export type CompletionBlank = { slot: number; label: string; placeholder?: string; accepted: string[] };
export type CompletionConfig = { template: string; blanks: CompletionBlank[] };
export type RandomTestConfig = { cases_per_run: number; generator: string; oracle: string };
export type Challenge = { id: string; title: string; description: string; difficulty: "Easy" | "Medium" | "Hard"; challenge_type?: "code" | "completion"; initial_code: string; test_cases: TestCase[]; tests_per_run?: number; completion_config?: CompletionConfig | null; random_test_config?: RandomTestConfig | null };
export type Submission = { id: string; challenge_id: string; status: string; execution_time_ms: number | null; created_at: string; challenges?: { title: string } | null };
