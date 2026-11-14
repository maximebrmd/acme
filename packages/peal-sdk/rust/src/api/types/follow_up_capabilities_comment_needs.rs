pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum FollowUpCapabilitiesCommentNeeds {
    #[serde(rename = "pageAdministrator")]
    PageAdministrator,
}
impl fmt::Display for FollowUpCapabilitiesCommentNeeds {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::PageAdministrator => "pageAdministrator",
        };
        write!(f, "{}", s)
    }
}
