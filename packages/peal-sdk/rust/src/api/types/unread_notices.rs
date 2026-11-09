pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct UnreadNotices {
    #[serde(default)]
    pub unread: i64,
}

impl UnreadNotices {
    pub fn builder() -> UnreadNoticesBuilder {
        <UnreadNoticesBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct UnreadNoticesBuilder {
    unread: Option<i64>,
}

impl UnreadNoticesBuilder {
    pub fn unread(mut self, value: i64) -> Self {
        self.unread = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`UnreadNotices`].
    /// This method will fail if any of the following fields are not set:
    /// - [`unread`](UnreadNoticesBuilder::unread)
    pub fn build(self) -> Result<UnreadNotices, BuildError> {
        Ok(UnreadNotices {
            unread: self
                .unread
                .ok_or_else(|| BuildError::missing_field("unread"))?,
        })
    }
}
