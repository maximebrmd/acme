# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PartnerStanding < Internal::Types::Model
      field :can_open, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "canOpen"

      field :partner, -> { Peal::Types::Partner }, optional: false, nullable: true

      field :usage, -> { Peal::Types::PartnerUsage }, optional: false, nullable: true
    end
  end
end
