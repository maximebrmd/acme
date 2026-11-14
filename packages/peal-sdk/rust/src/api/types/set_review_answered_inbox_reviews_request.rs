pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct SetReviewAnsweredInboxReviewsRequest {
    #[serde(default)]
    pub answered: bool,
}

impl SetReviewAnsweredInboxReviewsRequest {
    pub fn builder() -> SetReviewAnsweredInboxReviewsRequestBuilder {
        <SetReviewAnsweredInboxReviewsRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct SetReviewAnsweredInboxReviewsRequestBuilder {
    answered: Option<bool>,
}

impl SetReviewAnsweredInboxReviewsRequestBuilder {
    pub fn answered(mut self, value: bool) -> Self {
        self.answered = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`SetReviewAnsweredInboxReviewsRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`answered`](SetReviewAnsweredInboxReviewsRequestBuilder::answered)
    pub fn build(self) -> Result<SetReviewAnsweredInboxReviewsRequest, BuildError> {
        Ok(SetReviewAnsweredInboxReviewsRequest {
            answered: self
                .answered
                .ok_or_else(|| BuildError::missing_field("answered"))?,
        })
    }
}
