pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct AdSignIn {
    #[serde(rename = "authorizationUrl")]
    #[serde(default)]
    pub authorization_url: String,
}

impl AdSignIn {
    pub fn builder() -> AdSignInBuilder {
        <AdSignInBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AdSignInBuilder {
    authorization_url: Option<String>,
}

impl AdSignInBuilder {
    pub fn authorization_url(mut self, value: impl Into<String>) -> Self {
        self.authorization_url = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`AdSignIn`].
    /// This method will fail if any of the following fields are not set:
    /// - [`authorization_url`](AdSignInBuilder::authorization_url)
    pub fn build(self) -> Result<AdSignIn, BuildError> {
        Ok(AdSignIn {
            authorization_url: self
                .authorization_url
                .ok_or_else(|| BuildError::missing_field("authorization_url"))?,
        })
    }
}
