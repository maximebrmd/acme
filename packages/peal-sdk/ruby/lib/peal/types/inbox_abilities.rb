# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class InboxAbilities < Internal::Types::Model
      field :delete, -> { Peal::Types::InboxAbilityStanding }, optional: false, nullable: false

      field :hide, -> { Peal::Types::InboxAbilityStanding }, optional: false, nullable: false

      field :like, -> { Peal::Types::InboxAbilityStanding }, optional: false, nullable: false

      field :read, -> { Peal::Types::InboxAbilityStanding }, optional: false, nullable: false

      field :reply, -> { Peal::Types::InboxAbilityStanding }, optional: false, nullable: false

      field :withdraw, -> { Peal::Types::InboxAbilityStanding }, optional: false, nullable: false
    end
  end
end
