pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ApiKeyNotFoundEncoded {}

impl ApiKeyNotFoundEncoded {
    pub fn builder() -> ApiKeyNotFoundEncodedBuilder {
        <ApiKeyNotFoundEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ApiKeyNotFoundEncodedBuilder {}

impl ApiKeyNotFoundEncodedBuilder {
    /// Consumes the builder and constructs a [`ApiKeyNotFoundEncoded`].
    pub fn build(self) -> Result<ApiKeyNotFoundEncoded, BuildError> {
        Ok(ApiKeyNotFoundEncoded {})
    }
}
