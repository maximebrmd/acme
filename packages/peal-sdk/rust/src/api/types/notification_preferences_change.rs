pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct NotificationPreferencesChange {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<NotificationPreferencesChangeEmail>,
    #[serde(rename = "everyPost")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub every_post: Option<bool>,
}

impl NotificationPreferencesChange {
    pub fn builder() -> NotificationPreferencesChangeBuilder {
        <NotificationPreferencesChangeBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NotificationPreferencesChangeBuilder {
    email: Option<NotificationPreferencesChangeEmail>,
    every_post: Option<bool>,
}

impl NotificationPreferencesChangeBuilder {
    pub fn email(mut self, value: NotificationPreferencesChangeEmail) -> Self {
        self.email = Some(value);
        self
    }

    pub fn every_post(mut self, value: bool) -> Self {
        self.every_post = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`NotificationPreferencesChange`].
    pub fn build(self) -> Result<NotificationPreferencesChange, BuildError> {
        Ok(NotificationPreferencesChange {
            email: self.email,
            every_post: self.every_post,
        })
    }
}
