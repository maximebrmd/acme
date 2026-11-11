pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct Membership {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub permissions: Vec<Permission>,
    #[serde(default)]
    pub role: String,
    #[serde(default)]
    pub slug: String,
    #[serde(rename = "twoStepRequired")]
    #[serde(default)]
    pub two_step_required: bool,
}

impl Membership {
    pub fn builder() -> MembershipBuilder {
        <MembershipBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MembershipBuilder {
    id: Option<String>,
    name: Option<String>,
    permissions: Option<Vec<Permission>>,
    role: Option<String>,
    slug: Option<String>,
    two_step_required: Option<bool>,
}

impl MembershipBuilder {
    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn permissions(mut self, value: Vec<Permission>) -> Self {
        self.permissions = Some(value);
        self
    }

    pub fn role(mut self, value: impl Into<String>) -> Self {
        self.role = Some(value.into());
        self
    }

    pub fn slug(mut self, value: impl Into<String>) -> Self {
        self.slug = Some(value.into());
        self
    }

    pub fn two_step_required(mut self, value: bool) -> Self {
        self.two_step_required = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`Membership`].
    /// This method will fail if any of the following fields are not set:
    /// - [`id`](MembershipBuilder::id)
    /// - [`name`](MembershipBuilder::name)
    /// - [`permissions`](MembershipBuilder::permissions)
    /// - [`role`](MembershipBuilder::role)
    /// - [`slug`](MembershipBuilder::slug)
    /// - [`two_step_required`](MembershipBuilder::two_step_required)
    pub fn build(self) -> Result<Membership, BuildError> {
        Ok(Membership {
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            permissions: self
                .permissions
                .ok_or_else(|| BuildError::missing_field("permissions"))?,
            role: self.role.ok_or_else(|| BuildError::missing_field("role"))?,
            slug: self.slug.ok_or_else(|| BuildError::missing_field("slug"))?,
            two_step_required: self
                .two_step_required
                .ok_or_else(|| BuildError::missing_field("two_step_required"))?,
        })
    }
}
