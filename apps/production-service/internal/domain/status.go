package domain

// Item status constants.
const (
	StatusQueued     = "QUEUED"
	StatusInProgress = "IN_PROGRESS"
	StatusBlocked    = "BLOCKED"
	StatusReady      = "READY"
	StatusCancelled  = "CANCELLED"
)

// DeriveOrderStatus computes the production order status from aggregated item counts.
// The order status is never set directly; it is always derived from the current item states.
func DeriveOrderStatus(c ItemStatusCounts) string {
	active := c.Queued + c.InProgress + c.Blocked + c.Ready
	if active == 0 && c.Cancelled > 0 {
		return StatusCancelled
	}
	if active > 0 && active == c.Ready {
		return StatusReady
	}
	if c.Blocked > 0 {
		return StatusBlocked
	}
	if c.InProgress > 0 || c.Ready > 0 {
		return StatusInProgress
	}
	return StatusQueued
}
