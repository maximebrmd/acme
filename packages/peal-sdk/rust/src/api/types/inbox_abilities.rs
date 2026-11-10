pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct InboxAbilities {
    pub delete: InboxAbilityStanding,
    pub hide: InboxAbilityStanding,
    pub like: InboxAbilityStanding,
    pub read: InboxAbilityStanding,
    pub reply: InboxAbilityStanding,
    pub withdraw: InboxAbilityStanding,
}

impl InboxAbilities {
    pub fn builder() -> InboxAbilitiesBuilder {
        <InboxAbilitiesBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxAbilitiesBuilder {
    delete: Option<InboxAbilityStanding>,
    hide: Option<InboxAbilityStanding>,
    like: Option<InboxAbilityStanding>,
    read: Option<InboxAbilityStanding>,
    reply: Option<InboxAbilityStanding>,
    withdraw: Option<InboxAbilityStanding>,
}

impl InboxAbilitiesBuilder {
    pub fn delete(mut self, value: InboxAbilityStanding) -> Self {
        self.delete = Some(value);
        self
    }

    pub fn hide(mut self, value: InboxAbilityStanding) -> Self {
        self.hide = Some(value);
        self
    }

    pub fn like(mut self, value: InboxAbilityStanding) -> Self {
        self.like = Some(value);
        self
    }

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

    /// Consumes the builder and constructs a [`InboxAbilities`].
    /// This method will fail if any of the following fields are not set:
    /// - [`delete`](InboxAbilitiesBuilder::delete)
    /// - [`hide`](InboxAbilitiesBuilder::hide)
    /// - [`like`](InboxAbilitiesBuilder::like)
    /// - [`read`](InboxAbilitiesBuilder::read)
    /// - [`reply`](InboxAbilitiesBuilder::reply)
    /// - [`withdraw`](InboxAbilitiesBuilder::withdraw)
    pub fn build(self) -> Result<InboxAbilities, BuildError> {
        Ok(InboxAbilities {
            delete: self
                .delete
                .ok_or_else(|| BuildError::missing_field("delete"))?,
            hide: self.hide.ok_or_else(|| BuildError::missing_field("hide"))?,
            like: self.like.ok_or_else(|| BuildError::missing_field("like"))?,
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
