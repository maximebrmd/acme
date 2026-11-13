pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct BillingAccount {
    #[serde(rename = "billingWorkspaceId")]
    #[serde(default)]
    pub billing_workspace_id: String,
    #[serde(rename = "billingWorkspaceName")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub billing_workspace_name: Option<String>,
    #[serde(default)]
    pub id: String,
    #[serde(rename = "otherWorkspaces")]
    #[serde(default)]
    pub other_workspaces: Vec<AccountWorkspace>,
    #[serde(default)]
    pub partner: bool,
    #[serde(default)]
    pub payer: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transfer: Option<BillingTransfer>,
    #[serde(default)]
    pub workspaces: i64,
}

impl BillingAccount {
    pub fn builder() -> BillingAccountBuilder {
        <BillingAccountBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct BillingAccountBuilder {
    billing_workspace_id: Option<String>,
    billing_workspace_name: Option<String>,
    id: Option<String>,
    other_workspaces: Option<Vec<AccountWorkspace>>,
    partner: Option<bool>,
    payer: Option<bool>,
    transfer: Option<BillingTransfer>,
    workspaces: Option<i64>,
}

impl BillingAccountBuilder {
    pub fn billing_workspace_id(mut self, value: impl Into<String>) -> Self {
        self.billing_workspace_id = Some(value.into());
        self
    }

    pub fn billing_workspace_name(mut self, value: impl Into<String>) -> Self {
        self.billing_workspace_name = Some(value.into());
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn other_workspaces(mut self, value: Vec<AccountWorkspace>) -> Self {
        self.other_workspaces = Some(value);
        self
    }

    pub fn partner(mut self, value: bool) -> Self {
        self.partner = Some(value);
        self
    }

    pub fn payer(mut self, value: bool) -> Self {
        self.payer = Some(value);
        self
    }

    pub fn transfer(mut self, value: BillingTransfer) -> Self {
        self.transfer = Some(value);
        self
    }

    pub fn workspaces(mut self, value: i64) -> Self {
        self.workspaces = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`BillingAccount`].
    /// This method will fail if any of the following fields are not set:
    /// - [`billing_workspace_id`](BillingAccountBuilder::billing_workspace_id)
    /// - [`id`](BillingAccountBuilder::id)
    /// - [`other_workspaces`](BillingAccountBuilder::other_workspaces)
    /// - [`partner`](BillingAccountBuilder::partner)
    /// - [`payer`](BillingAccountBuilder::payer)
    /// - [`workspaces`](BillingAccountBuilder::workspaces)
    pub fn build(self) -> Result<BillingAccount, BuildError> {
        Ok(BillingAccount {
            billing_workspace_id: self
                .billing_workspace_id
                .ok_or_else(|| BuildError::missing_field("billing_workspace_id"))?,
            billing_workspace_name: self.billing_workspace_name,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            other_workspaces: self
                .other_workspaces
                .ok_or_else(|| BuildError::missing_field("other_workspaces"))?,
            partner: self
                .partner
                .ok_or_else(|| BuildError::missing_field("partner"))?,
            payer: self
                .payer
                .ok_or_else(|| BuildError::missing_field("payer"))?,
            transfer: self.transfer,
            workspaces: self
                .workspaces
                .ok_or_else(|| BuildError::missing_field("workspaces"))?,
        })
    }
}
