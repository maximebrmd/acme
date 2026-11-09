pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum ChannelCannotPostEncodedTag {
    ChannelCannotPost,
}
impl fmt::Display for ChannelCannotPostEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::ChannelCannotPost => "ChannelCannotPost",
        };
        write!(f, "{}", s)
    }
}
