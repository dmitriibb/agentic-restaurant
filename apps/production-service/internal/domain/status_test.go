package domain

import "testing"

func TestDeriveOrderStatus_AllQueued(t *testing.T) {
	got := DeriveOrderStatus(ItemStatusCounts{Queued: 3})
	if got != StatusQueued {
		t.Fatalf("expected QUEUED, got %s", got)
	}
}

func TestDeriveOrderStatus_SomeInProgress(t *testing.T) {
	got := DeriveOrderStatus(ItemStatusCounts{Queued: 1, InProgress: 2})
	if got != StatusInProgress {
		t.Fatalf("expected IN_PROGRESS, got %s", got)
	}
}

func TestDeriveOrderStatus_AllReady(t *testing.T) {
	got := DeriveOrderStatus(ItemStatusCounts{Ready: 3})
	if got != StatusReady {
		t.Fatalf("expected READY, got %s", got)
	}
}

func TestDeriveOrderStatus_SomeBlocked(t *testing.T) {
	got := DeriveOrderStatus(ItemStatusCounts{Queued: 1, Blocked: 1, InProgress: 1})
	if got != StatusBlocked {
		t.Fatalf("expected BLOCKED, got %s", got)
	}
}

func TestDeriveOrderStatus_AllCancelled(t *testing.T) {
	got := DeriveOrderStatus(ItemStatusCounts{Cancelled: 3})
	if got != StatusCancelled {
		t.Fatalf("expected CANCELLED, got %s", got)
	}
}

func TestDeriveOrderStatus_MixedReadyAndQueued(t *testing.T) {
	got := DeriveOrderStatus(ItemStatusCounts{Ready: 2, Queued: 1})
	if got != StatusInProgress {
		t.Fatalf("expected IN_PROGRESS for mixed ready+queued, got %s", got)
	}
}

func TestDeriveOrderStatus_ReadyWithCancelled(t *testing.T) {
	got := DeriveOrderStatus(ItemStatusCounts{Ready: 2, Cancelled: 1})
	if got != StatusReady {
		t.Fatalf("expected READY when all active are ready (cancelled ignored), got %s", got)
	}
}

func TestDeriveOrderStatus_BlockedWithReady(t *testing.T) {
	got := DeriveOrderStatus(ItemStatusCounts{Ready: 1, Blocked: 1})
	if got != StatusBlocked {
		t.Fatalf("expected BLOCKED when any active item is blocked, got %s", got)
	}
}

func TestDeriveOrderStatus_ZeroCounts(t *testing.T) {
	got := DeriveOrderStatus(ItemStatusCounts{})
	if got != StatusQueued {
		t.Fatalf("expected QUEUED for zero counts, got %s", got)
	}
}
