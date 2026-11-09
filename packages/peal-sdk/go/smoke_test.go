package peal

import (
	"context"
	"os"
	"slices"
	"testing"
)

// TestSmoke is the smoke test, which scripts/test.ts runs against a stand-in
// API: the health check, then the signed-in user with a bearer token. It
// skips without PEAL_API_URL.
func TestSmoke(t *testing.T) {
	url := os.Getenv("PEAL_API_URL")
	if url == "" {
		t.Skip("PEAL_API_URL is not set")
	}

	configuration := NewConfiguration()
	configuration.Servers = ServerConfigurations{{URL: url}}
	client := NewAPIClient(configuration)
	ctx := context.WithValue(context.Background(), ContextAccessToken, "peal_test")

	if _, err := client.SystemAPI.Health(ctx).Execute(); err != nil {
		t.Fatalf("health: %v", err)
	}

	me, _, err := client.SessionAPI.SessionMe(ctx).Execute()
	if err != nil {
		t.Fatalf("me: %v", err)
	}

	if me.User.Email != "ada@example.test" {
		t.Fatalf("unexpected user: %+v", me.User)
	}

	if me.ImpersonatedBy.Get() != nil || me.User.Image.Get() != nil {
		t.Fatalf("expected nulls: %+v", me)
	}

	permissions := make([]string, 0, len(me.Workspaces[0].Permissions))
	for _, permission := range me.Workspaces[0].Permissions {
		permissions = append(permissions, string(permission))
	}

	if !slices.Contains(permissions, "post:schedule") {
		t.Fatalf("unexpected permissions: %v", permissions)
	}
}
