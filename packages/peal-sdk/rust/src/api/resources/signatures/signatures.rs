use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, RequestOptions};
use reqwest::Method;

pub struct SignaturesClient {
    pub http_client: HttpClient,
}

impl SignaturesClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Lists the workspace's signatures, oldest first. Needs post:read.
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
    ///         .signatures
    ///         .list(&"workspaceId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn list(
        &self,
        workspace_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Vec<Signature>, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/signatures", workspace_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Adds a signature to the workspace: a name no other signature of the workspace has whatever its case, a text of 2000 characters at most, and the `scope` it is meant for (the whole `workspace`, a `platform`, or one `channel` of the workspace). With `isDefault`, new posts that ask for the default signatures take it in its scope, and the signature that was the default of that scope is one no longer. A signature is text of the post once added: it counts against each platform's limit when the post is scheduled. A workspace keeps 50 signatures at most. Needs post:update, and channel:read for a channel's.
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
    ///         .signatures
    ///         .create(
    ///             &"workspaceId".to_string(),
    ///             &SignatureDetails {
    ///                 name: "name".to_string(),
    ///                 text: "text".to_string(),
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn create(
        &self,
        workspace_id: &str,
        request: &SignatureDetails,
        options: Option<RequestOptions>,
    ) -> Result<Signature, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/signatures", workspace_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Replaces a signature's name, text, scope and whether it is a default. Posts that already hold its text keep it as it was. Needs post:update, and channel:read for a channel's.
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
    ///         .signatures
    ///         .update(
    ///             &"workspaceId".to_string(),
    ///             &"signatureId".to_string(),
    ///             &SignatureDetails {
    ///                 name: "name".to_string(),
    ///                 text: "text".to_string(),
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn update(
        &self,
        workspace_id: &str,
        signature_id: &str,
        request: &SignatureDetails,
        options: Option<RequestOptions>,
    ) -> Result<Signature, ApiError> {
        self.http_client
            .execute_request(
                Method::PUT,
                &format!(
                    "api/workspaces/{}/signatures/{}",
                    workspace_id, signature_id
                ),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Deletes a signature. Posts that already hold its text keep it. Needs post:update.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// Empty response
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
    ///         .signatures
    ///         .delete(&"workspaceId".to_string(), &"signatureId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn delete(
        &self,
        workspace_id: &str,
        signature_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<(), ApiError> {
        self.http_client
            .execute_request(
                Method::DELETE,
                &format!(
                    "api/workspaces/{}/signatures/{}",
                    workspace_id, signature_id
                ),
                None,
                None,
                options,
            )
            .await
    }
}
