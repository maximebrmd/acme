package social.peal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import social.peal.api.SessionApi;
import social.peal.api.SystemApi;
import social.peal.auth.HttpBearerAuth;
import social.peal.model.Me;

/**
 * The smoke test, which scripts/test.ts runs against a stand-in API: the
 * health check, then the signed-in user with a bearer token, set up as the
 * docs show. It runs only with PEAL_API_URL.
 */
class SmokeTest {
  @Test
  @EnabledIfEnvironmentVariable(named = "PEAL_API_URL", matches = ".+")
  void callsTheApiWithABearerToken() throws ApiException {
    ApiClient client = Configuration.getDefaultApiClient();
    client.setBasePath(System.getenv("PEAL_API_URL"));
    ((HttpBearerAuth) client.getAuthentication("bearer")).setBearerToken("peal_test");

    new SystemApi(client).health();
    Me me = new SessionApi(client).sessionMe();

    assertEquals("ada@example.test", me.getUser().getEmail());
    assertNull(me.getImpersonatedBy());
    assertNull(me.getUser().getImage());
    assertTrue(
        me.getWorkspaces().get(0).getPermissions().stream()
            .anyMatch(permission -> "post:schedule".equals(permission.getValue())));
  }
}
