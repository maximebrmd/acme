pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct InboxThreadDetail {
    pub abilities: InboxAbilities,
    #[serde(default)]
    pub comments: Vec<InboxComment>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform: Option<Platform>,
    #[serde(default)]
    pub replies: Vec<InboxReply>,
    #[serde(default)]
    pub thread: InboxThread,
}

impl InboxThreadDetail {
    pub fn builder() -> InboxThreadDetailBuilder {
        <InboxThreadDetailBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxThreadDetailBuilder {
    abilities: Option<InboxAbilities>,
    comments: Option<Vec<InboxComment>>,
    platform: Option<Platform>,
    replies: Option<Vec<InboxReply>>,
    thread: Option<InboxThread>,
}

impl InboxThreadDetailBuilder {
    pub fn abilities(mut self, value: InboxAbilities) -> Self {
        self.abilities = Some(value);
        self
    }

    pub fn comments(mut self, value: Vec<InboxComment>) -> Self {
        self.comments = Some(value);
        self
    }

    pub fn platform(mut self, value: Platform) -> Self {
        self.platform = Some(value);
        self
    }

    pub fn replies(mut self, value: Vec<InboxReply>) -> Self {
        self.replies = Some(value);
        self
    }

    pub fn thread(mut self, value: InboxThread) -> Self {
        self.thread = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`InboxThreadDetail`].
    /// This method will fail if any of the following fields are not set:
    /// - [`abilities`](InboxThreadDetailBuilder::abilities)
    /// - [`comments`](InboxThreadDetailBuilder::comments)
    /// - [`replies`](InboxThreadDetailBuilder::replies)
    /// - [`thread`](InboxThreadDetailBuilder::thread)
    pub fn build(self) -> Result<InboxThreadDetail, BuildError> {
        Ok(InboxThreadDetail {
            abilities: self
                .abilities
                .ok_or_else(|| BuildError::missing_field("abilities"))?,
            comments: self
                .comments
                .ok_or_else(|| BuildError::missing_field("comments"))?,
            platform: self.platform,
            replies: self
                .replies
                .ok_or_else(|| BuildError::missing_field("replies"))?,
            thread: self
                .thread
                .ok_or_else(|| BuildError::missing_field("thread"))?,
        })
    }
}
