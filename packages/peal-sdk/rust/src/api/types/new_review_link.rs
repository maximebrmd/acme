pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct NewReviewLink {
    pub access: ReviewLinkAccess,
    #[serde(rename = "expiresInHours")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_in_hours: Option<i64>,
}

impl NewReviewLink {
    pub fn builder() -> NewReviewLinkBuilder {
        <NewReviewLinkBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NewReviewLinkBuilder {
    access: Option<ReviewLinkAccess>,
    expires_in_hours: Option<i64>,
}

impl NewReviewLinkBuilder {
    pub fn access(mut self, value: ReviewLinkAccess) -> Self {
        self.access = Some(value);
        self
    }

    pub fn expires_in_hours(mut self, value: i64) -> Self {
        self.expires_in_hours = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`NewReviewLink`].
    /// This method will fail if any of the following fields are not set:
    /// - [`access`](NewReviewLinkBuilder::access)
    pub fn build(self) -> Result<NewReviewLink, BuildError> {
        Ok(NewReviewLink {
            access: self
                .access
                .ok_or_else(|| BuildError::missing_field("access"))?,
            expires_in_hours: self.expires_in_hours,
        })
    }
}
