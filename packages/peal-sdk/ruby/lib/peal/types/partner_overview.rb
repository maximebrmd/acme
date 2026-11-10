# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PartnerOverview < Internal::Types::Model
      field :partner, -> { Peal::Types::Partner }, optional: false, nullable: false

      field :usage, -> { Peal::Types::PartnerUsage }, optional: false, nullable: false
    end
  end
end
