pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct InboxMessageAbilities {
    pub read: InboxAbilityStanding,
    pub send: InboxAbilityStanding,
}

impl InboxMessageAbilities {
    pub fn builder() -> InboxMessageAbilitiesBuilder {
        <InboxMessageAbilitiesBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxMessageAbilitiesBuilder {
    read: Option<InboxAbilityStanding>,
    send: Option<InboxAbilityStanding>,
}

impl InboxMessageAbilitiesBuilder {
    pub fn read(mut self, value: InboxAbilityStanding) -> Self {
        self.read = Some(value);
        self
    }

    pub fn send(mut self, value: InboxAbilityStanding) -> Self {
        self.send = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`InboxMessageAbilities`].
    /// This method will fail if any of the following fields are not set:
    /// - [`read`](InboxMessageAbilitiesBuilder::read)
    /// - [`send`](InboxMessageAbilitiesBuilder::send)
    pub fn build(self) -> Result<InboxMessageAbilities, BuildError> {
        Ok(InboxMessageAbilities {
            read: self.read.ok_or_else(|| BuildError::missing_field("read"))?,
            send: self.send.ok_or_else(|| BuildError::missing_field("send"))?,
        })
    }
}
