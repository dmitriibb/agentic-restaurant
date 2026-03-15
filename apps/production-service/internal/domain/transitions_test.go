package domain

import "testing"

func TestValidateTransition_ValidTransitions(t *testing.T) {
	tests := []struct {
		from    string
		command string
		want    string
	}{
		{StatusQueued, CommandPickup, StatusInProgress},
		{StatusQueued, CommandBlock, StatusBlocked},
		{StatusInProgress, CommandReady, StatusReady},
		{StatusInProgress, CommandBlock, StatusBlocked},
		{StatusBlocked, CommandResume, StatusInProgress},
	}

	for _, tt := range tests {
		t.Run(tt.from+"_"+tt.command, func(t *testing.T) {
			got, err := ValidateTransition(tt.from, tt.command)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Errorf("ValidateTransition(%q, %q) = %q, want %q", tt.from, tt.command, got, tt.want)
			}
		})
	}
}

func TestValidateTransition_InvalidTransitions(t *testing.T) {
	tests := []struct {
		from    string
		command string
	}{
		{StatusQueued, CommandReady},
		{StatusQueued, CommandResume},
		{StatusInProgress, CommandPickup},
		{StatusInProgress, CommandResume},
		{StatusBlocked, CommandPickup},
		{StatusBlocked, CommandReady},
		{StatusBlocked, CommandBlock},
		{StatusReady, CommandPickup},
		{StatusReady, CommandBlock},
		{StatusReady, CommandResume},
		{StatusReady, CommandReady},
		{StatusCancelled, CommandPickup},
	}

	for _, tt := range tests {
		t.Run(tt.from+"_"+tt.command, func(t *testing.T) {
			_, err := ValidateTransition(tt.from, tt.command)
			if err == nil {
				t.Errorf("ValidateTransition(%q, %q) should return error", tt.from, tt.command)
			}
		})
	}
}
