pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ChangesRequest {
    #[serde(default)]
    pub comment: String,
}

impl ChangesRequest {
    pub fn builder() -> ChangesRequestBuilder {
        <ChangesRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChangesRequestBuilder {
    comment: Option<String>,
}

impl ChangesRequestBuilder {
    pub fn comment(mut self, value: impl Into<String>) -> Self {
        self.comment = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ChangesRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`comment`](ChangesRequestBuilder::comment)
    pub fn build(self) -> Result<ChangesRequest, BuildError> {
        Ok(ChangesRequest {
            comment: self
                .comment
                .ok_or_else(|| BuildError::missing_field("comment"))?,
        })
    }
}
