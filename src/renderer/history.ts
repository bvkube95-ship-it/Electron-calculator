export interface HistoryEntry {
    expression: string
    result: string
}

const HISTORY_KEY = "nyx-calc-history"

export function loadHistory(): HistoryEntry[] {
    try {
        const raw = localStorage.getItem(HISTORY_KEY)
        if (raw === null) {
            return []
        }
        const parsed : unknown = JSON.parse(raw)
        if (!Array.isArray(parsed)) {
            return []
        }
        return parsed.filter(
            (entry): entry is HistoryEntry =>
                typeof entry === "object" &&
                entry !== null &&
                typeof (entry as HistoryEntry).expression === "string" &&
                typeof (entry as HistoryEntry).result === "string"
        )
    } catch {
        return []
    }
}

export function saveHistory(history: HistoryEntry[]): void {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)))
    } catch {
        // Storage unavailable — history just won't persist between launches.
    }
}