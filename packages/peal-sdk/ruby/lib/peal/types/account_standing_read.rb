# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AccountStandingRead < Internal::Types::Model
      field :blocked, -> { Peal::Types::TikTokBlock }, optional: false, nullable: true

      field :restrictions, -> { Internal::Types::Array[Peal::Types::AccountRestriction] }, optional: false, nullable: false
    end
  end
end
