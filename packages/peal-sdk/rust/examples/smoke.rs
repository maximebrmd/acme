//! The smoke test, which scripts/test.ts runs against a stand-in API: the
//! health check, the signed-in user with a bearer token, and the error a
//! refused token raises.
use peal_sdk::prelude::*;

fn client(base_url: &str, token: &str) -> PealClient {
    PealClient::new(ClientConfig {
        base_url: base_url.to_string(),
        token: Some(token.to_string()),
        ..Default::default()
    })
    .expect("the client builds")
}

#[tokio::main]
async fn main() {
    let base_url = std::env::var("PEAL_API_URL").expect("scripts/test.ts sets PEAL_API_URL");
    let peal = client(&base_url, "peal_test");

    peal.system.health(None).await.expect("the health check answers");
    let me = peal.session.me(None).await.expect("GET /api/me answers");

    assert_eq!(me.user.email, "ada@example.test");
    assert!(me.impersonated_by.is_none() && me.user.image.is_none());
    assert!(me.workspaces[0].permissions.contains(&Permission::PostSchedule));

    let refused = client(&base_url, "refused").session.me(None).await;
    assert!(
        matches!(refused, Err(ApiError::UnauthorizedError { .. })),
        "a refused token: {refused:?}"
    );

    println!("ok");
}
