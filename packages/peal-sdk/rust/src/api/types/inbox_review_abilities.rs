pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct InboxReviewAbilities {
    pub read: InboxAbilityStanding,
    pub reply: InboxAbilityStanding,
    pub withdraw: InboxAbilityStanding,
}

impl InboxReviewAbilities {
    pub fn builder() -> InboxReviewAbilitiesBuilder {
        <InboxReviewAbilitiesBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxReviewAbilitiesBuilder {
    read: Option<InboxAbilityStanding>,
    reply: Option<InboxAbilityStanding>,
    withdraw: Option<InboxAbilityStanding>,
}

impl InboxReviewAbilitiesBuilder {
    pub fn read(mut self, value: InboxAbilityStanding) -> Self {
        self.read = Some(value);
        self
    }

    pub fn reply(mut self, value: InboxAbilityStanding) -> Self {
        self.reply = Some(value);
        self
    }

    pub fn withdraw(mut self, value: InboxAbilityStanding) -> Self {
        self.withdraw = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`InboxReviewAbilities`].
    /// This method will fail if any of the following fields are not set:
    /// - [`read`](InboxReviewAbilitiesBuilder::read)
    /// - [`reply`](InboxReviewAbilitiesBuilder::reply)
    /// - [`withdraw`](InboxReviewAbilitiesBuilder::withdraw)
    pub fn build(self) -> Result<InboxReviewAbilities, BuildError> {
        Ok(InboxReviewAbilities {
            read: self.read.ok_or_else(|| BuildError::missing_field("read"))?,
            reply: self
                .reply
                .ok_or_else(|| BuildError::missing_field("reply"))?,
            withdraw: self
                .withdraw
                .ok_or_else(|| BuildError::missing_field("withdraw"))?,
        })
    }
}
