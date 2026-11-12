# frozen_string_literal: true

module Peal
  module PartnerUsage
    module Types
      class GetPartnerUsageRequest < Internal::Types::Model
        field :before, -> { String }, optional: true, nullable: false

        field :from, -> { String }, optional: true, nullable: false

        field :limit, -> { String }, optional: true, nullable: false

        field :to, -> { String }, optional: true, nullable: false
      end
    end
  end
end
