pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum PartnerOwnsWorkspacesEncodedTag {
    PartnerOwnsWorkspaces,
}
impl fmt::Display for PartnerOwnsWorkspacesEncodedTag {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::PartnerOwnsWorkspaces => "PartnerOwnsWorkspaces",
        };
        write!(f, "{}", s)
    }
}
