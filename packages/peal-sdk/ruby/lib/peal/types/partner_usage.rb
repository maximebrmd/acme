# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PartnerUsage < Internal::Types::Model
      field :channels, -> { Integer }, optional: false, nullable: false

      field :days, -> { Internal::Types::Array[Peal::Types::PartnerUsageDay] }, optional: false, nullable: false

      field :workspaces, -> { Integer }, optional: false, nullable: false
    end
  end
end
