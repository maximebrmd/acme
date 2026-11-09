pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct Authorization {
    #[serde(rename = "authorizationUrl")]
    #[serde(default)]
    pub authorization_url: String,
}

impl Authorization {
    pub fn builder() -> AuthorizationBuilder {
        <AuthorizationBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AuthorizationBuilder {
    authorization_url: Option<String>,
}

impl AuthorizationBuilder {
    pub fn authorization_url(mut self, value: impl Into<String>) -> Self {
        self.authorization_url = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`Authorization`].
    /// This method will fail if any of the following fields are not set:
    /// - [`authorization_url`](AuthorizationBuilder::authorization_url)
    pub fn build(self) -> Result<Authorization, BuildError> {
        Ok(Authorization {
            authorization_url: self
                .authorization_url
                .ok_or_else(|| BuildError::missing_field("authorization_url"))?,
        })
    }
}
