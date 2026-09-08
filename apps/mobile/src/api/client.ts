import type {
  ConversationListItem,
  CurrentUser,
  HomeworkAssignment,
  MoodEntry,
  ProgressReport,
  ReflectionEntry,
} from "./types";

export interface BridgeApiClientOptions {
  baseUrl: string;
  token: string;
}

export class BridgeApiClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(options: BridgeApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.token = options.token;
  }

  me() {
    return this.request<CurrentUser>("/api/me");
  }

  moods() {
    return this.request<MoodEntry[]>("/api/mood");
  }

  createMood(input: { moodScore: number; notes?: string; tags?: string[] }) {
    return this.request<MoodEntry>("/api/mood", {
      method: "POST",
      body: input,
    });
  }

  reflections() {
    return this.request<ReflectionEntry[]>("/api/notes");
  }

  homework() {
    return this.request<HomeworkAssignment[]>("/api/homework");
  }

  conversations() {
    return this.request<ConversationListItem[]>("/api/messages/conversations");
  }

  progress() {
    return this.request<ProgressReport>("/api/reports/progress");
  }

  private async request<T>(path: string, init: { method?: "GET" | "POST"; body?: unknown } = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: init.method ?? "GET",
      headers: {
        authorization: `Bearer ${this.token}`,
        ...(init.body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });

    if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} failed: ${res.status}`);
    return (await res.json()).data as T;
  }
}
