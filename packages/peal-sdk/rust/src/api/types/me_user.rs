pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct MeUser {
    #[serde(default)]
    pub email: String,
    #[serde(rename = "emailVerified")]
    #[serde(default)]
    pub email_verified: bool,
    #[serde(default)]
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,
    pub locale: MeUserLocale,
    #[serde(default)]
    pub name: String,
}

impl MeUser {
    pub fn builder() -> MeUserBuilder {
        <MeUserBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MeUserBuilder {
    email: Option<String>,
    email_verified: Option<bool>,
    id: Option<String>,
    image: Option<String>,
    locale: Option<MeUserLocale>,
    name: Option<String>,
}

impl MeUserBuilder {
    pub fn email(mut self, value: impl Into<String>) -> Self {
        self.email = Some(value.into());
        self
    }

    pub fn email_verified(mut self, value: bool) -> Self {
        self.email_verified = Some(value);
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn image(mut self, value: impl Into<String>) -> Self {
        self.image = Some(value.into());
        self
    }

    pub fn locale(mut self, value: MeUserLocale) -> Self {
        self.locale = Some(value);
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`MeUser`].
    /// This method will fail if any of the following fields are not set:
    /// - [`email`](MeUserBuilder::email)
    /// - [`email_verified`](MeUserBuilder::email_verified)
    /// - [`id`](MeUserBuilder::id)
    /// - [`locale`](MeUserBuilder::locale)
    /// - [`name`](MeUserBuilder::name)
    pub fn build(self) -> Result<MeUser, BuildError> {
        Ok(MeUser {
            email: self
                .email
                .ok_or_else(|| BuildError::missing_field("email"))?,
            email_verified: self
                .email_verified
                .ok_or_else(|| BuildError::missing_field("email_verified"))?,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            image: self.image,
            locale: self
                .locale
                .ok_or_else(|| BuildError::missing_field("locale"))?,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
        })
    }
}
