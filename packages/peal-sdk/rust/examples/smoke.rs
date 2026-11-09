//! The smoke test, which scripts/test.ts runs against a stand-in API: the
//! health check, then the signed-in user with a bearer token.

use peal_sdk::apis::{configuration::Configuration, session_api, system_api};

#[tokio::main]
async fn main() {
    let configuration = Configuration {
        base_path: std::env::var("PEAL_API_URL").expect("PEAL_API_URL is not set"),
        bearer_access_token: Some("peal_test".to_owned()),
        ..Configuration::default()
    };

    system_api::health(&configuration).await.expect("health check");
    let me = session_api::session_me(&configuration).await.expect("signed-in user");

    assert_eq!(me.user.email, "ada@example.test");
    assert!(me.impersonated_by.is_none() && me.user.image.is_none());
    let permissions = serde_json::to_value(&me.workspaces[0].permissions).expect("permissions");
    assert!(
        permissions.as_array().is_some_and(|all| all.iter().any(|p| p == "post:schedule")),
        "unexpected permissions: {permissions}"
    );

    println!("ok");
}
