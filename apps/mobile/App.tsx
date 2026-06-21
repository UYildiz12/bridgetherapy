import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ExhaleApiClient } from "./src/api/client";
import type {
  ConversationListItem,
  CurrentUser,
  HomeworkAssignment,
  MoodEntry,
  ProgressReport,
  ReflectionEntry,
} from "./src/api/types";

const DEFAULT_API = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

type Snapshot = {
  me: CurrentUser;
  moods: MoodEntry[];
  reflections: ReflectionEntry[];
  homework: HomeworkAssignment[];
  conversations: ConversationListItem[];
  progress: ProgressReport;
};

export default function App() {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_API);
  const [token, setToken] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [moodScore, setMoodScore] = useState("7.0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(
    () => (token.trim() ? new ExhaleApiClient({ baseUrl, token: token.trim() }) : null),
    [baseUrl, token],
  );

  async function load() {
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      const [me, moods, reflections, homework, conversations, progress] = await Promise.all([
        client.me(),
        client.moods(),
        client.reflections(),
        client.homework(),
        client.conversations(),
        client.progress(),
      ]);
      setSnapshot({ me, moods, reflections, homework, conversations, progress });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Exhale.");
    } finally {
      setLoading(false);
    }
  }

  async function submitMood() {
    if (!client) return;
    const score = Number(moodScore);
    if (!Number.isFinite(score)) return;
    setLoading(true);
    setError(null);
    try {
      await client.createMood({ moodScore: score, notes: "Mobile check-in", tags: [] });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save mood.");
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.root}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>EXHALE MOBILE</Text>
          <Text style={styles.title}>Care cockpit</Text>
          <Text style={styles.sub}>
            Native shell for the same Exhale APIs: mood, reflections, homework, messages, reports, and wellness.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.label}>API base URL</Text>
          <TextInput value={baseUrl} onChangeText={setBaseUrl} autoCapitalize="none" style={styles.input} />
          <Text style={styles.label}>Bearer token</Text>
          <TextInput
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            secureTextEntry
            placeholder="Paste Supabase access token"
            placeholderTextColor="#7b8494"
            style={styles.input}
          />
          <Pressable disabled={!token.trim() || loading} onPress={load} style={styles.primaryButton}>
            <Text style={styles.primaryText}>{loading ? "Syncing" : "Sync account"}</Text>
          </Pressable>
          {error && <Text style={styles.error}>{error}</Text>}
        </View>

        {loading && <ActivityIndicator color="#d5f7ff" />}

        {snapshot && (
          <View style={styles.grid}>
            <Metric label="Signed in" value={snapshot.me.email} />
            <Metric label="Latest mood" value={snapshot.moods[0]?.moodScore?.toString() ?? "n/a"} />
            <Metric label="Reflections" value={String(snapshot.reflections.length)} />
            <Metric label="Homework" value={String(snapshot.homework.length)} />
            <Metric label="Unread" value={String(snapshot.conversations.reduce((sum, item) => sum + item.unreadCount, 0))} />
            <Metric
              label="Progress"
              value={
                snapshot.progress.role === "PATIENT"
                  ? `${snapshot.progress.homework.completionRate}% homework`
                  : `${snapshot.progress.patients.length} patients`
              }
            />
          </View>
        )}

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Mood check-in</Text>
          <TextInput
            value={moodScore}
            onChangeText={setMoodScore}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <Pressable disabled={!client || loading} onPress={submitMood} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Save mobile check-in</Text>
          </Pressable>
        </View>

        <View style={styles.wellness}>
          <Text style={styles.sectionTitle}>Wellness quick access</Text>
          <Text style={styles.body}>4-7-8 breathing, grounding scan, and crisis support live in the web/PWA app.</Text>
          <Text style={styles.body}>If someone is in immediate danger in the U.S., call emergency services or call/text 988.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0d1117" },
  root: { gap: 18, padding: 20, paddingBottom: 48 },
  header: { borderBottomColor: "#263142", borderBottomWidth: 1, paddingBottom: 20 },
  eyebrow: { color: "#8aa0b8", fontSize: 12, fontWeight: "700", letterSpacing: 3 },
  title: { color: "#f4f7fb", fontSize: 38, fontWeight: "700", marginTop: 8 },
  sub: { color: "#a7b2c0", fontSize: 15, lineHeight: 22, marginTop: 8 },
  panel: { backgroundColor: "#111823", borderColor: "#263142", borderRadius: 8, borderWidth: 1, gap: 10, padding: 14 },
  label: { color: "#cad5e3", fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  input: {
    borderColor: "#334155",
    borderRadius: 8,
    borderWidth: 1,
    color: "#f4f7fb",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  primaryButton: { alignItems: "center", backgroundColor: "#d5f7ff", borderRadius: 8, padding: 12 },
  primaryText: { color: "#08111d", fontSize: 15, fontWeight: "700" },
  secondaryButton: { alignItems: "center", borderColor: "#d5f7ff", borderRadius: 8, borderWidth: 1, padding: 12 },
  secondaryText: { color: "#d5f7ff", fontSize: 15, fontWeight: "700" },
  error: { color: "#ffb4b4", fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: { backgroundColor: "#111823", borderColor: "#263142", borderRadius: 8, borderWidth: 1, padding: 12, width: "48%" },
  metricLabel: { color: "#8aa0b8", fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  metricValue: { color: "#f4f7fb", fontSize: 18, fontWeight: "700", marginTop: 8 },
  sectionTitle: { color: "#f4f7fb", fontSize: 18, fontWeight: "700" },
  wellness: { borderTopColor: "#263142", borderTopWidth: 1, gap: 8, paddingTop: 18 },
  body: { color: "#a7b2c0", fontSize: 14, lineHeight: 21 },
});
