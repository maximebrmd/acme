pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum QueueNameTakenEncodedTag {
    QueueNameTaken,
}
impl fmt::Display for QueueNameTakenEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::QueueNameTaken => "QueueNameTaken",
        };
        write!(f, "{}", s)
    }
}
