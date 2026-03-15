package domain

import "fmt"

// Command constants for item state transitions.
const (
	CommandPickup = "pickup"
	CommandBlock  = "block"
	CommandResume = "resume"
	CommandReady  = "ready"
)

// transition defines the target status for a given (currentStatus, command) pair.
type transition struct {
	from    string
	command string
	to      string
}

var validTransitions = []transition{
	{StatusQueued, CommandPickup, StatusInProgress},
	{StatusQueued, CommandBlock, StatusBlocked},
	{StatusInProgress, CommandReady, StatusReady},
	{StatusInProgress, CommandBlock, StatusBlocked},
	{StatusBlocked, CommandResume, StatusInProgress},
}

// ValidateTransition checks whether the given command is valid for the current status.
// Returns the new status on success, or an error if the transition is invalid.
func ValidateTransition(currentStatus, command string) (string, error) {
	for _, t := range validTransitions {
		if t.from == currentStatus && t.command == command {
			return t.to, nil
		}
	}
	return "", fmt.Errorf("invalid transition: cannot apply %q to item in %q status", command, currentStatus)
}
