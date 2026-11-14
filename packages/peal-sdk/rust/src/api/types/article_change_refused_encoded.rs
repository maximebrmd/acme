pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ArticleChangeRefusedEncoded {
    #[serde(default)]
    pub code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
}

impl ArticleChangeRefusedEncoded {
    pub fn builder() -> ArticleChangeRefusedEncodedBuilder {
        <ArticleChangeRefusedEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ArticleChangeRefusedEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
}

impl ArticleChangeRefusedEncodedBuilder {
    pub fn code(mut self, value: impl Into<String>) -> Self {
        self.code = Some(value.into());
        self
    }

    pub fn message(mut self, value: impl Into<String>) -> Self {
        self.message = Some(value.into());
        self
    }

    pub fn request_id(mut self, value: impl Into<String>) -> Self {
        self.request_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ArticleChangeRefusedEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`code`](ArticleChangeRefusedEncodedBuilder::code)
    pub fn build(self) -> Result<ArticleChangeRefusedEncoded, BuildError> {
        Ok(ArticleChangeRefusedEncoded {
            code: self.code.ok_or_else(|| BuildError::missing_field("code"))?,
            message: self.message,
            request_id: self.request_id,
        })
    }
}
