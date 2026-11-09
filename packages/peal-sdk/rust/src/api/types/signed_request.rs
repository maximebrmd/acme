pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SignedRequest {
    #[serde(default)]
    pub headers: HashMap<String, String>,
    pub method: SignedRequestMethod,
    #[serde(default)]
    pub url: String,
}

impl SignedRequest {
    pub fn builder() -> SignedRequestBuilder {
        <SignedRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct SignedRequestBuilder {
    headers: Option<HashMap<String, String>>,
    method: Option<SignedRequestMethod>,
    url: Option<String>,
}

impl SignedRequestBuilder {
    pub fn headers(mut self, value: HashMap<String, String>) -> Self {
        self.headers = Some(value);
        self
    }

    pub fn method(mut self, value: SignedRequestMethod) -> Self {
        self.method = Some(value);
        self
    }

    pub fn url(mut self, value: impl Into<String>) -> Self {
        self.url = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`SignedRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`headers`](SignedRequestBuilder::headers)
    /// - [`method`](SignedRequestBuilder::method)
    /// - [`url`](SignedRequestBuilder::url)
    pub fn build(self) -> Result<SignedRequest, BuildError> {
        Ok(SignedRequest {
            headers: self
                .headers
                .ok_or_else(|| BuildError::missing_field("headers"))?,
            method: self
                .method
                .ok_or_else(|| BuildError::missing_field("method"))?,
            url: self.url.ok_or_else(|| BuildError::missing_field("url"))?,
        })
    }
}
