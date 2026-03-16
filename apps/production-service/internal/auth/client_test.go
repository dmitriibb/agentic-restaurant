package auth

import (
	"testing"
)

func TestParseRoles_ArrayFormat(t *testing.T) {
	roles, err := parseRoles([]byte(`["STAFF","MANAGER"]`))
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(roles) != 2 || roles[0] != "STAFF" || roles[1] != "MANAGER" {
		t.Fatalf("unexpected roles: %#v", roles)
	}
}

func TestParseRoles_StringFormat(t *testing.T) {
	roles, err := parseRoles([]byte(`"STAFF, MANAGER"`))
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(roles) != 2 || roles[0] != "STAFF" || roles[1] != "MANAGER" {
		t.Fatalf("unexpected roles: %#v", roles)
	}
}

func TestParseRoles_UnsupportedFormat(t *testing.T) {
	_, err := parseRoles([]byte(`123`))
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

