use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, RequestOptions};
use reqwest::Method;

pub struct AssistantClient {
    pub http_client: HttpClient,
}

impl AssistantClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Tells whether the server has a language model, so clients show the assistant or hide it, and how many requests the workspace has left today. Needs assistant:use.
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
    ///         .assistant
    ///         .status(&"workspaceId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn status(
        &self,
        workspace_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<AssistantStatus, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/assistant", workspace_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Asks the language model to rewrite, shorten or translate a post's text, or to suggest hashtags for it, and answers once the whole suggestion is checked. The text is sent to the model as data, never as instructions. Each request counts toward the workspace's daily quota, unless the model's provider could not be reached. Needs assistant:use.
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
    ///         .assistant
    ///         .suggest(
    ///             &"workspaceId".to_string(),
    ///             &SuggestionRequest {
    ///                 action: AssistantAction::Rewrite {
    ///                     data: AssistantActionRewrite {
    ///                         tone: AssistantTone::Professional,
    ///                     },
    ///                 },
    ///                 text: "text".to_string(),
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn suggest(
        &self,
        workspace_id: &str,
        request: &SuggestionRequest,
        options: Option<RequestOptions>,
    ) -> Result<Suggestion, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/assistant/suggestions", workspace_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }
}
