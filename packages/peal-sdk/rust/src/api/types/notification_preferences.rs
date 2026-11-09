pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct NotificationPreferences {
    #[serde(default)]
    pub email: NotificationPreferencesEmail,
    #[serde(rename = "everyPost")]
    #[serde(default)]
    pub every_post: bool,
}

impl NotificationPreferences {
    pub fn builder() -> NotificationPreferencesBuilder {
        <NotificationPreferencesBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NotificationPreferencesBuilder {
    email: Option<NotificationPreferencesEmail>,
    every_post: Option<bool>,
}

impl NotificationPreferencesBuilder {
    pub fn email(mut self, value: NotificationPreferencesEmail) -> Self {
        self.email = Some(value);
        self
    }

    pub fn every_post(mut self, value: bool) -> Self {
        self.every_post = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`NotificationPreferences`].
    /// This method will fail if any of the following fields are not set:
    /// - [`email`](NotificationPreferencesBuilder::email)
    /// - [`every_post`](NotificationPreferencesBuilder::every_post)
    pub fn build(self) -> Result<NotificationPreferences, BuildError> {
        Ok(NotificationPreferences {
            email: self
                .email
                .ok_or_else(|| BuildError::missing_field("email"))?,
            every_post: self
                .every_post
                .ok_or_else(|| BuildError::missing_field("every_post"))?,
        })
    }
}
