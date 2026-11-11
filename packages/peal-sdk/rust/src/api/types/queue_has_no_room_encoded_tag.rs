pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum QueueHasNoRoomEncodedTag {
    QueueHasNoRoom,
}
impl fmt::Display for QueueHasNoRoomEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::QueueHasNoRoom => "QueueHasNoRoom",
        };
        write!(f, "{}", s)
    }
}
