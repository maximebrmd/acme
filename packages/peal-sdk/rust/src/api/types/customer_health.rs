pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct CustomerHealth {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channels: Option<OverviewChannels>,
    #[serde(rename = "externalId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub external_id: Option<String>,
    #[serde(default)]
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inbox: Option<OverviewInbox>,
    #[serde(default)]
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub posts: Option<OverviewPosts>,
}

impl CustomerHealth {
    pub fn builder() -> CustomerHealthBuilder {
        <CustomerHealthBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CustomerHealthBuilder {
    channels: Option<OverviewChannels>,
    external_id: Option<String>,
    id: Option<String>,
    inbox: Option<OverviewInbox>,
    name: Option<String>,
    posts: Option<OverviewPosts>,
}

impl CustomerHealthBuilder {
    pub fn channels(mut self, value: OverviewChannels) -> Self {
        self.channels = Some(value);
        self
    }

    pub fn external_id(mut self, value: impl Into<String>) -> Self {
        self.external_id = Some(value.into());
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn inbox(mut self, value: OverviewInbox) -> Self {
        self.inbox = Some(value);
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn posts(mut self, value: OverviewPosts) -> Self {
        self.posts = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`CustomerHealth`].
    /// This method will fail if any of the following fields are not set:
    /// - [`id`](CustomerHealthBuilder::id)
    /// - [`name`](CustomerHealthBuilder::name)
    pub fn build(self) -> Result<CustomerHealth, BuildError> {
        Ok(CustomerHealth {
            channels: self.channels,
            external_id: self.external_id,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            inbox: self.inbox,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            posts: self.posts,
        })
    }
}
