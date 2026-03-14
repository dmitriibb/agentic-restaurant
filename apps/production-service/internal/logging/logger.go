package logging

import (
	"encoding/json"
	"fmt"
	"os"
	"sync"
	"time"
)

type Logger struct {
	mu sync.Mutex
}

func New() *Logger {
	return &Logger{}
}

func (l *Logger) Info(msg string, fields map[string]any) {
	l.log("INFO", msg, fields)
}

func (l *Logger) Error(msg string, err error, fields map[string]any) {
	if fields == nil {
		fields = map[string]any{}
	}
	if err != nil {
		fields["error"] = err.Error()
	}
	l.log("ERROR", msg, fields)
}

func (l *Logger) log(level, msg string, fields map[string]any) {
	payload := map[string]any{
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"level":     level,
		"message":   msg,
	}
	for k, v := range fields {
		payload[k] = v
	}

	bytes, err := json.Marshal(payload)
	if err != nil {
		fmt.Fprintf(os.Stdout, "{\"timestamp\":\"%s\",\"level\":\"ERROR\",\"message\":\"failed to encode log\",\"error\":%q}\n", time.Now().UTC().Format(time.RFC3339), err.Error())
		return
	}

	l.mu.Lock()
	defer l.mu.Unlock()
	_, _ = fmt.Fprintln(os.Stdout, string(bytes))
}
