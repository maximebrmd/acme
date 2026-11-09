use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, RequestOptions};
use reqwest::Method;

pub struct NotificationPreferencesClient {
    pub http_client: HttpClient,
}

impl NotificationPreferencesClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Answers with which notices the user receives by email, and whether they hear about every post. Until they change it: failed and unconfirmed posts, and channels to reconnect, but not published posts, are emailed; and they hear only about the posts they wrote.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client.notification_preferences.get(None).await;
    /// }
    /// ```
    pub async fn get(
        &self,
        options: Option<RequestOptions>,
    ) -> Result<NotificationPreferences, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                "api/me/notification-preferences",
                None,
                None,
                options,
            )
            .await
    }

    /// Changes the preferences given, keeps the others, and answers with them all. Staff impersonating the user may not change them.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .notification_preferences
    ///         .update(
    ///             &NotificationPreferencesChange {
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn update(
        &self,
        request: &NotificationPreferencesChange,
        options: Option<RequestOptions>,
    ) -> Result<NotificationPreferences, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::PATCH,
                "api/me/notification-preferences",
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }
}
