# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PartnerUsageDay < Internal::Types::Model
      field :channels, -> { Integer }, optional: false, nullable: false

      field :day, -> { String }, optional: false, nullable: false

      field :workspaces, -> { Integer }, optional: false, nullable: false
    end
  end
end
