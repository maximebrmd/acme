# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class InboxReviewAbilities < Internal::Types::Model
      field :read, -> { Peal::Types::InboxAbilityStanding }, optional: false, nullable: false

      field :reply, -> { Peal::Types::InboxAbilityStanding }, optional: false, nullable: false

      field :withdraw, -> { Peal::Types::InboxAbilityStanding }, optional: false, nullable: false
    end
  end
end
