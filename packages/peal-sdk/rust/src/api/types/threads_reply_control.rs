pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ThreadsReplyControl {
    Everyone,
    AccountsYouFollow,
    MentionedOnly,
    ParentPostAuthorOnly,
    FollowersOnly,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ThreadsReplyControl {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Everyone => serializer.serialize_str("everyone"),
            Self::AccountsYouFollow => serializer.serialize_str("accounts_you_follow"),
            Self::MentionedOnly => serializer.serialize_str("mentioned_only"),
            Self::ParentPostAuthorOnly => serializer.serialize_str("parent_post_author_only"),
            Self::FollowersOnly => serializer.serialize_str("followers_only"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ThreadsReplyControl {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "everyone" => Ok(Self::Everyone),
            "accounts_you_follow" => Ok(Self::AccountsYouFollow),
            "mentioned_only" => Ok(Self::MentionedOnly),
            "parent_post_author_only" => Ok(Self::ParentPostAuthorOnly),
            "followers_only" => Ok(Self::FollowersOnly),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ThreadsReplyControl {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Everyone => write!(f, "everyone"),
            Self::AccountsYouFollow => write!(f, "accounts_you_follow"),
            Self::MentionedOnly => write!(f, "mentioned_only"),
            Self::ParentPostAuthorOnly => write!(f, "parent_post_author_only"),
            Self::FollowersOnly => write!(f, "followers_only"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
