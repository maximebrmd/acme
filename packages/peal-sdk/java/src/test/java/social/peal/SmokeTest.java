// The smoke test, which scripts/test.ts runs against a stand-in API: the
// health check, the signed-in user with a bearer token, and the error a
// refused token raises.
package social.peal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import social.peal.core.PealClientApiException;
import social.peal.types.Me;
import social.peal.types.Permission;

class SmokeTest {
    private static final String BASE_URL = System.getenv("PEAL_API_URL");

    @Test
    void callsTheApiWithItsToken() {
        PealClient peal = PealClient.builder().url(BASE_URL).token("peal_test").build();

        peal.system().health();
        Me me = peal.session().me();

        assertEquals("ada@example.test", me.getUser().getEmail());
        assertFalse(me.getImpersonatedBy().isPresent());
        assertFalse(me.getUser().getImage().isPresent());
        assertTrue(me.getWorkspaces().get(0).getPermissions().contains(Permission.POST_SCHEDULE));

        PealClient refused = PealClient.builder().url(BASE_URL).token("refused").build();
        PealClientApiException error =
                assertThrows(PealClientApiException.class, () -> refused.session().me());
        assertEquals(401, error.statusCode());
    }
}
