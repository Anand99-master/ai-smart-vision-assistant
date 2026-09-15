export interface DiagnosticLogEntry {
  id: string;
  timestamp: number;
  event: string;
  module: string;
  priority: string;
  result: string;
}

let logs: DiagnosticLogEntry[] = [];
type LogListener = (logs: DiagnosticLogEntry[]) => void;
const listeners: Set<LogListener> = new Set();

export function addDiagnosticLog(event: string, module: string, priority: string, result: string) {
  const entry: DiagnosticLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: Date.now(),
    event,
    module,
    priority,
    result,
  };
  logs = [entry, ...logs].slice(0, 100); // Keep last 100 logs
  listeners.forEach((listener) => listener(logs));
}

export function getDiagnosticLogs(): DiagnosticLogEntry[] {
  return logs;
}

export function clearDiagnosticLogs() {
  logs = [];
  listeners.forEach((listener) => listener(logs));
}

export function subscribeDiagnosticLogs(listener: LogListener): () => void {
  listeners.add(listener);
  listener(logs);
  return () => {
    listeners.delete(listener);
  };
}
