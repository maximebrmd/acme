# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class InboxMessageAbilities < Internal::Types::Model
      field :read, -> { Peal::Types::InboxAbilityStanding }, optional: false, nullable: false

      field :send_, -> { Peal::Types::InboxAbilityStanding }, optional: false, nullable: false, api_name: "send"
    end
  end
end
